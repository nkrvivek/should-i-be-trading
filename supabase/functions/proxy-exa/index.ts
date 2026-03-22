import { authenticateRequest, getUserCredential, corsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const EXA_BASE = "https://api.exa.ai";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ctx = await authenticateRequest(req);
    const apiKey = await getUserCredential(ctx, "exa");

    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint") ?? "/search";
    const body = await req.json();

    const response = await fetch(`${EXA_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return jsonResponse(data, response.status);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Proxy error";
    return errorResponse(msg, msg.includes("credential") ? 403 : 500);
  }
});
