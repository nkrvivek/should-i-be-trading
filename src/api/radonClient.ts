export class RadonApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(`Radon API ${status}: ${detail}`);
    this.name = "RadonApiError";
  }
}

/**
 * Typed fetch wrapper for Radon's FastAPI.
 * In dev, Vite proxies /api/* to localhost:8321.
 */
export async function radonFetch<T>(
  path: string,
  opts: RequestInit & { timeout?: number } = {},
): Promise<T> {
  const { timeout = 30_000, ...fetchOpts } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`/api${path}`, {
      ...fetchOpts,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...fetchOpts.headers,
      },
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const body = await response.json();
        detail = body.detail || body.error || detail;
      } catch {
        // use statusText
      }
      throw new RadonApiError(response.status, detail);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** GET helper */
export function radonGet<T>(path: string, timeout?: number): Promise<T> {
  return radonFetch<T>(path, { method: "GET", timeout });
}

/** POST helper */
export function radonPost<T>(path: string, body?: unknown, timeout?: number): Promise<T> {
  return radonFetch<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
    timeout,
  });
}
