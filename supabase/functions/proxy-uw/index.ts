import { authenticateRequest, getUserCredential, corsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const UW_BASE = "https://api.unusualwhales.com/api";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ctx = await authenticateRequest(req);
    const uwToken = await getUserCredential(ctx, "unusual_whales");

    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    if (!path) return errorResponse("Missing 'path' query parameter");

    const upstreamUrl = `${UW_BASE}${path}`;
    const response = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${uwToken}`,
        "Content-Type": "application/json",
      },
      body: req.method !== "GET" ? await req.text() : undefined,
    });

    const data = await response.json();
    return jsonResponse(data, response.status);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Proxy error";
    return errorResponse(msg, msg.includes("credential") ? 403 : 500);
  }
});
