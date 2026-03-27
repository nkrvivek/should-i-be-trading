import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const ETRADE_BASE = "https://api.etrade.com";

// ── OAuth 1.0a signing helpers ──────────────────────────────────
function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

async function hmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function oauthSign(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerKey: string,
  consumerSecret: string,
  tokenSecret: string,
): Promise<string> {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
    ...params,
  };

  const sortedKeys = Object.keys(oauthParams).sort();
  const paramString = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join("&");

  const signatureBase = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  const signature = await hmacSha1(signingKey, signatureBase);

  const authParams = sortedKeys
    .filter((k) => k.startsWith("oauth_"))
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  return `OAuth ${authParams}, oauth_signature="${percentEncode(signature)}"`;
}

function parseOAuthResponse(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of text.split("&")) {
    const [key, value] = pair.split("=");
    if (key && value !== undefined) result[decodeURIComponent(key)] = decodeURIComponent(value);
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    await authenticateRequest(req);

    const consumerKey = Deno.env.get("ETRADE_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("ETRADE_CONSUMER_SECRET");
    if (!consumerKey || !consumerSecret) {
      return errorResponse("E*Trade consumer credentials not configured", 500, req);
    }

    const body = await req.json();
    const { action, oauthToken, oauthTokenSecret, verifier, callbackUrl } = body as {
      action: "requestToken" | "accessToken" | "renewToken";
      oauthToken?: string;
      oauthTokenSecret?: string;
      verifier?: string;
      callbackUrl?: string;
    };

    if (!action) return errorResponse("Missing 'action'", 400, req);

    switch (action) {
      // ── Step 1: Get request token ──────────────────────────────
      case "requestToken": {
        const url = `${ETRADE_BASE}/oauth/request_token`;
        const oauthInputParams: Record<string, string> = {
          oauth_callback: callbackUrl ?? "oob",
        };

        const authHeader = await oauthSign("GET", url, oauthInputParams, consumerKey, consumerSecret, "");
        const response = await fetch(url, {
          headers: { Authorization: authHeader },
        });

        if (!response.ok) {
          const text = await response.text();
          return errorResponse(`Request token failed: ${response.status} - ${text}`, 502, req);
        }

        const parsed = parseOAuthResponse(await response.text());
        const authorizeUrl = `https://us.etrade.com/e/t/etws/authorize?key=${consumerKey}&token=${parsed.oauth_token}`;

        return jsonResponse({
          oauthToken: parsed.oauth_token,
          oauthTokenSecret: parsed.oauth_token_secret,
          authorizeUrl,
        }, 200, req);
      }

      // ── Step 2: Exchange verifier for access token ─────────────
      case "accessToken": {
        if (!oauthToken || !oauthTokenSecret || !verifier) {
          return errorResponse("Missing oauthToken, oauthTokenSecret, or verifier", 400, req);
        }

        const url = `${ETRADE_BASE}/oauth/access_token`;
        const oauthInputParams: Record<string, string> = {
          oauth_token: oauthToken,
          oauth_verifier: verifier,
        };

        const authHeader = await oauthSign("GET", url, oauthInputParams, consumerKey, consumerSecret, oauthTokenSecret);
        const response = await fetch(url, {
          headers: { Authorization: authHeader },
        });

        if (!response.ok) {
          const text = await response.text();
          return errorResponse(`Access token failed: ${response.status} - ${text}`, 502, req);
        }

        const parsed = parseOAuthResponse(await response.text());
        return jsonResponse({
          oauthToken: parsed.oauth_token,
          oauthTokenSecret: parsed.oauth_token_secret,
        }, 200, req);
      }

      // ── Renew inactive access token ────────────────────────────
      case "renewToken": {
        if (!oauthToken || !oauthTokenSecret) {
          return errorResponse("Missing oauthToken or oauthTokenSecret", 400, req);
        }

        const url = `${ETRADE_BASE}/oauth/renew_access_token`;
        const oauthInputParams: Record<string, string> = {
          oauth_token: oauthToken,
        };

        const authHeader = await oauthSign("GET", url, oauthInputParams, consumerKey, consumerSecret, oauthTokenSecret);
        const response = await fetch(url, {
          headers: { Authorization: authHeader },
        });

        if (!response.ok) {
          const text = await response.text();
          return errorResponse(`Token renewal failed: ${response.status} - ${text}`, 502, req);
        }

        return jsonResponse({ renewed: true }, 200, req);
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400, req);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "E*Trade auth error";
    if (msg.includes("authentication") || msg.includes("token") || msg.includes("Missing")) {
      return errorResponse(msg, 401, req);
    }
    return errorResponse(msg, 500, req);
  }
});
