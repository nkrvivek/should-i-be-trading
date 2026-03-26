import { authenticateRequest, getUserCredential, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const EXA_BASE = "https://api.exa.ai";
const ALLOWED_ENDPOINTS = ["/search", "/contents"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const ctx = await authenticateRequest(req);
    const apiKey = await getUserCredential(ctx, "exa");

    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint") ?? "/search";

    if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
      return errorResponse(`Endpoint not allowed: ${endpoint}. Valid: ${ALLOWED_ENDPOINTS.join(", ")}`, 403, req);
    }

    const body = await req.json();

    const response = await fetch(`${EXA_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`Exa API error (${response.status})`);
      return errorResponse(`Exa API error: ${response.status}`, response.status >= 500 ? 502 : response.status, req);
    }

    const data = await response.json();
    return jsonResponse(data, 200, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Proxy error";
    return errorResponse(msg, msg.includes("credential") ? 403 : 500, req);
  }
});
