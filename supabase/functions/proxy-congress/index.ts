import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const RAPIDAPI_URL = "https://politician-trade-tracker1.p.rapidapi.com/get_latest_trades";

/**
 * Server-side proxy for congressional trading data.
 * Uses RAPIDAPI_KEY stored as Supabase secret — never exposed to the client.
 * Requires authentication.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    // Authenticate user
    await authenticateRequest(req);

    const apiKey = Deno.env.get("RAPIDAPI_KEY");
    if (!apiKey) {
      return errorResponse("RAPIDAPI_KEY not configured on server", 500, req);
    }

    const response = await fetch(RAPIDAPI_URL, {
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": "politician-trade-tracker1.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
    });

    if (!response.ok) {
      return errorResponse(`RapidAPI error: ${response.status}`, response.status, req);
    }

    const data = await response.json();
    return jsonResponse(data, 200, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Congress proxy error";
    if (msg.includes("authentication") || msg.includes("token") || msg.includes("Missing")) {
      return errorResponse(msg, 401, req);
    }
    return errorResponse(msg, 500, req);
  }
});
