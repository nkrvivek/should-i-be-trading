/**
 * Claude API client.
 * In dev, Vite proxies /anthropic/* to https://api.anthropic.com
 * In prod, goes through Supabase Edge Function.
 */

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
  if (!apiKey) {
    throw new Error("Anthropic API key not configured. Add VITE_ANTHROPIC_API_KEY to your .env file or configure it in Settings.");
  }

  const response = await fetch("/anthropic/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    }),
  });

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
