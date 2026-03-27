import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const VALIDATORS: Record<string, (key: string) => Promise<boolean>> = {
  unusual_whales: async (key) => {
    const res = await fetch("https://api.unusualwhales.com/api/stock/AAPL/info", {
      headers: { Authorization: `Bearer ${key}` },
    });
    return res.ok;
  },
  anthropic: async (key) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    return res.ok || res.status === 429; // 429 means key is valid but rate limited
  },
  exa: async (key) => {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify({ query: "test", numResults: 1 }),
    });
    return res.ok;
  },
  finnhub: async (key) => {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${key}`);
    return res.ok;
  },
  alpha_vantage: async (key) => {
    const res = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${key}`);
    const data = await res.json();
    return !data["Error Message"] && !data["Note"];
  },
};

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const ctx = await authenticateRequest(req);
    if (!checkRateLimit(ctx.userId)) {
      return errorResponse("Rate limit exceeded. Try again in a minute.", 429, req);
    }
    // Enforce request body size limit
    const contentLength = parseInt(req.headers.get("content-length") || "0");
    if (contentLength > 50000) {
      return errorResponse("Request too large", 413, req);
    }

    const { provider, credential_data } = await req.json();

    if (!provider || !credential_data) {
      return errorResponse("Missing provider or credential_data", 400, req);
    }

    if (typeof provider !== "string" || !/^[a-z_]{2,30}$/.test(provider)) {
      return errorResponse("Invalid provider format", 400, req);
    }
    if (typeof credential_data !== "string" || credential_data.length < 5 || credential_data.length > 500) {
      return errorResponse("Invalid credential format", 400, req);
    }

    const validator = VALIDATORS[provider];
    if (!validator) {
      return errorResponse(`No validator for provider: ${provider}`, 400, req);
    }

    const isValid = await validator(credential_data);

    // Update validity status in DB
    await ctx.supabase
      .from("user_credentials")
      .update({
        is_valid: isValid,
        last_validated_at: new Date().toISOString(),
      })
      .eq("user_id", ctx.userId)
      .eq("provider", provider);

    return jsonResponse({ valid: isValid, provider }, 200, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Validation error";
    return errorResponse(msg, 500, req);
  }
});
