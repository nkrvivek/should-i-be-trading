import { authenticateRequest, getUserCredential, corsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Anthropic proxy with rate limiting for demo/trial users.
 *
 * Flow:
 * 1. Authenticate user (required)
 * 2. Try user's own stored Anthropic key (no rate limit)
 * 3. Fall back to server-side ANTHROPIC_API_KEY (rate limited)
 *
 * Rate limits (server key only):
 *   Free/Trial: 5 requests/day, max_tokens capped at 1024
 *   Pro: 25 requests/day, max_tokens capped at 2048
 *   Enterprise: 100 requests/day, no cap
 */

const DAILY_LIMITS: Record<string, number> = {
  free: 5, trial: 5, pro: 25, enterprise: 100,
};

const TOKEN_CAPS: Record<string, number> = {
  free: 1024, trial: 1024, pro: 2048, enterprise: 4096,
};

const MODEL_OVERRIDES: Record<string, string> = {
  free: "claude-sonnet-4-6", trial: "claude-sonnet-4-6",
};

async function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function getUserTier(userId: string): Promise<string> {
  try {
    const supabase = await getServiceClient();

    // Check subscription status first
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_tier, status, current_period_end")
      .eq("user_id", userId)
      .single();

    if (sub && sub.plan_tier !== "free") {
      // Active or trialing — full access
      if (sub.status === "active" || sub.status === "trialing") return sub.plan_tier;
      // Past due — 3-day grace period from period end
      if (sub.status === "past_due" && sub.current_period_end) {
        const gracePeriodEnd = new Date(sub.current_period_end);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);
        if (new Date() < gracePeriodEnd) return sub.plan_tier;
        // Grace period expired — downgrade
        return "free";
      }
    }

    // Check free trial
    const { data } = await supabase
      .from("profiles")
      .select("tier, trial_ends_at")
      .eq("id", userId)
      .single();

    if (!data) return "free";
    if (data.tier === "free" && data.trial_ends_at) {
      if (new Date(data.trial_ends_at) > new Date()) return "trial";
    }
    return data.tier ?? "free";
  } catch {
    return "free";
  }
}

async function checkAndIncrementUsage(userId: string, tier: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const supabase = await getServiceClient();
  const today = new Date().toISOString().split("T")[0];
  const limit = DAILY_LIMITS[tier] ?? DAILY_LIMITS.free;

  try {
    const { data: existing } = await supabase
      .from("ai_usage")
      .select("request_count")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .single();

    const currentCount = existing?.request_count ?? 0;
    if (currentCount >= limit) {
      return { allowed: false, used: currentCount, limit };
    }

    await supabase
      .from("ai_usage")
      .upsert(
        { user_id: userId, usage_date: today, request_count: currentCount + 1, updated_at: new Date().toISOString() },
        { onConflict: "user_id,usage_date" },
      );

    return { allowed: true, used: currentCount + 1, limit };
  } catch {
    // If usage tracking fails, still allow the request
    return { allowed: true, used: 0, limit };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate user
    let ctx;
    try {
      ctx = await authenticateRequest(req);
    } catch (authErr) {
      return errorResponse(
        `Authentication failed: ${authErr instanceof Error ? authErr.message : "Invalid token"}. Please sign out and sign back in.`,
        401,
      );
    }

    // 1. Try user's own key first (no rate limiting)
    let apiKey: string | null = null;
    let usingServerKey = false;

    try {
      apiKey = await getUserCredential(ctx, "anthropic");
    } catch {
      // No user key — fall back to server key
      apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? null;
      if (!apiKey) {
        return errorResponse(
          "No Anthropic API key available. Add your key in Settings > API Keys.",
          403,
        );
      }
      usingServerKey = true;
    }

    const body = await req.json();

    // 2. Rate limit if using server key
    if (usingServerKey) {
      const tier = await getUserTier(ctx.userId);
      const usage = await checkAndIncrementUsage(ctx.userId, tier);

      if (!usage.allowed) {
        return errorResponse(
          `Daily AI limit reached (${usage.used}/${usage.limit}). Add your own Anthropic API key in Settings for unlimited access.`,
          429,
        );
      }

      // Cap max_tokens
      const maxTokensCap = TOKEN_CAPS[tier] ?? TOKEN_CAPS.free;
      if (body.max_tokens && body.max_tokens > maxTokensCap) {
        body.max_tokens = maxTokensCap;
      }

      // Force cheaper model for free/trial
      const modelOverride = MODEL_OVERRIDES[tier];
      if (modelOverride) {
        body.model = modelOverride;
      }
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Return usage stats in response headers so frontend can display remaining quota
    const usageHeaders: Record<string, string> = { ...corsHeaders };
    if (usingServerKey) {
      const tier = await getUserTier(ctx.userId);
      const limit = DAILY_LIMITS[tier] ?? DAILY_LIMITS.free;
      const today = new Date().toISOString().split("T")[0];
      try {
        const supabase = await getServiceClient();
        const { data: usage } = await supabase
          .from("ai_usage")
          .select("request_count")
          .eq("user_id", ctx.userId)
          .eq("usage_date", today)
          .single();
        usageHeaders["x-ai-used"] = String(usage?.request_count ?? 0);
        usageHeaders["x-ai-limit"] = String(limit);
      } catch { /* non-critical */ }
    } else {
      usageHeaders["x-ai-used"] = "own-key";
      usageHeaders["x-ai-limit"] = "unlimited";
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json", ...usageHeaders },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Proxy error";
    return errorResponse(msg, 500);
  }
});
