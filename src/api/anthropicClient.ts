/**
 * Claude API client.
 * In dev, Vite proxies /anthropic/* to https://api.anthropic.com
 * In prod, goes through Supabase Edge Function.
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

export async function chatWithClaude(
  messages: ChatMessage[],
  systemPrompt: string,
  model = "claude-sonnet-4-6",
): Promise<ChatResponse> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const body = JSON.stringify({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });

  let response: Response;

  if (apiKey) {
    // Direct API call (local dev with Vite proxy)
    response = await fetch("/anthropic/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body,
    });
  } else if (isSupabaseConfigured() && supabaseUrl && supabaseKey) {
    // Production: Supabase Edge Function proxy
    const { data } = await supabase.auth.getSession();
    const userToken = data.session?.access_token;

    if (!userToken) {
      throw new Error("Sign in to use AI features, or add your own Anthropic API key in Settings.");
    }

    // Use Supabase invoke() which handles auth headers correctly
    const { data: fnData, error: fnError } = await supabase.functions.invoke("proxy-anthropic", {
      body: JSON.parse(body),
    });

    if (fnError) {
      throw new Error(fnError.message || "Claude API request failed");
    }

    // supabase.functions.invoke returns parsed JSON directly
    const text = fnData?.content?.[0]?.text;
    if (!text) {
      // Check if it's an error response
      if (fnData?.error) {
        throw new Error(fnData.error);
      }
      console.error("Unexpected Claude API response:", JSON.stringify(fnData).slice(0, 500));
      throw new Error("Claude returned an empty response.");
    }
    return {
      content: text,
      model: fnData.model,
      usage: fnData.usage,
    };
  } else {
    throw new Error("Add your Anthropic API key in Settings to use AI features.");
  }

  if (!response!.ok) {
    const text = await response!.text();
    let msg = `Claude API ${response!.status}`;
    try {
      const parsed = JSON.parse(text);
      msg = parsed.error?.message || parsed.error || msg;
    } catch {
      msg = text.slice(0, 200) || msg;
    }
    throw new Error(msg);
  }

  const respData = await response!.json();
  const text = respData.content?.[0]?.text;
  if (!text) {
    console.error("Unexpected Claude API response:", JSON.stringify(respData).slice(0, 500));
    throw new Error("Claude returned an empty response.");
  }
  return {
    content: text,
    model: respData.model,
    usage: respData.usage,
  };
}
