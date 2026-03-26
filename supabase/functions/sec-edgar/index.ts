import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const EDGAR_BASE = "https://efts.sec.gov/LATEST";
const EDGAR_DATA = "https://data.sec.gov";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    // Authenticate user
    await authenticateRequest(req);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "insider") {
      const ticker = url.searchParams.get("ticker");
      if (!ticker) return errorResponse("Missing ticker", 400, req);

      // Validate ticker format
      if (!/^[A-Za-z]{1,6}$/.test(ticker)) {
        return errorResponse("Invalid ticker format", 400, req);
      }

      const cikRes = await fetch(`${EDGAR_DATA}/submissions/CIK${ticker.padStart(10, "0")}.json`, {
        headers: { "User-Agent": "SIBT/1.0 (contact@sibt.app)" },
      });

      if (!cikRes.ok) {
        const searchRes = await fetch(`${EDGAR_BASE}/search-index?q=${encodeURIComponent(ticker)}&forms=4&dateRange=custom&startdt=${getDateDaysAgo(30)}&enddt=${getTodayStr()}`, {
          headers: { "User-Agent": "SIBT/1.0 (contact@sibt.app)" },
        });
        if (!searchRes.ok) {
          return errorResponse(`SEC EDGAR search failed (${searchRes.status})`, searchRes.status, req);
        }
        const searchData = await searchRes.json();
        return jsonResponse(searchData, 200, req);
      }

      const data = await cikRes.json();
      return jsonResponse(data, 200, req);
    }

    if (action === "filings_search") {
      const query = url.searchParams.get("q") ?? "";
      const forms = url.searchParams.get("forms") ?? "4,13F-HR";
      const searchRes = await fetch(`${EDGAR_BASE}/search-index?q=${encodeURIComponent(query)}&forms=${encodeURIComponent(forms)}`, {
        headers: { "User-Agent": "SIBT/1.0 (contact@sibt.app)" },
      });
      if (!searchRes.ok) {
        return errorResponse(`SEC EDGAR search failed (${searchRes.status})`, searchRes.status, req);
      }
      const data = await searchRes.json();
      return jsonResponse(data, 200, req);
    }

    return errorResponse("Invalid action. Use 'insider' or 'filings_search'", 400, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "SEC EDGAR error";
    if (msg.includes("authentication") || msg.includes("token") || msg.includes("Missing")) {
      return errorResponse(msg, 401, req);
    }
    return errorResponse(msg, 500, req);
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
