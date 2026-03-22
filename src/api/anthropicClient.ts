/**
 * Claude API client via Vite proxy.
 * Proxied through /anthropic/* to avoid browser CORS and API key exposure.
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
  model = "claude-sonnet-4-5-20250514",
): Promise<ChatResponse> {
  const response = await fetch("/anthropic/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY || "",
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
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error?.message || `Claude API ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.content[0]?.text ?? "",
    model: data.model,
    usage: data.usage,
  };
}
