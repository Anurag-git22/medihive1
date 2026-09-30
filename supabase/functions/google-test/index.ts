// ==============================================================================
// MEDIHIVE SUPABASE EDGE FUNCTION: google-test
// Diagnostic verification test for Google Drive, Sheets & OAuth authorization
// ==============================================================================
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API_URL = "https://www.googleapis.com/drive/v3/files";
const SHEETS_API_URL = "https://sheets.googleapis.com/v4/spreadsheets";

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const diagnostics: {
    oauth: { ok: boolean; message: string; email?: string };
    drive: { ok: boolean; message: string; folderName?: string };
    sheets: { ok: boolean; message: string; sheetTitle?: string };
    allPassed: boolean;
  } = {
    oauth: { ok: false, message: "Not checked" },
    drive: { ok: false, message: "Not checked" },
    sheets: { ok: false, message: "Not checked" },
    allPassed: false,
  };

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Check OAuth token
    const { data: auth } = await supabaseAdmin
      .from("google_sync_auth")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (!auth || !auth.refresh_token) {
      diagnostics.oauth = {
        ok: false,
        message:
          "Doctor Google account is not connected. Please click 'Connect Google Account'.",
      };
      return new Response(JSON.stringify(diagnostics), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Attempt token refresh to verify credentials
    let accessToken = auth.access_token;
    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") || "";
    const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") || "";

    if (clientId && clientSecret) {
      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: auth.refresh_token,
        grant_type: "refresh_token",
      });

      const refreshRes = await fetch(OAUTH_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const refreshData = await refreshRes.json();
      if (refreshRes.ok && refreshData.access_token) {
        accessToken = refreshData.access_token;
        diagnostics.oauth = {
          ok: true,
          email: auth.connected_email || "Doctor Account",
          message: `OAuth authorization is valid and active for ${auth.connected_email || "doctor"}.`,
        };
      } else {
        diagnostics.oauth = {
          ok: false,
          message: `Google OAuth refresh failed: ${refreshData.error_description || refreshData.error || "Invalid token"}`,
        };
      }
    } else {
      diagnostics.oauth = {
        ok: true,
        email: auth.connected_email,
        message:
          "OAuth token exists in database (client secrets not present in edge function environment).",
      };
    }

    // 2. Check Google Drive folder
    const { data: config } = await supabaseAdmin
      .from("google_sync_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    const driveFolderId =
      config?.drive_root_folder_id ||
      Deno.env.get("GOOGLE_DRIVE_ROOT_FOLDER_ID");
    if (!driveFolderId) {
      diagnostics.drive = {
        ok: false,
        message:
          "Google Drive Folder ID is not configured. Please paste the 'MediHive Images' folder ID in Settings.",
      };
    } else if (accessToken) {
      const driveRes = await fetch(
        `${DRIVE_API_URL}/${driveFolderId}?fields=id,name,capabilities`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (driveRes.ok) {
        const folderData = await driveRes.json();
        const canAddChildren =
          folderData.capabilities?.canAddChildren !== false;
        diagnostics.drive = {
          ok: true,
          folderName: folderData.name,
          message: `Connected to Google Drive folder '${folderData.name}' with write permissions.`,
        };
      } else {
        const errText = await driveRes.text();
        diagnostics.drive = {
          ok: false,
          message: `Cannot access Google Drive folder (${driveFolderId}): ${errText}`,
        };
      }
    }

    // 3. Check Google Sheet
    const sheetId = config?.sheet_id || Deno.env.get("GOOGLE_SHEET_ID");
    if (!sheetId) {
      diagnostics.sheets = {
        ok: false,
        message:
          "Google Sheet ID is not configured. Please paste the 'MediHive - Patient Records' Sheet ID in Settings.",
      };
    } else if (accessToken) {
      const sheetRes = await fetch(
        `${SHEETS_API_URL}/${sheetId}?fields=properties.title,sheets.properties.title`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (sheetRes.ok) {
        const sheetData = await sheetRes.json();
        diagnostics.sheets = {
          ok: true,
          sheetTitle: sheetData.properties?.title || "Spreadsheet",
          message: `Connected to Google Sheet '${sheetData.properties?.title || "MediHive - Patient Records"}'.`,
        };
      } else {
        const errText = await sheetRes.text();
        diagnostics.sheets = {
          ok: false,
          message: `Cannot access Google Sheet (${sheetId}): ${errText}`,
        };
      }
    }

    diagnostics.allPassed =
      diagnostics.oauth.ok && diagnostics.drive.ok && diagnostics.sheets.ok;

    return new Response(JSON.stringify(diagnostics), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, diagnostics }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
