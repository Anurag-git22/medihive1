import { createClient, SupabaseClient } from "@supabase/supabase-js";

const getEnvUrl = (): string =>
  (
    import.meta.env.VITE_SUPABASE_URL ||
    "https://getcxhofzovwapazwtdn.supabase.co"
  ).trim();
const getEnvKey = (): string =>
  (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    "sb_publishable_PhXleh9dgBbX3kgmkUmh-w_Sny7HUgn"
  ).trim();

/**
 * Sanitizes and normalizes Supabase Project URL by stripping /rest/v1 or trailing slashes.
 */
export const normalizeSupabaseUrl = (rawUrl: string): string => {
  let cleaned = (rawUrl || "").trim();
  cleaned = cleaned.replace(/\/+$/, "");
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, "");
  cleaned = cleaned.replace(/\/rest\/?$/i, "");
  return cleaned;
};

export interface SupabaseConfigInfo {
  url: string;
  key: string;
  isConfigured: boolean;
  isPlaceholder: boolean;
  source: "env" | "custom" | "none";
}

/**
 * Retrieves active Supabase configuration (prioritizing custom saved keys in localStorage, then .env).
 * If localStorage contains invalid placeholder strings, it automatically ignores/cleans them.
 */
export const getSupabaseConfig = (): SupabaseConfigInfo => {
  let customUrl =
    (typeof window !== "undefined"
      ? localStorage.getItem("medihive_supabase_url")
      : null
    )?.trim() || "";
  let customKey =
    (typeof window !== "undefined"
      ? localStorage.getItem("medihive_supabase_anon_key")
      : null
    )?.trim() || "";

  // Auto-clean old placeholder strings from localStorage if present
  if (
    customUrl.includes("your-project-id") ||
    customUrl.includes("placeholder")
  ) {
    customUrl = "";
    if (typeof window !== "undefined")
      localStorage.removeItem("medihive_supabase_url");
  }
  if (
    customKey.includes("your-anon-public-key-here") ||
    customKey.includes("placeholder")
  ) {
    customKey = "";
    if (typeof window !== "undefined")
      localStorage.removeItem("medihive_supabase_anon_key");
  }

  const envUrl = getEnvUrl();
  const envKey = getEnvKey();

  const rawUrl = customUrl || envUrl;
  const activeUrl = normalizeSupabaseUrl(rawUrl);
  const activeKey = customKey || envKey;

  const isPlaceholder = Boolean(
    !activeUrl ||
    !activeKey ||
    activeUrl.includes("your-project-id") ||
    activeKey.includes("your-anon-public-key-here") ||
    activeUrl.includes("placeholder"),
  );

  const isConfigured = Boolean(
    activeUrl &&
    activeKey &&
    !isPlaceholder &&
    activeUrl.startsWith("https://"),
  );

  const source: "custom" | "env" | "none" = customUrl
    ? "custom"
    : envUrl && isConfigured
      ? "env"
      : "none";

  return {
    url: activeUrl,
    key: activeKey,
    isConfigured,
    isPlaceholder,
    source,
  };
};

let currentClient: SupabaseClient | null = null;
let lastUrl = "";
let lastKey = "";

export const getSupabaseClient = (): SupabaseClient => {
  const cfg = getSupabaseConfig();
  if (!currentClient || lastUrl !== cfg.url || lastKey !== cfg.key) {
    lastUrl = cfg.url;
    lastKey = cfg.key;

    const targetUrl = cfg.isConfigured
      ? cfg.url
      : "https://placeholder.supabase.co";
    const targetKey = cfg.isConfigured ? cfg.key : "placeholder-anon-key";

    currentClient = createClient(targetUrl, targetKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return currentClient;
};

/**
 * Checks whether Supabase is configured with active credentials.
 * Defined as a function that can also be called directly.
 */
export const isSupabaseConfigured = (): boolean => {
  return getSupabaseConfig().isConfigured;
};

/**
 * The active dynamic Supabase client proxy.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const val = (client as any)[prop];
    return typeof val === "function" ? val.bind(client) : val;
  },
});

/**
 * Saves custom credentials to localStorage and re-initializes the Supabase client.
 */
export const saveCustomSupabaseConfig = (url: string, key: string) => {
  const trimmedUrl = normalizeSupabaseUrl(url.trim());
  const trimmedKey = key.trim();

  localStorage.setItem("medihive_supabase_url", trimmedUrl);
  localStorage.setItem("medihive_supabase_anon_key", trimmedKey);

  // Force client recreation
  currentClient = null;
  getSupabaseClient();

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("medihive_supabase_config_changed", {
        detail: getSupabaseConfig(),
      }),
    );
  }
};

/**
 * Clears custom saved credentials and reverts back to .env configuration.
 */
export const clearCustomSupabaseConfig = () => {
  localStorage.removeItem("medihive_supabase_url");
  localStorage.removeItem("medihive_supabase_anon_key");

  // Force client recreation
  currentClient = null;
  getSupabaseClient();

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("medihive_supabase_config_changed", {
        detail: getSupabaseConfig(),
      }),
    );
  }
};

/**
 * Diagnostic test that actually pings the Supabase database and checks table access.
 */
export const testSupabaseConnection = async (
  testUrlCandidate?: string,
  testKeyCandidate?: string,
): Promise<{
  success: boolean;
  status:
    | "connected"
    | "placeholder"
    | "missing"
    | "invalid_key"
    | "tables_missing"
    | "error";
  message: string;
  details?: string;
}> => {
  const activeCfg = getSupabaseConfig();
  const rawUrl = (
    testUrlCandidate !== undefined ? testUrlCandidate : activeCfg.url
  ).trim();
  const url = normalizeSupabaseUrl(rawUrl);
  const key = (
    testKeyCandidate !== undefined ? testKeyCandidate : activeCfg.key
  ).trim();

  if (!url || !key) {
    return {
      success: false,
      status: "missing",
      message: "Supabase URL or Anon Public Key is missing.",
      details:
        "Please enter your Supabase Project URL and Anon key in .env or the connection dialog.",
    };
  }

  if (
    url.includes("your-project-id") ||
    key.includes("your-anon-public-key-here") ||
    url.includes("placeholder")
  ) {
    return {
      success: false,
      status: "placeholder",
      message: "Placeholder template detected in settings.",
      details:
        "Please copy your actual credentials from your Supabase Dashboard > Project Settings > API.",
    };
  }

  if (!url.startsWith("https://")) {
    return {
      success: false,
      status: "error",
      message: "Invalid Project URL format.",
      details:
        'Your Project URL must start with "https://", e.g. https://abcdefghijkl.supabase.co',
    };
  }

  try {
    const probeClient = createClient(url, key, {
      auth: { persistSession: false },
    });

    const { error } = await probeClient.from("patients").select("id").limit(1);

    if (error) {
      if (error.code === "42P01") {
        return {
          success: false,
          status: "tables_missing",
          message:
            "Connected to Supabase project, but database tables were not found.",
          details:
            "Please copy the SQL from supabase_schema.sql and execute it inside the Supabase SQL Editor to create all clinic tables.",
        };
      }

      if (
        error.code === "PGRST301" ||
        error.message?.includes("Invalid API key") ||
        error.message?.includes("JWT")
      ) {
        return {
          success: false,
          status: "invalid_key",
          message: "Invalid Anon Public Key.",
          details:
            "The anon public key could not be verified by Supabase. Please copy the anon key from Project Settings > API.",
        };
      }

      return {
        success: false,
        status: "error",
        message: `Database query returned: ${error.message}`,
        details: `PostgreSQL error code: ${error.code || "UNKNOWN"}`,
      };
    }

    return {
      success: true,
      status: "connected",
      message: "Connected successfully to Supabase cloud database!",
      details:
        "Realtime synchronization and PostgreSQL database tables are active.",
    };
  } catch (err: any) {
    return {
      success: false,
      status: "error",
      message: "Could not connect to Supabase server.",
      details:
        err?.message ||
        "Please check your internet connection and verify that your Supabase project is active.",
    };
  }
};
