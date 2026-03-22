import { corsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const EDGAR_BASE = "https://efts.sec.gov/LATEST";
const EDGAR_DATA = "https://data.sec.gov";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "insider") {
      // Recent Form 4 filings for a ticker
      const ticker = url.searchParams.get("ticker");
      if (!ticker) return errorResponse("Missing ticker");

      const cikRes = await fetch(`${EDGAR_DATA}/submissions/CIK${ticker.padStart(10, "0")}.json`, {
        headers: { "User-Agent": "SIBT/1.0 (contact@sibt.app)" },
      });

      if (!cikRes.ok) {
        // Try full-text search as fallback
        const searchRes = await fetch(`${EDGAR_BASE}/search-index?q=${ticker}&forms=4&dateRange=custom&startdt=${getDateDaysAgo(30)}&enddt=${getTodayStr()}`, {
          headers: { "User-Agent": "SIBT/1.0 (contact@sibt.app)" },
        });
        const searchData = await searchRes.json();
        return jsonResponse(searchData);
      }

      const data = await cikRes.json();
      return jsonResponse(data);
    }

    if (action === "filings_search") {
      const query = url.searchParams.get("q") ?? "";
      const forms = url.searchParams.get("forms") ?? "4,13F-HR";
      const searchRes = await fetch(`${EDGAR_BASE}/search-index?q=${query}&forms=${forms}`, {
        headers: { "User-Agent": "SIBT/1.0 (contact@sibt.app)" },
      });
      const data = await searchRes.json();
      return jsonResponse(data);
    }

    return errorResponse("Invalid action. Use 'insider' or 'filings_search'");
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "SEC EDGAR error", 500);
  }
});

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}
