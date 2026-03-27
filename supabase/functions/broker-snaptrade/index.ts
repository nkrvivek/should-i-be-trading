import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";
import { sanitizeError } from "../_shared/sanitize.ts";

const SNAPTRADE_BASE = "https://api.snaptrade.com/api/v1";

// ── JSON stringify with sorted keys (matches SnapTrade SDK) ─────
function jsonStringifySorted(obj: unknown): string {
  const allKeys: string[] = [];
  const seen: Record<string, null> = {};
  JSON.stringify(obj, (key, value) => {
    if (!(key in seen)) {
      allKeys.push(key);
      seen[key] = null;
    }
    return value;
  });
  allKeys.sort();
  return JSON.stringify(obj, allKeys);
}

// ── HMAC-SHA256 signature generation (matches SnapTrade SDK) ────
async function signRequest(
  requestPath: string,
  queryString: string,
  requestData: Record<string, unknown> | null,
  consumerKey: string,
): Promise<string> {
  const sigObject = {
    content: requestData,
    path: requestPath,
    query: queryString,
  };
  const sigContent = jsonStringifySorted(sigObject);
  const encodedKey = encodeURI(consumerKey);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(encodedKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(sigContent),
  );
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

// ── SnapTrade API helper ────────────────────────────────────────
async function snapRequest(
  method: string,
  path: string,
  opts: {
    userId?: string;
    userSecret?: string;
    body?: Record<string, unknown>;
  } = {},
): Promise<unknown> {
  const clientId = Deno.env.get("SNAPTRADE_CLIENT_ID");
  const consumerKey = Deno.env.get("SNAPTRADE_CONSUMER_KEY");
  if (!clientId || !consumerKey) {
    throw new Error("SNAPTRADE_CLIENT_ID / SNAPTRADE_CONSUMER_KEY not configured");
  }

  const requestPath = `/api/v1/${path}`;
  const requestData = opts.body ?? null;
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Build query params — timestamp MUST be a query param per SnapTrade API
  const qp = new URLSearchParams({ clientId, timestamp });
  if (opts.userId) qp.set("userId", opts.userId);
  if (opts.userSecret) qp.set("userSecret", opts.userSecret);

  // Sort query params to match SDK behavior
  const sortedQp = new URLSearchParams([...qp.entries()].sort());
  const queryString = sortedQp.toString();

  // Sign using the same format as the official SnapTrade SDK
  const signature = await signRequest(requestPath, queryString, requestData, consumerKey);

  const url = `${SNAPTRADE_BASE}/${path}?${queryString}`;

  const headers: Record<string, string> = {
    Signature: signature,
    "Content-Type": "application/json",
  };

  const fetchOpts: RequestInit = { method, headers };
  if (requestData) fetchOpts.body = JSON.stringify(requestData);

  const res = await fetch(url, fetchOpts);
  if (!res.ok) {
    const text = await res.text();
    console.error(`SnapTrade error (${res.status}):`, text);
    throw new Error(`SnapTrade API error ${res.status}: ${text}`);
  }

  // Some DELETE endpoints return empty body
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return {};
}

// ── Edge function entry point ───────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    // Authenticate user
    const auth = await authenticateRequest(req);

    // Enforce request body size limit
    const contentLength = parseInt(req.headers.get("content-length") || "0");
    if (contentLength > 50000) {
      return errorResponse("Request too large", 413, req);
    }

    const body = await req.json();
    const { action, userId, userSecret, accountId } = body as {
      action?: string;
      userId?: string;
      userSecret?: string;
      accountId?: string;
    };

    if (!action) return errorResponse("Missing 'action'", 400, req);

    // Validate accountId format if provided
    const ACCOUNT_ID_RE = /^[a-zA-Z0-9-]{1,64}$/;
    if (accountId && !ACCOUNT_ID_RE.test(accountId)) {
      return errorResponse("Invalid account ID format", 400, req);
    }

    switch (action) {
      // ── Register a new SnapTrade user ───────────────────────
      case "register": {
        const snapUserId = `sibt-${auth.userId}`;
        const data = await snapRequest("POST", "snapTrade/registerUser", {
          body: { userId: snapUserId },
        });
        return jsonResponse(data, 200, req);
      }

      // ── Generate Connection Portal URL ──────────────────────
      case "connectPortal": {
        if (!userId || !userSecret) {
          return errorResponse("Missing userId or userSecret", 400, req);
        }
        const data = await snapRequest("POST", "snapTrade/login", {
          userId,
          userSecret,
          body: { userId, userSecret },
        });
        return jsonResponse(data, 200, req);
      }

      // ── List connected accounts ─────────────────────────────
      case "listAccounts": {
        if (!userId || !userSecret) {
          return errorResponse("Missing userId or userSecret", 400, req);
        }
        const data = await snapRequest("GET", "accounts", { userId, userSecret });
        return jsonResponse(data, 200, req);
      }

      // ── Get positions for an account ────────────────────────
      case "getPositions": {
        if (!userId || !userSecret || !accountId) {
          return errorResponse("Missing userId, userSecret, or accountId", 400, req);
        }
        const data = await snapRequest("GET", `accounts/${accountId}/positions`, {
          userId,
          userSecret,
        });
        return jsonResponse(data, 200, req);
      }

      // ── Get balances for an account ─────────────────────────
      case "getBalances": {
        if (!userId || !userSecret || !accountId) {
          return errorResponse("Missing userId, userSecret, or accountId", 400, req);
        }
        const data = await snapRequest("GET", `accounts/${accountId}/balances`, {
          userId,
          userSecret,
        });
        return jsonResponse(data, 200, req);
      }

      // ── Get orders for an account ───────────────────────────
      case "getOrders": {
        if (!userId || !userSecret || !accountId) {
          return errorResponse("Missing userId, userSecret, or accountId", 400, req);
        }
        const data = await snapRequest("GET", `accounts/${accountId}/orders`, {
          userId,
          userSecret,
        });
        return jsonResponse(data, 200, req);
      }

      // ── Delete / disconnect SnapTrade user ──────────────────
      case "deleteUser": {
        if (!userId || !userSecret) {
          return errorResponse("Missing userId or userSecret", 400, req);
        }
        await snapRequest("DELETE", "snapTrade/deleteUser", { userId, userSecret });
        return jsonResponse({ ok: true }, 200, req);
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400, req);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "SnapTrade proxy error";
    const sanitizedMsg = String(sanitizeError(msg));
    if (msg.includes("authentication") || msg.includes("token") || msg.includes("Missing")) {
      return errorResponse(sanitizedMsg, 401, req);
    }
    return errorResponse(sanitizedMsg, 500, req);
  }
});
