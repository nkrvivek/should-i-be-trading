/**
 * Proposal Engine — pure logic for the covered-call candidate builder v1.
 *
 * Phase 2 workstream 2 (docs/relaunch-plan-2026-07.md). Ported patterns from
 * the autopilot-experiment bildof rail (hardened 2026-07-21):
 *   - open-risk ledger            -> autopilot-experiment/bildof_flow_cloud.py::_open_name_risk_usd
 *   - CC coverage guard           -> autopilot-experiment/bildof_flow_cloud.py::_open_cc_contracts
 *   - structural fingerprint dedup -> autopilot-experiment/bildof_flow_cloud.py::_fingerprint
 *   - per-rejection reason diag   -> autopilot-experiment/strategies/quality_pcs.py::select_pcs_spread
 *
 * This module is deliberately dependency-free (no Deno/no Supabase client) so
 * it can be imported by both the generate-proposals edge function (Deno,
 * relative .ts import — same pattern as
 * supabase/functions/proxy-anthropic/index.ts importing src/lib/aiLimits.ts)
 * and by vitest unit tests under tests/lib/.
 *
 * Strike selection and the earnings-window check are injected functions (see
 * StrikeSelector / EarningsChecker) so a real option-chain lookup
 * (supabase/functions/_shared/tradierClient.ts) and a real earnings calendar
 * (supabase/functions/_shared/finnhubClient.ts) can be swapped in by the
 * caller without touching the gate/candidate logic here — tests inject
 * fakes the same way.
 */

import type { StrikeSelectionMethod } from "./strikeSelector";
import type { EarningsGateStatus } from "./earningsGate";

export type { EarningsGateStatus } from "./earningsGate";
export type { StrikeSelectionMethod } from "./strikeSelector";

// ── Schema-aligned types (mirror the `proposals` / `proposal_events` table
// contract from docs/relaunch-plan-2026-07.md Phase 2 WS2 brief — WS1 owns
// the migration on another branch) ─────────────────────────────────────────

export type ProposalStructure = "covered_call";

/** Statuses that count as "live risk" for the coverage + open-risk guards —
 * mirrors bildof_flow_cloud.py's status tuple ("approved", "placed_unverified",
 * "executed") adapted to this schema's status vocabulary. */
export const LIVE_RISK_STATUSES = ["approved", "executing", "executed"] as const;
export type LiveRiskStatus = (typeof LIVE_RISK_STATUSES)[number];

/** Statuses that count toward the per-user max-pending-proposals guard. */
export const PENDING_STATUSES = ["pending"] as const;

export interface EquityHolding {
  ticker: string;
  sharesHeld: number;
  avgPrice: number;
  marketValue: number;
}

/** Minimal shape of an existing proposal row needed by the pure gates below.
 * Not the full `proposals` table row — just the fields the engine reads. */
export interface OpenProposal {
  ticker: string;
  structure: ProposalStructure;
  expiry: string; // ISO date (YYYY-MM-DD)
  strike: number;
  qty: number;
  maxLossUsd: number | null;
  collateralUsd: number | null;
  status: string;
}

export interface RejectionDetail {
  reason: string;
  [key: string]: unknown;
}

export type GateResult =
  | { ok: true }
  | { ok: false; reason: string; detail: RejectionDetail };

// ── Injected dependencies (real implementations live in
// supabase/functions/_shared/{tradierClient,finnhubClient}.ts) ─────────────

export interface StrikeSelectorParams {
  ticker: string;
  spot: number;
  /** Holding's average cost basis, or null when unknown. */
  costBasis: number | null;
  /** ISO date (YYYY-MM-DD), injected for testability rather than `new Date()`. */
  today: string;
}

export interface StrikeSelectorResult {
  strike: number;
  expiry: string;
  delta: number | null;
  bid: number;
  method: StrikeSelectionMethod;
  /** Where this strike came from — recorded to proposal_signals so a
   * proposal's provenance is auditable (e.g. "tradier" vs "stub"). */
  chainSource: string;
}

/** Strike selector — returns null when nothing in the chain clears the gates
 * (no chain data, no expiry in range, bid too low, etc.); the candidate
 * builder treats null as "reject this holding with no_valid_strike". */
export type StrikeSelector = (params: StrikeSelectorParams) => Promise<StrikeSelectorResult | null>;

export const DEFAULT_OTM_PCT = 0.05;

/** Default expiry: 30 days out from `today` (injected, not `new Date()`, so
 * this stays deterministic in tests). */
function defaultExpiryIsoPlus30d(today: string): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString().slice(0, 10);
}

/** Fallback strike selector — 5% OTM from spot, rounded to the nearest whole
 * dollar. Used when no real chain data is available; the caller should
 * prefer a real chain-backed StrikeSelector (tradierStrikeSelector) whenever
 * one is configured. Marked 'stub' as its chainSource so a proposal built
 * from this fallback is auditable. */
export const stubStrikeSelector: StrikeSelector = async (params) => ({
  strike: Math.round(params.spot * (1 + DEFAULT_OTM_PCT)),
  expiry: defaultExpiryIsoPlus30d(params.today),
  delta: null,
  bid: 0,
  method: "otm_fallback",
  chainSource: "stub",
});

/** Earnings-window checker — swappable so a real earnings calendar
 * (finnhubEarningsChecker) can replace the always-clear stub without the
 * gate composition below ever changing. Fail-open by contract: 'unknown'
 * must never be treated as 'blocked' by callers. */
export type EarningsChecker = (params: {
  ticker: string;
  today: string;
  expiry: string;
}) => Promise<EarningsGateStatus>;

export const stubEarningsChecker: EarningsChecker = async () => "clear";

// ── Structural fingerprint (dedup) ──────────────────────────────────────────

/** Structural fingerprint for a candidate/proposal — same underlying +
 * structure + expiry + strike is the same proposed trade. Ported from
 * bildof_flow_cloud.py::_fingerprint (that version also handles
 * put_credit_spread's two-leg strikes; v1 here is covered-call only, so the
 * strike is a single number). */
export function fingerprint(t: {
  ticker: string;
  structure: ProposalStructure;
  expiry: string;
  strike: number;
}): string {
  return [t.ticker.toUpperCase(), t.structure, t.expiry, t.strike].join("|");
}

/** True if a candidate's fingerprint already exists among a set of existing
 * (typically: pending) proposals — the caller should skip staging it again. */
export function isDuplicateCandidate(
  candidate: { ticker: string; structure: ProposalStructure; expiry: string; strike: number },
  existing: OpenProposal[],
): boolean {
  const fp = fingerprint(candidate);
  return existing.some(
    (p) => fingerprint({ ticker: p.ticker, structure: p.structure, expiry: p.expiry, strike: p.strike }) === fp,
  );
}

// ── Coverage guard (covered-call contracts already written) ────────────────

/** Per-ticker count of covered-call contracts already written (open live-risk
 * proposals, unexpired legs) — ported from bildof_flow_cloud.py::
 * _open_cc_contracts. The CC candidate builder must subtract this from
 * `sharesHeld // 100` or a second approval over-writes shares into a naked
 * call (the exact bug the ported comment documents: 2026-07-21 SMR, x2
 * staged while x1 was already short against the same 200 shares). */
export function openCoveredCallContracts(
  openProposals: OpenProposal[],
  today: string, // ISO date, injected for testability rather than `new Date()` inline
): Record<string, number> {
  const written: Record<string, number> = {};
  for (const p of openProposals) {
    if (p.structure !== "covered_call") continue;
    if (!LIVE_RISK_STATUSES.includes(p.status as LiveRiskStatus)) continue;
    if (p.expiry < today) continue; // expired legs no longer hold coverage
    const key = p.ticker.toUpperCase();
    written[key] = (written[key] ?? 0) + p.qty;
  }
  return written;
}

/** Contracts available to write for one holding = shares_held // 100 minus
 * contracts already written and still live. Never negative. */
export function availableCoverageContracts(
  sharesHeld: number,
  alreadyWrittenContracts: number,
): number {
  const total = Math.floor(sharesHeld / 100);
  return Math.max(0, total - alreadyWrittenContracts);
}

// ── Open-risk ledger (per-name cap) ─────────────────────────────────────────

/** Per-ticker open risk in dollars, summed from live-risk proposals with
 * unexpired legs — ported from bildof_flow_cloud.py::_open_name_risk_usd.
 * Uses maxLossUsd when present, else collateralUsd (matches the ported
 * fallback: `amt = t.max_loss_usd ?? t.collateral_usd ?? 0`). For a covered
 * call, "risk" in the open-risk-cap sense is the notional the strike
 * represents (strike * 100 * qty) since that's the capital the position
 * exposes to assignment/opportunity cost — the caller passes that in via
 * maxLossUsd/collateralUsd rather than this function inferring it, keeping
 * this function structure-agnostic like the original. */
export function openNameRiskUsd(
  openProposals: OpenProposal[],
  today: string,
): Record<string, number> {
  const risk: Record<string, number> = {};
  for (const p of openProposals) {
    if (!LIVE_RISK_STATUSES.includes(p.status as LiveRiskStatus)) continue;
    if (p.expiry < today) continue;
    const amt = p.maxLossUsd ?? p.collateralUsd ?? 0;
    const key = p.ticker.toUpperCase();
    risk[key] = (risk[key] ?? 0) + amt;
  }
  return risk;
}

/** Per-name open-risk cap gate — candidate's own risk + already-open risk for
 * that name must stay under `capPct` (default 10%, matches the vault's
 * per-name-cap convention already used across the trading stack) of account
 * equity. Returns a GateResult carrying an explicit reason on rejection (the
 * quality_pcs.py::select_pcs_spread diag pattern — every rejection carries a
 * reason, never a bare `null`/`false`). */
export function checkPerNameRiskCap(params: {
  ticker: string;
  candidateRiskUsd: number;
  accountEquityUsd: number;
  openRiskByTicker: Record<string, number>;
  capPct?: number;
}): GateResult {
  const capPct = params.capPct ?? 0.1;
  if (params.accountEquityUsd <= 0) {
    return {
      ok: false,
      reason: "no_account_equity",
      detail: { reason: "no_account_equity", accountEquityUsd: params.accountEquityUsd },
    };
  }
  const existing = params.openRiskByTicker[params.ticker.toUpperCase()] ?? 0;
  const projected = existing + params.candidateRiskUsd;
  const cap = params.accountEquityUsd * capPct;
  if (projected > cap) {
    return {
      ok: false,
      reason: "per_name_risk_cap_exceeded",
      detail: {
        reason: "per_name_risk_cap_exceeded",
        ticker: params.ticker,
        existingRiskUsd: existing,
        candidateRiskUsd: params.candidateRiskUsd,
        projectedRiskUsd: projected,
        capUsd: cap,
        capPct,
      },
    };
  }
  return { ok: true };
}

// ── Max pending proposals guard ─────────────────────────────────────────────

export function checkMaxPendingProposals(params: {
  currentPendingCount: number;
  maxPending?: number;
}): GateResult {
  const maxPending = params.maxPending ?? 3;
  if (params.currentPendingCount >= maxPending) {
    return {
      ok: false,
      reason: "max_pending_proposals_reached",
      detail: {
        reason: "max_pending_proposals_reached",
        currentPendingCount: params.currentPendingCount,
        maxPending,
      },
    };
  }
  return { ok: true };
}

// ── Kill switch guard ────────────────────────────────────────────────────

export function checkKillSwitch(killSwitchEnabled: boolean): GateResult {
  if (killSwitchEnabled) {
    return {
      ok: false,
      reason: "kill_switch_engaged",
      detail: { reason: "kill_switch_engaged" },
    };
  }
  return { ok: true };
}

// ── Coverage guard as a GateResult (wraps availableCoverageContracts) ──────

export function checkCoverageAvailable(params: {
  sharesHeld: number;
  alreadyWrittenContracts: number;
}): GateResult {
  const available = availableCoverageContracts(params.sharesHeld, params.alreadyWrittenContracts);
  if (available < 1) {
    return {
      ok: false,
      reason: "no_coverage_available",
      detail: {
        reason: "no_coverage_available",
        sharesHeld: params.sharesHeld,
        alreadyWrittenContracts: params.alreadyWrittenContracts,
        maxContracts: Math.floor(params.sharesHeld / 100),
      },
    };
  }
  return { ok: true };
}

export function checkMinimumShares(sharesHeld: number): GateResult {
  if (sharesHeld < 100) {
    return {
      ok: false,
      reason: "below_100_share_lot",
      detail: { reason: "below_100_share_lot", sharesHeld },
    };
  }
  return { ok: true };
}

// ── Candidate builder ────────────────────────────────────────────────────

export interface CoveredCallCandidate {
  ticker: string;
  structure: "covered_call";
  strike: number;
  expiry: string;
  contracts: number;
  rationale: string;
  /** Chain/greeks provenance — recorded to proposal_signals by the caller. */
  delta: number | null;
  bid: number;
  strikeMethod: StrikeSelectionMethod;
  strikeSource: string;
  earningsStatus: EarningsGateStatus;
}

export interface CandidateRejection {
  ticker: string;
  reason: string;
  detail: RejectionDetail;
}

export interface BuildCandidatesResult {
  candidates: CoveredCallCandidate[];
  rejections: CandidateRejection[];
}

/**
 * Build covered-call candidates for one user's holdings.
 *
 * Every gate rejection is recorded with an explicit reason (never a silent
 * skip) — the caller (the edge function) is expected to write each rejection
 * to `proposal_events` with event='candidate_rejected'.
 *
 * Gate order (first failing gate wins, matches the ported bildof pattern of
 * short-circuiting on the first disqualifying check rather than running every
 * gate and reporting all failures):
 *   1. minimum 100-share lot
 *   2. coverage available (shares_held // 100 - already-written contracts)
 *   3. strike selection (no_valid_strike if the selector returns null)
 *   4. duplicate fingerprint vs existing pending proposals (needs the real,
 *      selected expiry+strike, so this runs AFTER strike selection)
 *   5. earnings-window gate (needs the real, selected expiry, so this also
 *      runs after strike selection; 'unknown' does NOT block — fail-open)
 *   6. per-name open-risk cap
 */
export async function buildCoveredCallCandidates(params: {
  holdings: EquityHolding[];
  openProposals: OpenProposal[];
  accountEquityUsd: number;
  today: string; // ISO date, injected for testability
  strikeSelector?: StrikeSelector;
  earningsChecker?: EarningsChecker;
  perNameCapPct?: number;
}): Promise<BuildCandidatesResult> {
  const strikeSelector = params.strikeSelector ?? stubStrikeSelector;
  const earningsChecker = params.earningsChecker ?? stubEarningsChecker;
  const writtenByTicker = openCoveredCallContracts(params.openProposals, params.today);
  const riskByTicker = openNameRiskUsd(params.openProposals, params.today);
  const pendingProposals = params.openProposals.filter((p) => PENDING_STATUSES.includes(p.status as "pending"));

  const candidates: CoveredCallCandidate[] = [];
  const rejections: CandidateRejection[] = [];

  for (const holding of params.holdings) {
    const ticker = holding.ticker.toUpperCase();

    const minSharesGate = checkMinimumShares(holding.sharesHeld);
    if (!minSharesGate.ok) {
      rejections.push({ ticker, reason: minSharesGate.reason, detail: minSharesGate.detail });
      continue;
    }

    const alreadyWritten = writtenByTicker[ticker] ?? 0;
    const coverageGate = checkCoverageAvailable({
      sharesHeld: holding.sharesHeld,
      alreadyWrittenContracts: alreadyWritten,
    });
    if (!coverageGate.ok) {
      rejections.push({ ticker, reason: coverageGate.reason, detail: coverageGate.detail });
      continue;
    }

    const spot = holding.sharesHeld > 0 ? holding.marketValue / holding.sharesHeld : 0;
    if (spot <= 0) {
      rejections.push({
        ticker,
        reason: "no_spot_price",
        detail: { reason: "no_spot_price", marketValue: holding.marketValue, sharesHeld: holding.sharesHeld },
      });
      continue;
    }

    const costBasis = holding.avgPrice > 0 ? holding.avgPrice : null;
    const selection = await strikeSelector({ ticker, spot, costBasis, today: params.today });
    if (!selection) {
      rejections.push({
        ticker,
        reason: "no_valid_strike",
        detail: { reason: "no_valid_strike", spot, costBasis },
      });
      continue;
    }
    const { strike, expiry, delta, bid, method, chainSource } = selection;
    const contracts = availableCoverageContracts(holding.sharesHeld, alreadyWritten);

    if (isDuplicateCandidate({ ticker, structure: "covered_call", expiry, strike }, pendingProposals)) {
      rejections.push({
        ticker,
        reason: "duplicate_fingerprint",
        detail: { reason: "duplicate_fingerprint", structure: "covered_call", expiry, strike },
      });
      continue;
    }

    const earningsStatus = await earningsChecker({ ticker, today: params.today, expiry });
    if (earningsStatus === "blocked") {
      rejections.push({
        ticker,
        reason: "earnings_window_blocked",
        detail: { reason: "earnings_window_blocked", expiry },
      });
      continue;
    }
    // "unknown" falls through deliberately — fail-open with disclosure. The
    // caller records earningsStatus in proposal_signals and logs an
    // 'earnings_unknown' event; this function never blocks on it.

    // Notional the strike represents — used as the open-risk-cap basis for a
    // covered call (see openNameRiskUsd doc comment: the risk-cap sense of
    // "risk" here is the exposed notional, not a defined max-loss dollar
    // figure, since assignment risk on a covered call is opportunity cost,
    // not capital loss).
    const candidateRiskUsd = strike * 100 * contracts;
    const riskGate = checkPerNameRiskCap({
      ticker,
      candidateRiskUsd,
      accountEquityUsd: params.accountEquityUsd,
      openRiskByTicker: riskByTicker,
      capPct: params.perNameCapPct,
    });
    if (!riskGate.ok) {
      rejections.push({ ticker, reason: riskGate.reason, detail: riskGate.detail });
      continue;
    }

    candidates.push({
      ticker,
      structure: "covered_call",
      strike,
      expiry,
      contracts,
      rationale: buildRationale({
        ticker,
        sharesHeld: holding.sharesHeld,
        alreadyWritten,
        contracts,
        strike,
        expiry,
        delta,
        bid,
        method,
        earningsStatus,
      }),
      delta,
      bid,
      strikeMethod: method,
      strikeSource: chainSource,
      earningsStatus,
    });
  }

  return { candidates, rejections };
}

/** Human-readable why-this-trade text attached to the proposal row. */
export function buildRationale(params: {
  ticker: string;
  sharesHeld: number;
  alreadyWritten: number;
  contracts: number;
  strike: number;
  expiry: string;
  delta: number | null;
  bid: number;
  method: StrikeSelectionMethod;
  earningsStatus: EarningsGateStatus;
}): string {
  const coverageLine =
    params.alreadyWritten > 0
      ? `${params.sharesHeld} shares held, ${params.alreadyWritten} contract(s) already written, ${params.contracts} available`
      : `${params.sharesHeld} shares held, ${params.contracts} contract(s) available (${Math.floor(params.sharesHeld / 100)} lots, none written yet)`;
  const strikeLine =
    params.method === "delta_band" && params.delta != null
      ? `${params.method.replace("_", " ")}, delta ${params.delta.toFixed(2)}, bid $${params.bid.toFixed(2)}`
      : `${params.method.replace("_", " ")}, bid $${params.bid.toFixed(2)} (no greeks on chain)`;
  const earningsLine =
    params.earningsStatus === "unknown"
      ? " Earnings calendar unavailable for this window — verify manually before approving."
      : "";
  return (
    `Covered call on ${params.ticker}: ${coverageLine}. ` +
    `Sell ${params.contracts}x ${params.strike} call exp ${params.expiry} (${strikeLine}). ` +
    `Passed coverage guard, duplicate check, earnings gate, and per-name open-risk cap.${earningsLine}`
  );
}
