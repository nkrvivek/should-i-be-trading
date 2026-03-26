import { corsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("FINNHUB_API_KEY");
    if (!apiKey) return errorResponse("FINNHUB_API_KEY not configured", 500);

    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");
    if (!endpoint) return errorResponse("Missing 'endpoint' parameter");

    const params = new URLSearchParams({ token: apiKey });
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "endpoint") params.set(key, value);
    }

    const response = await fetch(`${FINNHUB_BASE}/${endpoint}?${params}`);
    if (!response.ok) {
      const text = await response.text();
      console.error(`Finnhub error (${response.status}):`, text);
      return errorResponse(`Finnhub API error: ${response.status}`, 502);
    }
    const data = await response.json();
    return jsonResponse(data);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Finnhub error", 500);
  }
});
