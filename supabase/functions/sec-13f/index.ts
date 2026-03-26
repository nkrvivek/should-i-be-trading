import { authenticateRequest, getCorsHeaders, corsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

/**
 * SEC EDGAR 13F proxy edge function.
 *
 * Fetches institutional holdings from SEC EDGAR (free, no API key needed).
 * Proxies requests to add required User-Agent header and cache responses.
 *
 * Usage:
 *   POST /functions/v1/sec-13f
 *   Body: { "endpoint": "filers" }                    — Top hedge fund filers
 *   Body: { "endpoint": "holdings", "cik": "0001067983" } — Holdings for a CIK
 *   Body: { "endpoint": "holders", "ticker": "AAPL" }    — Who holds a stock
 *
 * SEC EDGAR is free but requires polite usage:
 *   - Max 10 requests/second
 *   - User-Agent with contact info
 */

const EDGAR_BASE = "https://efts.sec.gov/LATEST";
const EDGAR_FULL = "https://data.sec.gov";

const USER_AGENT = "SIBT/1.0 (hello@sibt.ai)";

// ── In-memory cache ────────────────────────────────────
const cache = new Map<string, { data: unknown; expires: number }>();

// 13F data is quarterly — cache aggressively
function getCacheTTL(endpoint: string): number {
  if (endpoint === "filers") return 24 * 3600 * 1000; // 1 day
  if (endpoint === "holdings") return 12 * 3600 * 1000; // 12 hours
  if (endpoint === "holders") return 12 * 3600 * 1000;
  if (endpoint === "search-filer") return 6 * 3600 * 1000;
  return 6 * 3600 * 1000;
}

// ── Well-known hedge funds / institutional filers ──────
const TOP_FILERS = [
  { name: "Berkshire Hathaway", cik: "0001067983", manager: "Warren Buffett" },
  { name: "Bridgewater Associates", cik: "0001350694", manager: "Ray Dalio" },
  { name: "Renaissance Technologies", cik: "0001037389", manager: "Jim Simons" },
  { name: "Citadel Advisors", cik: "0001423053", manager: "Ken Griffin" },
  { name: "Two Sigma Investments", cik: "0001179392", manager: "David Siegel" },
  { name: "D.E. Shaw", cik: "0001009207", manager: "David Shaw" },
  { name: "Tiger Global Management", cik: "0001167483", manager: "Chase Coleman" },
  { name: "Pershing Square Capital", cik: "0001336528", manager: "Bill Ackman" },
  { name: "Soros Fund Management", cik: "0001029160", manager: "George Soros" },
  { name: "Appaloosa Management", cik: "0001656456", manager: "David Tepper" },
  { name: "Elliott Investment Mgmt", cik: "0001048445", manager: "Paul Singer" },
  { name: "Point72 Asset Mgmt", cik: "0001603466", manager: "Steve Cohen" },
  { name: "Millennium Management", cik: "0001273087", manager: "Israel Englander" },
  { name: "Viking Global Investors", cik: "0001103804", manager: "Andreas Halvorsen" },
  { name: "Baupost Group", cik: "0001061768", manager: "Seth Klarman" },
  { name: "Third Point", cik: "0001040273", manager: "Dan Loeb" },
  { name: "Greenlight Capital", cik: "0001079114", manager: "David Einhorn" },
  { name: "Lone Pine Capital", cik: "0001061165", manager: "Stephen Mandel" },
  { name: "Coatue Management", cik: "0001535392", manager: "Philippe Laffont" },
  { name: "Druckenmiller (Duquesne)", cik: "0001536411", manager: "Stanley Druckenmiller" },
];

// ── Handler ────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Authenticate user
    await authenticateRequest(req);

    const body = await req.json();
    const { endpoint, cik, ticker, query } = body as {
      endpoint: string;
      cik?: string;
      ticker?: string;
      query?: string;
    };

    switch (endpoint) {
      case "filers": {
        // Return the curated list of top hedge fund filers
        return jsonResponse({ data: TOP_FILERS });
      }

      case "search-filer": {
        if (!query) return errorResponse("'search-filer' requires a 'query'", 400);
        const url = `${EDGAR_BASE}/search-index?q=${encodeURIComponent(query)}&dateRange=custom&startdt=2024-01-01&forms=13F-HR&from=0&size=10`;
        return await fetchAndCache(url, endpoint);
      }

      case "holdings": {
        if (!cik) return errorResponse("'holdings' requires a 'cik' (Central Index Key)", 400);
        // Fetch the latest 13F-HR filing index for this CIK
        const padded = cik.padStart(10, "0");

        // First get the filing list
        const filingUrl = `${EDGAR_BASE}/search-index?q=&forms=13F-HR&dateRange=custom&startdt=2024-01-01&from=0&size=1&entity=${encodeURIComponent(padded)}`;
        const filingResult = await fetchEdgar(filingUrl);

        if (!filingResult?.hits?.hits?.length) {
          return errorResponse(`No 13F filings found for CIK ${cik}`, 404);
        }

        const latestFiling = filingResult.hits.hits[0]._source;
        const accession = latestFiling.file_num || "";
        const filedAt = latestFiling.file_date || "";
        const formUrl = latestFiling.file_url || "";

        // Now fetch the actual holdings from the company facts
        const holdingsUrl = `${EDGAR_FULL}/submissions/CIK${padded}.json`;
        const holdingsCacheKey = holdingsUrl;
        const cached = cache.get(holdingsCacheKey);
        if (cached && cached.expires > Date.now()) {
          return jsonResponse({ data: cached.data, cached: true });
        }

        const holdingsData = await fetchEdgar(holdingsUrl);

        if (!holdingsData) {
          return errorResponse("Failed to fetch holdings data", 502);
        }

        // Extract recent filings to find the 13F-HR
        const recentFilings = holdingsData.filings?.recent || {};
        const forms = recentFilings.form || [];
        const dates = recentFilings.filingDate || [];
        const accessions = recentFilings.accessionNumber || [];
        const urls = recentFilings.primaryDocument || [];

        // Find 13F filings
        const thirteenFs = [];
        for (let i = 0; i < forms.length && thirteenFs.length < 4; i++) {
          if (forms[i] === "13F-HR" || forms[i] === "13F-HR/A") {
            thirteenFs.push({
              form: forms[i],
              filingDate: dates[i],
              accession: accessions[i],
              document: urls[i],
            });
          }
        }

        const result = {
          cik: padded,
          name: holdingsData.name || "",
          filings: thirteenFs,
          latestFilingDate: filedAt,
          latestAccession: accession,
          latestUrl: formUrl,
        };

        cache.set(holdingsCacheKey, { data: result, expires: Date.now() + getCacheTTL("holdings") });
        return jsonResponse({ data: result, cached: false });
      }

      case "holders": {
        if (!ticker) return errorResponse("'holders' requires a 'ticker'", 400);
        // Search for recent 13F filings mentioning this ticker
        const url = `${EDGAR_BASE}/search-index?q=${encodeURIComponent(ticker)}&forms=13F-HR&dateRange=custom&startdt=2024-01-01&from=0&size=20`;
        return await fetchAndCache(url, endpoint);
      }

      default:
        return errorResponse(`Unknown endpoint: ${endpoint}. Valid: filers, search-filer, holdings, holders`, 400);
    }
  } catch (err) {
    console.error("SEC 13F proxy error:", err);
    return errorResponse(err instanceof Error ? err.message : "Internal error", 500);
  }
});

// ── Helpers ────────────────────────────────────────────

async function fetchEdgar(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.error(`EDGAR error (${res.status}) for ${url}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error("EDGAR fetch error:", err);
    return null;
  }
}

async function fetchAndCache(url: string, endpoint: string): Promise<Response> {
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) {
    return jsonResponse({ data: cached.data, cached: true });
  }

  const data = await fetchEdgar(url);
  if (!data) {
    return errorResponse("Failed to fetch from SEC EDGAR", 502);
  }

  cache.set(url, { data, expires: Date.now() + getCacheTTL(endpoint) });

  // Prune cache
  if (cache.size > 200) {
    const now = Date.now();
    for (const [key, val] of cache) {
      if (val.expires < now) cache.delete(key);
    }
  }

  return jsonResponse({ data, cached: false });
}
