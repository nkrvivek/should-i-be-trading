/**
 * Claude API client.
 * In dev, Vite proxies /anthropic/* to https://api.anthropic.com
 * In prod, goes through Supabase Edge Function with rate limiting.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";

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
};

let _lastUsage: AiUsageInfo = { used: 0, limit: 5, isOwnKey: false };
const _listeners = new Set<() => void>();

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

export async function chatWithClaude(
  messages: ChatMessage[],
  systemPrompt: string,
  model = "claude-sonnet-4-6",
): Promise<ChatResponse> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const body = {
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  };

  let responseData: Record<string, unknown>;

  if (apiKey) {
    // Direct API call (local dev with Vite proxy)
    _lastUsage = { used: 0, limit: Infinity, isOwnKey: true };
    _notifyUsageChange();

    const response = await fetch("/anthropic/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      let msg = `Claude API ${response.status}`;
      try { msg = JSON.parse(text).error?.message || msg; } catch { msg = text.slice(0, 200) || msg; }
      throw new Error(msg);
    }
    responseData = await response.json();

  } else if (isSupabaseConfigured() && supabaseUrl && supabaseAnonKey) {
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
      _lastUsage = { used: 0, limit: Infinity, isOwnKey: true };
      _notifyUsageChange();
    } else if (aiUsed && aiLimit) {
      _lastUsage = { used: parseInt(aiUsed, 10), limit: parseInt(aiLimit, 10), isOwnKey: false };
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
    throw new Error("Add your Anthropic API key in Settings to use AI features.");
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
