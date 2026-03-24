import { corsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const RAPIDAPI_URL = "https://politician-trade-tracker1.p.rapidapi.com/get_latest_trades";

/**
 * Server-side proxy for congressional trading data.
 * Uses RAPIDAPI_KEY stored as Supabase secret — never exposed to the client.
 * Free tier: available to all signed-up users.
 * Pro tier: Users with UW_TOKEN get richer data via proxy-uw instead.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("RAPIDAPI_KEY");
    if (!apiKey) {
      return errorResponse("RAPIDAPI_KEY not configured on server", 500);
    }

    const response = await fetch(RAPIDAPI_URL, {
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": "politician-trade-tracker1.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
    });

    if (!response.ok) {
      return errorResponse(`RapidAPI error: ${response.status}`, response.status);
    }

    const data = await response.json();
    return jsonResponse(data);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Congress proxy error", 500);
  }
});
