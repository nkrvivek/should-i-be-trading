/**
 * Resolves WS and API URLs from user settings.
 * Falls back to Vite proxy defaults for local dev.
 */

export function getWsUrl(): string {
  // Check user-configured URL first
  const stored = localStorage.getItem("sibt_ws_url");
  if (stored) return stored;

  // Default: Vite proxy (dev) or relative path (prod)
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

export function getApiBaseUrl(): string {
  const stored = localStorage.getItem("sibt_api_url");
  if (stored) return stored;
  return "/api";
}

export function isLocalConnection(): boolean {
  const wsUrl = getWsUrl();
  return wsUrl.includes("localhost") || wsUrl.includes("127.0.0.1");
}
