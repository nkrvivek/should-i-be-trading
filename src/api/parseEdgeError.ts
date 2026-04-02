/**
 * Shared error parser for edge function responses.
 * Extracts error message from JSON body or falls back to status code.
 */
export async function parseEdgeError(response: Response, label: string): Promise<never> {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `${label} request failed: ${response.status}`);
}
