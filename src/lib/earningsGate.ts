/**
 * Earnings Gate — pure earnings-window logic.
 *
 * Deliberately separated from the network fetch (supabase/functions/_shared/
 * finnhubClient.ts does the Finnhub calendar/earnings fetch and calls this
 * module) so the window logic is unit-testable without hitting Finnhub and
 * without Deno.
 *
 * Fail-open by design (Phase 2 hardening brief): when the earnings calendar
 * is unavailable, the candidate is NOT blocked — it's marked 'unknown' so the
 * caller can record it to proposal_signals and log a proposal_events row,
 * rather than silently letting it through undocumented or over-blocking on a
 * data outage.
 */

export type EarningsGateStatus = "clear" | "blocked" | "unknown";

export interface EarningsWindowResult {
  status: EarningsGateStatus;
}

export interface EvaluateEarningsWindowParams {
  /** ISO date (YYYY-MM-DD) — the window's start. */
  today: string;
  /** ISO date (YYYY-MM-DD) — the window's end (the proposal's expiry). */
  expiry: string;
  /** Scheduled earnings dates (ISO, YYYY-MM-DD) for the ticker, or null when
   * the calendar lookup failed / the API key isn't configured — null means
   * "unknown", never "no earnings scheduled". */
  earningsDates: string[] | null;
}

/** Evaluate whether a ticker has an earnings date inside [today, expiry]. */
export function evaluateEarningsWindow(params: EvaluateEarningsWindowParams): EarningsWindowResult {
  if (params.earningsDates === null) {
    return { status: "unknown" };
  }
  const inWindow = params.earningsDates.some((d) => d >= params.today && d <= params.expiry);
  return { status: inWindow ? "blocked" : "clear" };
}
