/**
 * Finnhub earnings-calendar client — builds a production EarningsChecker for
 * the covered-call candidate builder. Same direct-fetch-client precedent as
 * _shared/tradierClient.ts / _shared/snaptradeClient.ts: talks to Finnhub
 * directly rather than hopping through the existing finnhub/index.ts edge
 * function (that function stays the rate-limited, user-facing proxy for
 * client reads).
 *
 * Fetches calendar/earnings scoped to a single ticker + [today, expiry] date
 * range and hands the raw dates to src/lib/earningsGate.ts's pure
 * evaluateEarningsWindow. Fail-open by contract: any missing API key, fetch
 * failure, or parse error resolves to 'unknown' (never 'blocked') — the
 * caller records that disclosure and logs the event rather than silently
 * degrading or over-blocking on a data outage.
 */
import { evaluateEarningsWindow } from "../../../src/lib/earningsGate.ts";
import type { EarningsChecker } from "../../../src/lib/proposalEngine.ts";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

interface FinnhubEarningsRow {
  date?: string;
  symbol?: string;
}

interface FinnhubEarningsResponse {
  earningsCalendar?: FinnhubEarningsRow[];
}

/** Real, Finnhub-backed EarningsChecker. */
export const finnhubEarningsChecker: EarningsChecker = async (params) => {
  const apiKey = Deno.env.get("FINNHUB_API_KEY");
  if (!apiKey) {
    return evaluateEarningsWindow({ today: params.today, expiry: params.expiry, earningsDates: null }).status;
  }

  try {
    const qp = new URLSearchParams({
      symbol: params.ticker,
      from: params.today,
      to: params.expiry,
      token: apiKey,
    });
    const res = await fetch(`${FINNHUB_BASE}/calendar/earnings?${qp.toString()}`);
    if (!res.ok) {
      return evaluateEarningsWindow({ today: params.today, expiry: params.expiry, earningsDates: null }).status;
    }
    const data = (await res.json()) as FinnhubEarningsResponse;
    const dates = (data.earningsCalendar ?? [])
      .filter((row) => !row.symbol || row.symbol.toUpperCase() === params.ticker.toUpperCase())
      .map((row) => row.date)
      .filter((d): d is string => Boolean(d));
    return evaluateEarningsWindow({ today: params.today, expiry: params.expiry, earningsDates: dates }).status;
  } catch {
    return evaluateEarningsWindow({ today: params.today, expiry: params.expiry, earningsDates: null }).status;
  }
};
