/**
 * Pure TS mirror of the Postgres `execute_paper_fill` function
 * (supabase/migrations/017_paper_trading.sql). Deliberately dependency-free
 * (no Deno, no Supabase client) so it's independently vitest-testable and so
 * an edge function can compute an expected fill price/result using the same
 * logic before calling the RPC — same split as src/lib/proposalEngine.ts /
 * src/lib/proposalActions.ts.
 *
 * The Postgres function is the single source of truth for the actual
 * money-moving transaction (row-locked, atomic). This module is a hand-synced
 * mirror of the same math, not a second source of truth — see that
 * migration's doc comment.
 *
 * Fill-price model ported (ideas only, not imported) from
 * autopilot-experiment/broker_paper.py's PaperBroker: buy fills at the ask,
 * sell fills at the bid.
 */

export type PaperFillSide = "buy" | "sell" | "sell_to_open" | "buy_to_close";

export interface Quote {
  bid: number;
  ask: number;
}

/** buy / buy_to_close fill at the ask (you pay the offer); sell /
 * sell_to_open fill at the bid (you hit the bid) — standard marketable-order
 * convention, same as the reference PaperBroker. */
export function selectFillPrice(side: PaperFillSide, quote: Quote): number {
  return side === "buy" || side === "buy_to_close" ? quote.ask : quote.bid;
}

export interface PositionState {
  qty: number;
  avgPrice: number;
}

export interface FillBookkeepingParams {
  cashUsd: number;
  position: PositionState | null;
  side: PaperFillSide;
  qty: number;
  price: number;
  /** 100 for options (per-contract), 1 for equities. */
  multiplier?: number;
}

export interface FillBookkeepingResult {
  cashUsd: number;
  position: PositionState | null; // null when the fill flattens the position
}

/**
 * Mirrors execute_paper_fill's math exactly: buy/buy_to_close increase the
 * signed position qty and debit cash; sell/sell_to_open decrease signed qty
 * and credit cash. avg_price is a weighted average only when the fill
 * extends the position in its existing direction (opening/adding); a
 * reducing or flipping fill keeps the prior avg_price for cost-basis
 * purposes (no separate realized-P&L column in v1 — cashUsd already
 * reflects it via the cash delta).
 *
 * Throws (never returns a partial/guessed result) on qty <= 0, price < 0, or
 * a buy-direction fill that would drive cash negative — paper accounts have
 * no margin, matching this vault's own NO MARGIN DEBIT convention.
 */
export function computeFillBookkeeping(params: FillBookkeepingParams): FillBookkeepingResult {
  const { cashUsd, position, side, qty, price } = params;
  const multiplier = params.multiplier ?? 1;

  if (qty <= 0) throw new Error("computeFillBookkeeping: qty must be > 0");
  if (price < 0) throw new Error("computeFillBookkeeping: price must be >= 0");

  const priorQty = position?.qty ?? 0;
  const priorAvg = position?.avgPrice ?? 0;

  const isBuyDirection = side === "buy" || side === "buy_to_close";
  const signedQty = isBuyDirection ? qty : -qty;
  const cashDelta = isBuyDirection ? -(qty * price * multiplier) : qty * price * multiplier;

  if (isBuyDirection && cashUsd + cashDelta < 0) {
    throw new Error("computeFillBookkeeping: insufficient paper cash for this fill");
  }

  const newQty = priorQty + signedQty;

  let newAvg: number;
  if (priorQty === 0 || Math.sign(priorQty) === Math.sign(signedQty)) {
    newAvg = newQty !== 0 ? (Math.abs(priorQty) * priorAvg + qty * price) / Math.abs(newQty) : price;
  } else {
    newAvg = priorAvg;
  }

  return {
    cashUsd: cashUsd + cashDelta,
    position: newQty === 0 ? null : { qty: newQty, avgPrice: newAvg },
  };
}
