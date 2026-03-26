import { corsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const FRED_BASE = "https://api.stlouisfed.org/fred";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("FRED_API_KEY");
    if (!apiKey) return errorResponse("FRED_API_KEY not configured", 500);

    const url = new URL(req.url);
    const seriesId = url.searchParams.get("series_id");
    const endpoint = url.searchParams.get("endpoint") ?? "series/observations";

    if (!seriesId && endpoint === "series/observations") {
      return errorResponse("Missing series_id parameter");
    }

    const params = new URLSearchParams({
      api_key: apiKey,
      file_type: "json",
    });

    if (seriesId) params.set("series_id", seriesId);

    // Forward additional params
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "series_id" && key !== "endpoint") {
        params.set(key, value);
      }
    }

    const response = await fetch(`${FRED_BASE}/${endpoint}?${params}`);
    if (!response.ok) {
      const text = await response.text();
      console.error(`FRED error (${response.status}):`, text);
      return errorResponse(`FRED API error: ${response.status}`, 502);
    }
    const data = await response.json();
    return jsonResponse(data);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "FRED error", 500);
  }
});
