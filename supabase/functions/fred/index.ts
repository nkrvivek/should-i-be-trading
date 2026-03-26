import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const FRED_BASE = "https://api.stlouisfed.org/fred";

// Allowed FRED endpoints
const ALLOWED_ENDPOINTS = new Set(["series/observations", "series", "releases"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    // Authenticate user
    await authenticateRequest(req);

    const apiKey = Deno.env.get("FRED_API_KEY");
    if (!apiKey) return errorResponse("FRED_API_KEY not configured", 500, req);

    const url = new URL(req.url);
    const seriesId = url.searchParams.get("series_id");
    const endpoint = url.searchParams.get("endpoint") ?? "series/observations";

    // Validate endpoint
    if (!ALLOWED_ENDPOINTS.has(endpoint)) {
      return errorResponse(`Endpoint not allowed: ${endpoint}`, 403, req);
    }

    if (!seriesId && endpoint === "series/observations") {
      return errorResponse("Missing series_id parameter", 400, req);
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
      return errorResponse(`FRED API error: ${response.status}`, 502, req);
    }
    const data = await response.json();
    return jsonResponse(data, 200, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "FRED error";
    if (msg.includes("authentication") || msg.includes("token") || msg.includes("Missing")) {
      return errorResponse(msg, 401, req);
    }
    return errorResponse(msg, 500, req);
  }
});
