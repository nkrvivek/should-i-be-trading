/**
 * Strike Selector — pure covered-call strike-picking logic.
 *
 * Deliberately separated from the network fetch (supabase/functions/_shared/
 * tradierClient.ts does the Tradier chain fetch and calls this module) so the
 * selection rules are unit-testable without a live chain and without Deno.
 *
 * Rules (Phase 2 hardening, replaces src/lib/proposalEngine.ts's
 * stubStrikeSelector):
 *   1. Target delta band 0.20-0.30 when Greeks are available on the chain —
 *      pick the strike whose delta is closest to the band midpoint (0.25).
 *   2. Fall back to 5-8% OTM from spot (closest to the 6.5% midpoint) when no
 *      option in the chain carries a delta (Greeks unavailable).
 *   3. Never select a strike at or below the holding's cost basis when basis
 *      is known — writing a call below basis locks in a loss on assignment.
 *   4. Reject (return null) when the bid is below $0.05 or the eligible pool
 *      is empty after the above filters — including "no chain data" (an empty
 *      options array reaches the same empty-pool path).
 */

export interface ChainOption {
  strike: number;
  bid: number;
  /** null when the chain doesn't carry Greeks for this contract. */
  delta: number | null;
}

export interface SelectStrikeParams {
  spot: number;
  /** Holding's average cost basis. null/<=0 means "unknown" — no basis floor applied. */
  costBasis: number | null;
  /** Call options for a single, already-chosen expiry. */
  options: ChainOption[];
}

export type StrikeSelectionMethod = "delta_band" | "otm_fallback";

export interface StrikeSelection {
  strike: number;
  bid: number;
  delta: number | null;
  method: StrikeSelectionMethod;
}

export const TARGET_DELTA_MIN = 0.2;
export const TARGET_DELTA_MAX = 0.3;
export const TARGET_DELTA_MID = 0.25;
export const OTM_FALLBACK_MIN_PCT = 0.05;
export const OTM_FALLBACK_MAX_PCT = 0.08;
export const OTM_FALLBACK_MID_PCT = 0.065;
export const MIN_BID = 0.05;

/** True if a strike clears the cost-basis floor (or no basis is known). */
function clearsBasisFloor(strike: number, costBasis: number | null): boolean {
  if (costBasis == null || costBasis <= 0) return true;
  return strike > costBasis;
}

/** Pick the option in `pool` whose delta is closest to TARGET_DELTA_MID. */
function closestByDelta(pool: ChainOption[]): ChainOption {
  let best = pool[0];
  let bestDist = Math.abs((best.delta ?? 0) - TARGET_DELTA_MID);
  for (const o of pool) {
    const dist = Math.abs((o.delta ?? 0) - TARGET_DELTA_MID);
    if (dist < bestDist) {
      best = o;
      bestDist = dist;
    }
  }
  return best;
}

/** Pick the option in `pool` whose strike is closest to the OTM midpoint target. */
function closestByOtmTarget(pool: ChainOption[], spot: number): ChainOption {
  const target = spot * (1 + OTM_FALLBACK_MID_PCT);
  let best = pool[0];
  let bestDist = Math.abs(best.strike - target);
  for (const o of pool) {
    const dist = Math.abs(o.strike - target);
    if (dist < bestDist) {
      best = o;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Select a covered-call strike from a single-expiry call chain. Returns null
 * when nothing in the chain clears the gates (empty/missing chain, every
 * strike below the basis floor, or every remaining candidate's bid is below
 * MIN_BID) — the caller treats null as "reject this candidate".
 */
export function selectCoveredCallStrike(params: SelectStrikeParams): StrikeSelection | null {
  if (!params.options || params.options.length === 0) return null;

  const eligible = params.options.filter(
    (o) => o.strike > 0 && o.bid >= MIN_BID && clearsBasisFloor(o.strike, params.costBasis),
  );
  if (eligible.length === 0) return null;

  const withDelta = eligible.filter((o): o is ChainOption & { delta: number } => o.delta != null);

  if (withDelta.length > 0) {
    const inBand = withDelta.filter((o) => o.delta >= TARGET_DELTA_MIN && o.delta <= TARGET_DELTA_MAX);
    const pool = inBand.length > 0 ? inBand : withDelta;
    const chosen = closestByDelta(pool);
    return { strike: chosen.strike, bid: chosen.bid, delta: chosen.delta, method: "delta_band" };
  }

  // No Greeks anywhere in the eligible pool — fall back to the 5-8% OTM band.
  const otmLow = params.spot * (1 + OTM_FALLBACK_MIN_PCT);
  const otmHigh = params.spot * (1 + OTM_FALLBACK_MAX_PCT);
  const inOtmBand = eligible.filter((o) => o.strike >= otmLow && o.strike <= otmHigh);
  const pool = inOtmBand.length > 0 ? inOtmBand : eligible.filter((o) => o.strike >= otmLow);
  if (pool.length === 0) return null;
  const chosen = closestByOtmTarget(pool, params.spot);
  return { strike: chosen.strike, bid: chosen.bid, delta: null, method: "otm_fallback" };
}
