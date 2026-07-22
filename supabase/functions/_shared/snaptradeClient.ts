/**
 * SnapTrade API client helper — ported from broker-snaptrade/index.ts's
 * request/signing helpers (jsonStringifySorted / signRequest / snapRequest)
 * so generate-proposals can call SnapTrade directly without an internal
 * function-to-function HTTP hop. Deliberately duplicated rather than
 * refactoring broker-snaptrade/index.ts to import this — that function is
 * live/deployed and out of scope for this workstream; a follow-up cleanup
 * can point it at this shared module once both are verified independently.
 */

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

/** Raw SnapTrade REST call — same signing contract as broker-snaptrade's
 * snapRequest. userId/userSecret are the SnapTrade-side identifiers for the
 * connected brokerage account, NOT the Supabase auth user id. */
export async function snapRequest(
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

  const qp = new URLSearchParams({ clientId, timestamp });
  if (opts.userId) qp.set("userId", opts.userId);
  if (opts.userSecret) qp.set("userSecret", opts.userSecret);

  const sortedQp = new URLSearchParams([...qp.entries()].sort());
  const queryString = sortedQp.toString();

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

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return {};
}

/** SnapTrade position shape (subset — only the fields generate-proposals
 * needs). SnapTrade's real payload has more fields; this is intentionally
 * narrow. */
export interface SnapTradePositionRaw {
  symbol?: { symbol?: { symbol?: string; type?: { code?: string } } };
  units?: number;
  average_purchase_price?: number;
  price?: number;
}

/** SnapTrade account balance shape (subset). */
export interface SnapTradeBalanceRaw {
  total_value?: { value?: number };
}

export async function getSnapTradePositions(
  userId: string,
  userSecret: string,
  accountId: string,
): Promise<SnapTradePositionRaw[]> {
  const data = await snapRequest("GET", `accounts/${accountId}/positions`, { userId, userSecret });
  return Array.isArray(data) ? (data as SnapTradePositionRaw[]) : [];
}

export async function getSnapTradeBalances(
  userId: string,
  userSecret: string,
  accountId: string,
): Promise<SnapTradeBalanceRaw | null> {
  const data = await snapRequest("GET", `accounts/${accountId}/balances`, { userId, userSecret });
  if (Array.isArray(data)) return (data[0] as SnapTradeBalanceRaw) ?? null;
  return (data as SnapTradeBalanceRaw) ?? null;
}
