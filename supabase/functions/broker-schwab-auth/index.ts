import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const TOKEN_URL = "https://api.schwabapi.com/v1/oauth/token";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    // Authenticate user
    await authenticateRequest(req);

    const clientId = Deno.env.get("SCHWAB_CLIENT_ID");
    const clientSecret = Deno.env.get("SCHWAB_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return errorResponse("Schwab OAuth not configured on server", 500, req);
    }

    const body = await req.json();
    const { action, code, redirectUri, refreshToken } = body as {
      action?: "exchange" | "refresh";
      code?: string;
      redirectUri?: string;
      refreshToken?: string;
    };

    if (!action) return errorResponse("Missing 'action'", 400, req);

    // Build Basic auth header for client credentials
    const basicAuth = btoa(`${clientId}:${clientSecret}`);

    let tokenBody: URLSearchParams;

    if (action === "exchange") {
      if (!code) return errorResponse("Missing 'code' for token exchange", 400, req);
      if (!redirectUri) return errorResponse("Missing 'redirectUri' for token exchange", 400, req);

      tokenBody = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      });
    } else if (action === "refresh") {
      if (!refreshToken) return errorResponse("Missing 'refreshToken' for refresh", 400, req);

      tokenBody = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });
    } else {
      return errorResponse(`Unknown action: ${action}`, 400, req);
    }

    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenBody.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Schwab OAuth error (${response.status}):`, text);
      return errorResponse(`Schwab OAuth error: ${response.status}`, 502, req);
    }

    const data = await response.json();

    return jsonResponse({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    }, 200, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Schwab auth error";
    if (msg.includes("authentication") || msg.includes("token") || msg.includes("Missing")) {
      return errorResponse(msg, 401, req);
    }
    return errorResponse(msg, 500, req);
  }
});
