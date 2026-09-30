// ==============================================================================
// MEDIHIVE GOOGLE SYNCHRONIZATION CLIENT SERVICE
// High-level service communicating with Supabase & Google Edge Functions
// ==============================================================================
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  GoogleSyncConfig,
  GoogleSyncAuthStatus,
  GoogleSyncRecord,
  GoogleTestDiagnostics,
  GoogleSyncOverview,
} from "../types/googleSync";

// ==============================================================================
// 1. OAUTH & CONNECTION MANAGEMENT
// ==============================================================================

/**
 * Initiates Google OAuth by requesting an authorization URL from the secure backend.
 */
export const getGoogleAuthUrl = async (
  redirectUri?: string,
): Promise<{ url: string | null; error?: string }> => {
  if (!isSupabaseConfigured()) {
    return { url: null, error: "Supabase is not configured." };
  }

  try {
    // 1. Direct client-side OAuth URL generation if VITE_GOOGLE_CLIENT_ID is defined in .env
    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    const currentOrigin =
      typeof window !== "undefined" ? window.location.origin : "";
    const targetRedirect = redirectUri || `${currentOrigin}/`;

    if (
      clientId &&
      typeof clientId === "string" &&
      clientId.trim().length > 0
    ) {
      const scopes = [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/userinfo.email",
        "openid",
      ].join(" ");
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        clientId.trim(),
      )}&redirect_uri=${encodeURIComponent(
        targetRedirect,
      )}&response_type=code&scope=${encodeURIComponent(
        scopes,
      )}&access_type=offline&prompt=consent&state=medihive_google_oauth`;
      return { url };
    }

    // 2. Invoke Supabase Edge Function: google-auth
    const { data, error } = await supabase.functions.invoke("google-auth", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      body: undefined,
    });

    // If edge function returned URL directly via searchParams
    if (data?.url) {
      return { url: data.url };
    }

    // Try with action query parameter
    const res = await fetch(
      `${(supabase as any).functionsUrl || ""}/google-auth?action=url&redirect_uri=${encodeURIComponent(targetRedirect)}`,
      {
        headers: {
          apikey: (supabase as any).supabaseKey || "",
          Authorization: `Bearer ${(supabase as any).supabaseKey || ""}`,
        },
      },
    );

    if (res.ok) {
      const parsed = await res.json();
      if (parsed.url) return { url: parsed.url };
    }

    return {
      url: null,
      error:
        error?.message ||
        "Could not generate Google OAuth URL. Please ensure the Supabase 'google-auth' Edge Function is deployed.",
    };
  } catch (err: any) {
    const isNetworkError =
      err?.message?.includes("Failed to fetch") ||
      err?.name === "TypeError" ||
      err?.message?.includes("network");
    return {
      url: null,
      error: isNetworkError
        ? "Supabase Edge Function 'google-auth' is not deployed yet. Deploy the functions or add VITE_GOOGLE_CLIENT_ID to your .env file."
        : err?.message || "Google authorization service unavailable.",
    };
  }
};

/**
 * Exchanges Google OAuth callback authorization code for server-stored tokens.
 */
export const exchangeOAuthCode = async (
  code: string,
  redirectUri?: string,
): Promise<{ success: boolean; email?: string; error?: string }> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  try {
    const currentOrigin =
      typeof window !== "undefined" ? window.location.origin : "";
    const targetRedirect = redirectUri || `${currentOrigin}/`;

    const { data, error } = await supabase.functions.invoke(
      "google-auth?action=exchange",
      {
        body: { code, redirect_uri: targetRedirect },
      },
    );

    if (error || data?.error) {
      return {
        success: false,
        error: error?.message || data?.error || "Token exchange failed",
      };
    }

    return {
      success: true,
      email: data?.email,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to communicate with auth exchange service.",
    };
  }
};

/**
 * Checks whether doctor's Google account is connected and token is active.
 */
export const checkGoogleAuthStatus =
  async (): Promise<GoogleSyncAuthStatus> => {
    if (!isSupabaseConfigured()) {
      return { isConnected: false, email: null, message: "Supabase offline" };
    }

    try {
      // 1. Try secure Edge Function first
      const { data, error } = await supabase.functions.invoke(
        "google-auth?action=status",
        { method: "GET" },
      );

      if (!error && data) {
        return {
          isConnected: Boolean(data.isConnected),
          email: data.email || null,
          scope: data.scope,
          updatedAt: data.updatedAt,
          message: data.message,
        };
      }

      // 2. Database fallback check (safe view: does refresh_token exist?)
      const { data: dbAuth, error: dbErr } = await supabase
        .from("google_sync_auth")
        .select("connected_email, updated_at, expires_at")
        .eq("id", 1)
        .maybeSingle();

      if (!dbErr && dbAuth) {
        return {
          isConnected: true,
          email: dbAuth.connected_email || "Doctor Account",
          updatedAt: dbAuth.updated_at,
          message: `Connected to Google as ${dbAuth.connected_email}`,
        };
      }

      return { isConnected: false, email: null, message: "Not connected" };
    } catch {
      return {
        isConnected: false,
        email: null,
        message: "Connection check failed",
      };
    }
  };

/**
 * Disconnects doctor's Google Account.
 */
export const disconnectGoogleAccount = async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    await supabase.functions.invoke("google-auth?action=disconnect", {
      method: "POST",
    });

    // Clean auth row in database
    await supabase.from("google_sync_auth").delete().eq("id", 1);
    return true;
  } catch {
    return false;
  }
};

// ==============================================================================
// 2. CONFIGURATION MANAGEMENT
// ==============================================================================

/**
 * Fetches the Google Sheets & Drive configuration IDs.
 */
export const fetchGoogleSyncConfig = async (): Promise<GoogleSyncConfig> => {
  const fallback: GoogleSyncConfig = {
    id: 1,
    sheetId: null,
    driveRootFolderId: null,
    doctorEmail: "shreyashshigwan10@gmail.com",
    autoSyncEnabled: true,
    lastSyncAt: null,
  };

  if (!isSupabaseConfigured()) return fallback;

  try {
    const { data, error } = await supabase
      .from("google_sync_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return fallback;

    return {
      id: 1,
      sheetId: data.sheet_id || null,
      driveRootFolderId: data.drive_root_folder_id || null,
      doctorEmail: data.doctor_email || fallback.doctorEmail,
      autoSyncEnabled: data.auto_sync_enabled !== false,
      lastSyncAt: data.last_sync_at || null,
    };
  } catch {
    return fallback;
  }
};

/**
 * Saves or updates Google Sheet ID & Drive Folder ID in Supabase.
 */
export const saveGoogleSyncConfig = async (
  config: Partial<GoogleSyncConfig>,
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const payload: any = { id: 1, updated_at: new Date().toISOString() };
    if (config.sheetId !== undefined)
      payload.sheet_id = config.sheetId ? config.sheetId.trim() : null;
    if (config.driveRootFolderId !== undefined)
      payload.drive_root_folder_id = config.driveRootFolderId
        ? config.driveRootFolderId.trim()
        : null;
    if (config.doctorEmail !== undefined)
      payload.doctor_email = config.doctorEmail.trim();
    if (config.autoSyncEnabled !== undefined)
      payload.auto_sync_enabled = config.autoSyncEnabled;

    const { error } = await supabase.from("google_sync_config").upsert(payload);
    return !error;
  } catch {
    return false;
  }
};

/**
 * Returns complete sync overview (connection state, IDs, counts).
 */
export const fetchGoogleSyncOverview =
  async (): Promise<GoogleSyncOverview> => {
    const fallback: GoogleSyncOverview = {
      isConnected: false,
      connectedEmail: "shreyashshigwan10@gmail.com",
      sheetId: null,
      driveRootFolderId: null,
      autoSyncEnabled: true,
      lastSyncAt: null,
      pendingCount: 0,
      syncedCount: 0,
      failedCount: 0,
    };

    if (!isSupabaseConfigured()) return fallback;

    try {
      // 1. Try RPC function
      const { data, error } = await supabase.rpc("get_google_sync_overview");
      if (!error && data) {
        return data as GoogleSyncOverview;
      }

      // 2. Direct table queries fallback
      const authStatus = await checkGoogleAuthStatus();
      const config = await fetchGoogleSyncConfig();
      const recs = await fetchGoogleSyncRecords();
      return {
        isConnected: authStatus.isConnected,
        connectedEmail: authStatus.email || config.doctorEmail,
        sheetId: config.sheetId,
        driveRootFolderId: config.driveRootFolderId,
        autoSyncEnabled: config.autoSyncEnabled,
        lastSyncAt: config.lastSyncAt,
        pendingCount: recs.filter(
          (r) => r.status === "pending" || r.status === "retrying",
        ).length,
        syncedCount: recs.filter((r) => r.status === "synced").length,
        failedCount: recs.filter((r) => r.status === "failed").length,
      };
    } catch {
      return fallback;
    }
  };

// ==============================================================================
// 3. DIAGNOSTIC TEST
// ==============================================================================

/**
 * Runs a test connection against Google OAuth, Drive Folder, and Google Sheet.
 */
export const testGoogleIntegration =
  async (): Promise<GoogleTestDiagnostics> => {
    const defaultFail: GoogleTestDiagnostics = {
      oauth: { ok: false, message: "Not verified" },
      drive: { ok: false, message: "Not verified" },
      sheets: { ok: false, message: "Not verified" },
      allPassed: false,
    };

    if (!isSupabaseConfigured()) {
      defaultFail.oauth.message = "Supabase is offline";
      return defaultFail;
    }

    try {
      const { data, error } = await supabase.functions.invoke("google-test", {
        method: "POST",
      });

      if (!error && data) {
        return data as GoogleTestDiagnostics;
      }

      // Fallback: Check what is configured locally
      const auth = await checkGoogleAuthStatus();
      const cfg = await fetchGoogleSyncConfig();

      return {
        oauth: {
          ok: auth.isConnected,
          message: auth.isConnected
            ? `Authorized for ${auth.email || "doctor"}`
            : "Google account not connected",
        },
        drive: {
          ok: Boolean(cfg.driveRootFolderId),
          message: cfg.driveRootFolderId
            ? `Drive folder ID set (${cfg.driveRootFolderId})`
            : "Drive folder ID missing",
        },
        sheets: {
          ok: Boolean(cfg.sheetId),
          message: cfg.sheetId
            ? `Sheet ID set (${cfg.sheetId})`
            : "Sheet ID missing",
        },
        allPassed:
          auth.isConnected &&
          Boolean(cfg.driveRootFolderId) &&
          Boolean(cfg.sheetId),
      };
    } catch (err: any) {
      defaultFail.oauth.message =
        err.message || "Failed to execute diagnostic test";
      return defaultFail;
    }
  };

// ==============================================================================
// 4. SYNCHRONIZATION OPERATIONS
// ==============================================================================

/**
 * Triggers background sync for an OPD Record.
 * Idempotent: safe to call repeatedly.
 */
export const syncOpdRecordToGoogle = async (
  opdId: string,
  options?: { force?: boolean },
): Promise<{ success: boolean; driveLinks?: string[]; error?: string }> => {
  if (!isSupabaseConfigured() || !opdId) {
    return { success: false, error: "Not configured" };
  }

  try {
    const { data, error } = await supabase.functions.invoke("google-sync", {
      body: { opdRecordId: opdId, force: options?.force },
    });

    if (error || data?.error) {
      return {
        success: false,
        error: error?.message || data?.error || "Sync execution failed",
      };
    }

    return {
      success: true,
      driveLinks: data?.driveLinks || [],
    };
  } catch (err: any) {
    const isNetErr =
      err?.message?.includes("Failed to fetch") || err?.name === "TypeError";
    return {
      success: false,
      error: isNetErr
        ? "Supabase Edge Function 'google-sync' is not deployed yet."
        : err?.message || "Sync error",
    };
  }
};

/**
 * Triggers sync for all pending records in google_sync_records.
 */
export const syncAllPendingRecordsToGoogle = async (): Promise<{
  success: boolean;
  syncedCount?: number;
  error?: string;
}> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase not configured." };
  }

  try {
    const { data, error } = await supabase.functions.invoke("google-sync", {
      body: { syncAllPending: true },
    });

    if (error || data?.error) {
      return {
        success: false,
        error: error?.message || data?.error || "Bulk sync failed",
      };
    }

    return {
      success: true,
      syncedCount: data?.syncedCount ?? 0,
    };
  } catch (err: any) {
    const isNetErr =
      err?.message?.includes("Failed to fetch") || err?.name === "TypeError";
    return {
      success: false,
      error: isNetErr
        ? "Supabase Edge Function 'google-sync' is not deployed yet."
        : err?.message || "Bulk sync execution failed.",
    };
  }
};

/**
 * Fetches sync tracking records.
 */
export const fetchGoogleSyncRecords = async (): Promise<GoogleSyncRecord[]> => {
  const recordsMap = new Map<string, GoogleSyncRecord>();

  // 1. Load cached records from local storage
  try {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("medihive_google_sync_records");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.forEach((r: GoogleSyncRecord) => {
            if (r && r.opdId) recordsMap.set(r.opdId, r);
          });
        }
      }
    }
  } catch {
    // ignore
  }

  // 2. Query Supabase google_sync_records table if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("google_sync_records")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        data.forEach((r: any) => {
          recordsMap.set(r.opd_id, {
            opdId: r.opd_id,
            patientId: r.patient_id,
            status: r.status || "pending",
            driveSynced: Boolean(r.drive_synced),
            sheetSynced: Boolean(r.sheet_synced),
            sheetRowIndex: r.sheet_row_index,
            driveFolderId: r.drive_folder_id,
            driveLinks: Array.isArray(r.drive_links) ? r.drive_links : [],
            lastError: r.last_error,
            retryCount: r.retry_count || 0,
            syncedAt: r.synced_at,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          });
        });
      }
    } catch {
      // Table may not be migrated yet in Supabase
    }

    // 3. Query opd_records from Supabase to capture all clinical visits
    try {
      const { data: opdData, error: opdErr } = await supabase
        .from("opd_records")
        .select("id, patient_id, visit_date, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!opdErr && opdData) {
        opdData.forEach((row: any) => {
          if (!recordsMap.has(row.id)) {
            recordsMap.set(row.id, {
              opdId: row.id,
              patientId: row.patient_id,
              status: "pending",
              driveSynced: false,
              sheetSynced: false,
              sheetRowIndex: null,
              driveFolderId: null,
              driveLinks: [],
              lastError: null,
              retryCount: 0,
              syncedAt: null,
              createdAt:
                row.created_at || row.visit_date || new Date().toISOString(),
              updatedAt:
                row.created_at || row.visit_date || new Date().toISOString(),
            });
          }
        });
      }
    } catch {
      // non-blocking
    }
  }

  // 4. Incorporate any locally saved patient OPD records from local storage
  try {
    if (typeof window !== "undefined") {
      const rawState = localStorage.getItem("medihive_app_state_v2");
      if (rawState) {
        const parsed = JSON.parse(rawState);
        if (parsed && Array.isArray(parsed.patients)) {
          parsed.patients.forEach((p: any) => {
            if (Array.isArray(p.records)) {
              p.records.forEach((r: any) => {
                if (r && r.id && !recordsMap.has(r.id)) {
                  recordsMap.set(r.id, {
                    opdId: r.id,
                    patientId: p.id,
                    status: "pending",
                    driveSynced: false,
                    sheetSynced: false,
                    sheetRowIndex: null,
                    driveFolderId: null,
                    driveLinks: [],
                    lastError: null,
                    retryCount: 0,
                    syncedAt: null,
                    createdAt:
                      r.createdAt || r.visitDate || new Date().toISOString(),
                    updatedAt:
                      r.createdAt || r.visitDate || new Date().toISOString(),
                  });
                }
              });
            }
          });
        }
      }
    }
  } catch {
    // ignore
  }

  const result = Array.from(recordsMap.values()).sort((a, b) => {
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });

  // Persist combined records to local storage cache
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "medihive_google_sync_records",
        JSON.stringify(result),
      );
    }
  } catch {
    // ignore
  }

  return result;
};

/**
 * Subscribes to real-time changes on google_sync_records so UI updates instantly.
 */
export const subscribeGoogleSyncRecords = (
  onUpdate: (record: GoogleSyncRecord) => void,
): (() => void) => {
  if (!isSupabaseConfigured()) return () => {};

  try {
    const channel = supabase
      .channel("medihive_google_sync_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "google_sync_records" },
        (payload) => {
          if (payload.new) {
            const raw = payload.new as any;
            onUpdate({
              opdId: raw.opd_id,
              patientId: raw.patient_id,
              status: raw.status,
              driveSynced: raw.drive_synced,
              sheetSynced: raw.sheet_synced,
              sheetRowIndex: raw.sheet_row_index,
              driveFolderId: raw.drive_folder_id,
              driveLinks: Array.isArray(raw.drive_links) ? raw.drive_links : [],
              lastError: raw.last_error,
              retryCount: raw.retry_count || 0,
              syncedAt: raw.synced_at,
              createdAt: raw.created_at,
              updatedAt: raw.updated_at,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
};
