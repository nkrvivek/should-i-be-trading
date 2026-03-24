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
    // Direct API call (local dev with Vite proxy, or direct browser access)
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
    // Production: use Supabase Edge Function proxy
    // Get the user's session token (required for authenticateRequest in the edge function)
    const session = await supabase.auth.getSession();
    const userToken = session.data.session?.access_token;

    if (!userToken) {
      throw new Error("Sign in to use AI features, or add your own Anthropic API key in Settings.");
    }

    response = await fetch(`${supabaseUrl}/functions/v1/proxy-anthropic`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
        apikey: supabaseKey,
      },
      body,
    });
  } else {
    throw new Error("Add your Anthropic API key in Settings to use AI features.");
  }

  if (!response.ok) {
    const text = await response.text();
    let msg = `Claude API ${response.status}`;
    try {
      const body = JSON.parse(text);
      msg = body.error?.message || msg;
    } catch {
      msg = text.slice(0, 200) || msg;
    }
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) {
    console.error("Unexpected Claude API response:", JSON.stringify(data).slice(0, 500));
    throw new Error("Claude returned an empty response. Check the console for details.");
  }
  return {
    content: text,
    model: data.model,
    usage: data.usage,
  };
}
