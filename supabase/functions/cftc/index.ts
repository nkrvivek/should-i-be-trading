import { corsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

/**
 * CFTC Commitments of Traders — Free public API.
 * No API key needed. Published weekly (Tuesday data, released Friday).
 * Tracks institutional futures positioning across key contracts.
 */

const CFTC_BASE = "https://publicreporting.cftc.gov/resource/jun7-fc8e.json";

// Key contracts we track
const CONTRACTS: Record<string, { code: string; name: string; category: string }> = {
  "SP500": { code: "13874A", name: "E-Mini S&P 500", category: "index" },
  "NASDAQ": { code: "20974A", name: "E-Mini Nasdaq 100", category: "index" },
  "DOW": { code: "124603", name: "DJIA x $5", category: "index" },
  "TREASURY_10Y": { code: "043602", name: "UST 10Y Note", category: "rates" },
  "TREASURY_2Y": { code: "042601", name: "UST 2Y Note", category: "rates" },
  "GOLD": { code: "088691", name: "Gold", category: "commodity" },
  "CRUDE_OIL": { code: "067651", name: "Crude Oil WTI", category: "commodity" },
  "VIX": { code: "1170E1", name: "VIX Futures", category: "volatility" },
  "EUR_USD": { code: "099741", name: "Euro FX", category: "currency" },
  "JPY_USD": { code: "097741", name: "Japanese Yen", category: "currency" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const weeks = parseInt(url.searchParams.get("weeks") ?? "8");
    const contractCodes = Object.values(CONTRACTS).map((c) => `'${c.code}'`).join(",");

    const query = new URLSearchParams({
      "$where": `cftc_contract_market_code in(${contractCodes})`,
      "$order": "report_date_as_yyyy_mm_dd DESC",
      "$limit": String(weeks * Object.keys(CONTRACTS).length),
      "$select": [
        "contract_market_name",
        "cftc_contract_market_code",
        "report_date_as_yyyy_mm_dd",
        "open_interest_all",
        "noncomm_positions_long_all",
        "noncomm_positions_short_all",
        "change_in_noncomm_long_all",
        "change_in_noncomm_short_all",
        "comm_positions_long_all",
        "comm_positions_short_all",
        "change_in_comm_long_all",
        "change_in_comm_short_all",
      ].join(","),
    });

    const response = await fetch(`${CFTC_BASE}?${query}`);
    if (!response.ok) {
      return errorResponse(`CFTC API error: ${response.status}`, response.status);
    }

    const raw = await response.json();

    // Process into structured format
    const byContract: Record<string, {
      name: string;
      category: string;
      code: string;
      history: {
        date: string;
        netSpeculative: number;
        netCommercial: number;
        openInterest: number;
        specLong: number;
        specShort: number;
        commLong: number;
        commShort: number;
        specChange: number;
      }[];
    }> = {};

    for (const row of raw) {
      const code = row.cftc_contract_market_code;
      const contractInfo = Object.values(CONTRACTS).find((c) => c.code === code);
      if (!contractInfo) continue;

      if (!byContract[code]) {
        byContract[code] = {
          name: contractInfo.name,
          category: contractInfo.category,
          code,
          history: [],
        };
      }

      const specLong = parseInt(row.noncomm_positions_long_all || "0");
      const specShort = parseInt(row.noncomm_positions_short_all || "0");
      const commLong = parseInt(row.comm_positions_long_all || "0");
      const commShort = parseInt(row.comm_positions_short_all || "0");

      byContract[code].history.push({
        date: row.report_date_as_yyyy_mm_dd?.slice(0, 10) || "",
        netSpeculative: specLong - specShort,
        netCommercial: commLong - commShort,
        openInterest: parseInt(row.open_interest_all || "0"),
        specLong,
        specShort,
        commLong,
        commShort,
        specChange: parseInt(row.change_in_noncomm_long_all || "0") - parseInt(row.change_in_noncomm_short_all || "0"),
      });
    }

    // Sort history by date ascending for each contract
    for (const contract of Object.values(byContract)) {
      contract.history.sort((a, b) => a.date.localeCompare(b.date));
    }

    // Compute posture for each contract
    const positioning = Object.values(byContract).map((c) => {
      const latest = c.history[c.history.length - 1];
      const prev = c.history.length > 1 ? c.history[c.history.length - 2] : null;
      const netSpec = latest?.netSpeculative ?? 0;
      const oi = latest?.openInterest ?? 1;
      const netPctOI = (netSpec / oi) * 100;
      const weeklyChange = latest && prev ? latest.netSpeculative - prev.netSpeculative : 0;

      let posture = "NEUTRAL";
      if (netPctOI > 10) posture = "HEAVY LONG";
      else if (netPctOI > 3) posture = "LONG";
      else if (netPctOI < -10) posture = "HEAVY SHORT";
      else if (netPctOI < -3) posture = "SHORT";

      return {
        ...c,
        latest: {
          ...latest,
          netPctOI: Math.round(netPctOI * 100) / 100,
          weeklyChange,
          posture,
        },
      };
    });

    return jsonResponse({
      source: "CFTC Commitments of Traders",
      lastReport: raw[0]?.report_date_as_yyyy_mm_dd?.slice(0, 10) || "unknown",
      contracts: positioning,
    });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "CFTC error", 500);
  }
});
