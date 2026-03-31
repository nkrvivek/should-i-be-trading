/**
 * Claude API client.
 * In dev, Vite proxies /anthropic/* to https://api.anthropic.com
 * In prod, goes through Supabase Edge Function with rate limiting.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { getAiRequestLimit } from "../lib/aiLimits";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatResponse = {
  content: string;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
};

/** AI usage tracking — updated after each proxy-anthropic call */
export type AiUsageInfo = {
  used: number;
  limit: number;
  isOwnKey: boolean;
  loaded: boolean;
};

let _lastUsage: AiUsageInfo = { used: 0, limit: getAiRequestLimit("free"), isOwnKey: false, loaded: false };
const _listeners = new Set<() => void>();
let _fetchedForSession = false;

/** Get last known AI usage (updated after each chatWithClaude call) */
export function getAiUsage(): AiUsageInfo {
  return _lastUsage;
}

/** Subscribe to usage changes — returns unsubscribe function */
export function onAiUsageChange(cb: () => void): () => void {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

function _notifyUsageChange() {
  _listeners.forEach((cb) => cb());
}

/** Fetch current AI usage from Supabase on mount (called once per session) */
export async function fetchCurrentAiUsage(): Promise<void> {
  if (_fetchedForSession) return;
  _fetchedForSession = true;

  try {
    const { supabase, isSupabaseConfigured } = await import("../lib/supabase");
    if (!isSupabaseConfigured()) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) return;

    // Check if user has stored anthropic credential
    const { data: cred } = await supabase
      .from("user_credentials")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", "anthropic")
      .maybeSingle();

    if (cred) {
      _lastUsage = { used: 0, limit: Infinity, isOwnKey: true, loaded: true };
      _notifyUsageChange();
      return;
    }

    // Get today's usage count
    const today = new Date().toISOString().split("T")[0];
    const { data: usage } = await supabase
      .from("ai_usage")
      .select("request_count")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();

    // Get tier to determine limit
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier, trial_ends_at")
      .eq("id", userId)
      .single();

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_tier, status")
      .eq("user_id", userId)
      .maybeSingle();

    let tier = "free";
    if (sub && sub.plan_tier !== "free" && ["active", "trialing", "past_due"].includes(sub.status)) {
      tier = sub.plan_tier;
    } else if (profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date()) {
      tier = "trial";
    } else {
      tier = profile?.tier ?? "free";
    }

    const limit = getAiRequestLimit(
      tier === "starter" || tier === "pro" || tier === "enterprise" || tier === "trial" || tier === "free"
        ? tier
        : "free",
    );

    _lastUsage = { used: usage?.request_count ?? 0, limit, isOwnKey: false, loaded: true };
    _notifyUsageChange();
  } catch {
    // Non-critical — badge will show defaults until first AI call
    _lastUsage = { ..._lastUsage, loaded: true };
    _notifyUsageChange();
  }
}

export async function chatWithClaude(
  messages: ChatMessage[],
  systemPrompt: string,
  model = "claude-sonnet-4-6",
): Promise<ChatResponse> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const body = {
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  };

  let responseData: Record<string, unknown>;

  if (isSupabaseConfigured() && supabaseUrl && supabaseAnonKey) {
    // Production: Supabase Edge Function proxy
    const { data: sessionData } = await supabase.auth.getSession();
    const userToken = sessionData.session?.access_token;

    if (!userToken) {
      throw new Error("Sign in to use AI features, or add your own Anthropic API key in Settings.");
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/proxy-anthropic`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "x-user-token": userToken,
      },
      body: JSON.stringify(body),
    });

    // Parse usage headers from proxy-anthropic
    const aiUsed = response.headers.get("x-ai-used");
    const aiLimit = response.headers.get("x-ai-limit");
    if (aiUsed === "own-key") {
      _lastUsage = { used: 0, limit: Infinity, isOwnKey: true, loaded: true };
      _notifyUsageChange();
    } else if (aiUsed && aiLimit) {
      _lastUsage = { used: parseInt(aiUsed, 10), limit: parseInt(aiLimit, 10), isOwnKey: false, loaded: true };
      _notifyUsageChange();
    }

    if (!response.ok) {
      const text = await response.text();
      let msg = `Claude API ${response.status}`;
      try {
        const parsed = JSON.parse(text);
        msg = parsed.error?.message || parsed.error || parsed.message || msg;
      } catch { msg = text.slice(0, 200) || msg; }
      throw new Error(msg);
    }
    responseData = await response.json();

  } else {
    throw new Error("Sign in to use AI features.");
  }

  const text = (responseData as { content?: { text: string }[] }).content?.[0]?.text;
  if (!text) {
    if ((responseData as { error?: string }).error) {
      throw new Error((responseData as { error: string }).error);
    }
    console.error("Unexpected Claude API response:", JSON.stringify(responseData).slice(0, 500));
    throw new Error("Claude returned an empty response.");
  }
  return {
    content: text,
    model: (responseData as { model: string }).model,
    usage: (responseData as { usage: { input_tokens: number; output_tokens: number } }).usage,
  };
}
