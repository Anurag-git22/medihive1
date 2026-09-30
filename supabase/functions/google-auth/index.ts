// ==============================================================================
// MEDIHIVE SUPABASE EDGE FUNCTION: google-auth
// Secure server-side Google OAuth 2.0 flow for Doctor's Google Drive & Sheets
// ==============================================================================
// Deno TypeScript Runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const OAUTH_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const OAUTH_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
].join(" ");

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment",
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "status";

    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") || "";
    const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") || "";
    const configuredRedirectUri =
      Deno.env.get("GOOGLE_OAUTH_REDIRECT_URI") || "";

    // 1. GET AUTH URL: Builds authorization redirect URL
    if (action === "url" && req.method === "GET") {
      if (!clientId) {
        return new Response(
          JSON.stringify({
            error:
              "GOOGLE_OAUTH_CLIENT_ID is not configured in Supabase secrets.",
            configured: false,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const redirectUri =
        url.searchParams.get("redirect_uri") ||
        configuredRedirectUri ||
        `${url.origin}/`;
      const state = url.searchParams.get("state") || "medihive_google_oauth";

      const authUrl = new URL(OAUTH_AUTH_URL);
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", SCOPES);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", state);

      return new Response(
        JSON.stringify({ url: authUrl.toString(), redirectUri }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. EXCHANGE CODE: Exchanges authorization code for tokens
    if (action === "exchange" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const code = body.code;
      const redirectUri =
        body.redirect_uri || configuredRedirectUri || `${url.origin}/`;

      if (!code) {
        return new Response(
          JSON.stringify({ error: "Missing authorization code" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (!clientId || !clientSecret) {
        return new Response(
          JSON.stringify({
            error:
              "GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET is missing.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Exchange code with Google
      const tokenParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      });

      const tokenRes = await fetch(OAUTH_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenParams.toString(),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || tokenData.error) {
        return new Response(
          JSON.stringify({
            error:
              tokenData.error_description ||
              tokenData.error ||
              "Google token exchange failed",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Fetch user profile email
      let doctorEmail = "shreyashshigwan10@gmail.com";
      try {
        const profileRes = await fetch(OAUTH_USERINFO_URL, {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          if (profile.email) doctorEmail = profile.email;
        }
      } catch {
        // Fallback to default
      }

      // Securely persist refresh & access tokens in Supabase google_sync_auth using service_role
      const supabaseAdmin = getSupabaseAdmin();
      const expiresAt =
        Date.now() + (Number(tokenData.expires_in) || 3600) * 1000;

      const { error: dbError } = await supabaseAdmin
        .from("google_sync_auth")
        .upsert({
          id: 1,
          refresh_token: tokenData.refresh_token || "",
          access_token: tokenData.access_token,
          expires_at: expiresAt,
          token_type: tokenData.token_type || "Bearer",
          scope: tokenData.scope || SCOPES,
          connected_email: doctorEmail,
          updated_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error("Failed to save google_sync_auth:", dbError);
        return new Response(
          JSON.stringify({
            error: `Database error saving auth: ${dbError.message}`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Also update doctor_email in config
      await supabaseAdmin.from("google_sync_config").upsert({
        id: 1,
        doctor_email: doctorEmail,
        updated_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          email: doctorEmail,
          message: `Successfully connected to Google account (${doctorEmail})`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. CHECK STATUS: Validates if doctor's Google connection is active
    if (action === "status" && req.method === "GET") {
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin
        .from("google_sync_auth")
        .select("connected_email, expires_at, scope, updated_at, refresh_token")
        .eq("id", 1)
        .maybeSingle();

      if (error || !data || !data.refresh_token) {
        return new Response(
          JSON.stringify({
            isConnected: false,
            email: null,
            message: "Google account is not connected yet.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          isConnected: true,
          email: data.connected_email,
          scope: data.scope,
          updatedAt: data.updated_at,
          message: `Connected to Google as ${data.connected_email}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. DISCONNECT: Revokes credentials and removes auth record
    if (action === "disconnect" && req.method === "POST") {
      const supabaseAdmin = getSupabaseAdmin();
      const { data } = await supabaseAdmin
        .from("google_sync_auth")
        .select("access_token, refresh_token")
        .eq("id", 1)
        .maybeSingle();

      if (data?.access_token || data?.refresh_token) {
        const tokenToRevoke = data.refresh_token || data.access_token;
        try {
          await fetch(`${OAUTH_REVOKE_URL}?token=${tokenToRevoke}`, {
            method: "POST",
          });
        } catch {
          // ignore revocation network error
        }
      }

      await supabaseAdmin.from("google_sync_auth").delete().eq("id", 1);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Google account disconnected successfully.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("google-auth error:", err);
    return new Response(
      JSON.stringify({
        error: err.message || "Internal error in google-auth Edge Function",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
