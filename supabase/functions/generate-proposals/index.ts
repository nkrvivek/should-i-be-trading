/**
 * generate-proposals — Phase 2 workstream 2 (docs/relaunch-plan-2026-07.md).
 *
 * Covered-call candidate builder v1: reads a user's SnapTrade holdings,
 * applies the ported gates (per-name open-risk cap, CC coverage guard,
 * duplicate-fingerprint dedup, max-pending-proposals, kill switch), and
 * stages surviving candidates into `proposals` for human-in-the-loop
 * approval. Every rejection is recorded to `proposal_events` with an
 * explicit reason — the diag pattern ported from
 * autopilot-experiment/strategies/quality_pcs.py::select_pcs_spread.
 *
 * NOT deployable yet: `proposals` / `proposal_events` / `execution_settings`
 * don't exist until workstream 1's migration lands (owned on another
 * branch, per this workstream's brief — this function was built against
 * the schema contract in docs/relaunch-plan-2026-07.md, not a live table).
 *
 * Credential model (v1, matches broker-snaptrade/index.ts's existing
 * contract): SnapTrade userId/userSecret are NOT stored server-side yet —
 * broker-snaptrade/index.ts already requires the client to pass them on
 * every call (they currently live in the browser's encrypted localStorage,
 * see src/stores/brokerStore.ts). This function accepts the same
 * snaptradeUserId/snaptradeUserSecret/accountId in its request body rather
 * than inventing a new server-side broker-credential table — that's a
 * bigger architectural change (needed for a true background/cron trigger)
 * better scoped to its own workstream. TODO(later workstream): once a
 * server-side broker-connection store exists (schema contract's
 * execution_settings.broker_connection_id implies one is coming), swap this
 * for a lookup instead of trusting the request body.
 *
 * Strike selection and the earnings-window gate are injected functions in
 * src/lib/proposalEngine.ts (StrikeSelector / EarningsChecker) — this
 * function wires the real, chain-backed implementations
 * (_shared/tradierClient.ts / _shared/finnhubClient.ts) rather than the
 * always-clear/always-OTM stubs, which remain in proposalEngine.ts only as
 * the default parameter and as test fakes.
 */

import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";
import { sanitizeError } from "../_shared/sanitize.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildCoveredCallCandidates,
  type EquityHolding,
  type OpenProposal,
  type CandidateRejection,
  type CoveredCallCandidate,
} from "../../../src/lib/proposalEngine.ts";
import {
  getSnapTradePositions,
  getSnapTradeBalances,
  type SnapTradePositionRaw,
} from "../_shared/snaptradeClient.ts";
import { tradierStrikeSelector, fetchTradierQuote } from "../_shared/tradierClient.ts";
import { finnhubEarningsChecker } from "../_shared/finnhubClient.ts";
import { checkPaperActionBudget, isPaperTickerAllowed, FREE_PAPER_DAILY_ACTIONS } from "../../../src/lib/paperLimits.ts";
import type { UserTier } from "../../../src/stores/authStore.ts";

// ── Feature gate ─────────────────────────────────────────────────────────
// Tiers allowed to use the proposal engine. src/lib/featureGates.ts is the
// CLIENT-SIDE mirror of this gate (UI hides the feature for lower tiers) —
// this server-side check is the one that actually matters for security.
// "copilot" is the Phase 2 execution tier decided in docs/relaunch-plan-
// 2026-07.md (Decisions #1) but is NOT yet a valid `profiles.tier` value in
// the current DB constraint (migration 008_starter_tier.sql only allows
// free/starter/pro/enterprise) — workstream 1 owns extending that
// constraint. Left in this list now so the gate needs no further edits once
// the migration lands.
const ALLOWED_TIERS = ["pro", "copilot", "enterprise"];

async function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function getUserTier(supabase: ReturnType<typeof createClient>, userId: string): Promise<string | null> {
  const { data, error } = await supabase.from("profiles").select("tier").eq("id", userId).single();
  if (error || !data) return null;
  return (data as { tier: string }).tier;
}

// ── SnapTrade position -> pure EquityHolding mapping ────────────────────

/** SnapTrade option positions carry a "oo" (option) symbol.type.code —
 * everything else (common stock "cs", ETPs "et", etc.) is treated as an
 * equity holding for v1. Covered calls only make sense on equities/ETPs. */
function isOptionPosition(p: SnapTradePositionRaw): boolean {
  return p.symbol?.symbol?.type?.code === "oo";
}

function mapPositionsToHoldings(positions: SnapTradePositionRaw[]): EquityHolding[] {
  const holdings: EquityHolding[] = [];
  for (const p of positions) {
    if (isOptionPosition(p)) continue;
    const ticker = p.symbol?.symbol?.symbol;
    if (!ticker) continue;
    const sharesHeld = p.units ?? 0;
    const price = p.price ?? 0;
    holdings.push({
      ticker,
      sharesHeld,
      avgPrice: p.average_purchase_price ?? 0,
      marketValue: price * sharesHeld,
    });
  }
  return holdings;
}

// ── proposals row <-> OpenProposal mapping ──────────────────────────────

interface ProposalRow {
  id: string;
  ticker: string;
  structure: string;
  legs: Array<{ strike?: number }> | null;
  qty: number;
  expiry: string;
  max_loss_usd: number | null;
  collateral_usd: number | null;
  status: string;
}

function mapRowToOpenProposal(row: ProposalRow): OpenProposal {
  return {
    ticker: row.ticker,
    structure: row.structure as OpenProposal["structure"],
    expiry: row.expiry,
    strike: row.legs?.[0]?.strike ?? 0,
    qty: row.qty,
    maxLossUsd: row.max_loss_usd,
    collateralUsd: row.collateral_usd,
    status: row.status,
  };
}

// ── Candidate -> proposals insert row ───────────────────────────────────

function candidateToInsertRow(userId: string, c: CoveredCallCandidate, expiresAt: string, mode: "paper" | "live") {
  return {
    user_id: userId,
    mode,
    ticker: c.ticker,
    structure: c.structure,
    legs: [{ action: "SELL_TO_OPEN", right: "C", strike: c.strike }],
    qty: c.contracts,
    expiry: c.expiry,
    // Net credit = quoted bid * 100 * contracts. A conservative estimate —
    // the real fill price at execution time is re-verified live (R20 in the
    // vault's execution-playbook), this is the credit the proposal was
    // built against.
    net_credit_usd: c.bid * 100 * c.contracts,
    // A covered call's downside isn't a defined max-loss dollar figure
    // (assignment is opportunity cost, not capital loss) — left null.
    max_loss_usd: null,
    // Notional the strike represents (strike * 100 * qty) — used as the
    // open-risk-cap basis for this structure (see proposalEngine.ts
    // openNameRiskUsd doc comment).
    collateral_usd: c.strike * 100 * c.contracts,
    rationale: c.rationale,
    // Chain/greeks provenance + earnings-gate disclosure, so a proposal's
    // strike selection and earnings coverage are auditable after the fact.
    proposal_signals: {
      strike_source: c.strikeSource,
      strike_method: c.strikeMethod,
      delta: c.delta,
      bid: c.bid,
      earnings_status: c.earningsStatus,
    },
    council_verdict: null,
    status: "pending",
    approved_at: null,
    approved_via: null,
    expires_at: expiresAt,
  };
}

// ── Fire-and-forget council-verdict invocation ──────────────────────────
// WS4 (docs/relaunch-plan-2026-07.md): every newly staged proposal
// immediately gets a 5-persona council verdict. This call must never make
// generate-proposals itself fail -- it isn't awaited by the candidate-
// insertion loop, and every failure path here writes a proposal_events row
// instead of throwing. `EdgeRuntime.waitUntil` (when available, i.e. when
// actually running under Supabase's Deno Deploy runtime rather than a local
// test harness) keeps the request alive long enough for this background
// call to finish after the response has already been returned to the
// caller -- without it, Deno Deploy can tear the isolate down the moment
// the response is sent.
function invokeCouncilVerdict(
  svc: ReturnType<typeof createClient>,
  userId: string,
  proposalId: string,
): void {
  const task = (async () => {
    try {
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/council-verdict`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ proposal_id: proposalId }),
      });
      if (!resp.ok) {
        const respText = await resp.text().catch(() => "");
        await svc.from("proposal_events").insert({
          proposal_id: proposalId,
          user_id: userId,
          event: "council_invoke_failed",
          detail: { reason: "non_ok_response", status: resp.status, body: respText.slice(0, 500) },
        });
      }
    } catch (err) {
      await svc.from("proposal_events").insert({
        proposal_id: proposalId,
        user_id: userId,
        event: "council_invoke_failed",
        detail: { reason: "fetch_error", error: err instanceof Error ? err.message : String(err) },
      });
    }
  })();

  const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } })
    .EdgeRuntime;
  edgeRuntime?.waitUntil?.(task);
}

// ── Paper mode: paper_positions -> pure EquityHolding mapping ───────────
// Paper positions have no live price of their own (only qty/avg_price), so
// the spot price used for strike selection comes from a live Tradier quote,
// falling back to avg_price if the quote fetch fails — same fail-soft
// posture as the starter-portfolio seeding in paperAccountDefaults.ts, since
// generate-proposals must still work for a user whose Tradier quote is
// momentarily unavailable rather than hard-failing the whole call.
//
// An OCC option symbol is always longer than a plain equity ticker (6+
// chars padded root alone), so `symbol.length > 6` reliably distinguishes a
// held short option leg (not eligible to be an equity holding) from an
// equity ticker. Only long (qty > 0) equity rows are covered-call
// candidates — v1 doesn't build proposals against a short option position.
interface PaperPositionRow {
  symbol: string;
  qty: number;
  avg_price: number;
}

interface PaperAccountRow {
  cash_usd: number;
}

function mapPaperPositionsToHoldings(
  positions: PaperPositionRow[],
  quotes: Record<string, number>,
): EquityHolding[] {
  const holdings: EquityHolding[] = [];
  for (const p of positions) {
    if (p.symbol.length > 6 || p.qty <= 0) continue;
    const price = quotes[p.symbol.toUpperCase()] ?? p.avg_price;
    holdings.push({
      ticker: p.symbol,
      sharesHeld: p.qty,
      avgPrice: p.avg_price,
      marketValue: price * p.qty,
    });
  }
  return holdings;
}

/** Paper-mode proposal generation: everyone authenticated can use it
 * (paper_trading is a free-tier feature — see src/lib/featureGates.ts), but
 * the free tier is capped on both a daily action budget and a 20-ticker
 * allowlist (src/lib/paperLimits.ts). Holdings come from the user's own
 * paper_positions/paper_accounts rows, never SnapTrade. */
async function handlePaperGenerate(
  svc: ReturnType<typeof createClient>,
  userId: string,
  tier: UserTier | undefined,
  req: Request,
): Promise<Response> {
  // ── 1. Daily action budget (atomic, Postgres is authoritative) ─────
  const dailyLimit = checkPaperActionBudget(0, tier).limit; // null for paid tiers
  const today = new Date().toISOString().slice(0, 10);
  const { data: usageResult, error: usageErr } = await svc.rpc("increment_paper_action_usage", {
    p_user_id: userId,
    p_usage_date: today,
    p_daily_limit: dailyLimit,
  });
  if (usageErr) {
    return errorResponse(`Failed to check paper action budget: ${usageErr.message}`, 500, req);
  }
  if (typeof usageResult === "number" && usageResult < 0) {
    await svc.from("proposal_events").insert({
      proposal_id: null,
      user_id: userId,
      event: "candidate_rejected",
      detail: { ticker: "*", reason: "paper_action_budget_exceeded", dailyLimit: FREE_PAPER_DAILY_ACTIONS },
    });
    return errorResponse(
      `Daily paper-trading action limit (${FREE_PAPER_DAILY_ACTIONS}/day) reached. Upgrade for unlimited paper trading.`,
      429,
      req,
    );
  }

  // ── 2. Paper account + positions (no SnapTrade in paper mode) ──────
  const [{ data: accountRow }, { data: positionRows }] = await Promise.all([
    svc.from("paper_accounts").select("cash_usd").eq("user_id", userId).maybeSingle(),
    svc.from("paper_positions").select("symbol, qty, avg_price").eq("user_id", userId),
  ]);
  if (!accountRow) {
    return errorResponse(
      "No paper trading account yet — call provision-paper-account first.",
      400,
      req,
    );
  }
  const account = accountRow as PaperAccountRow;
  const positions = (positionRows ?? []) as PaperPositionRow[];

  // ── 3. Ticker allowlist filter (free tier only) ────────────────────
  const rejectionsToRecord: CandidateRejection[] = [];
  const allowedPositions = positions.filter((p) => {
    if (p.symbol.length > 6) return true; // not an equity holding, unrelated to the allowlist
    const allowed = isPaperTickerAllowed(p.symbol, tier);
    if (!allowed) {
      rejectionsToRecord.push({
        ticker: p.symbol,
        reason: "ticker_not_allowed",
        detail: { reason: "ticker_not_allowed" },
      });
    }
    return allowed;
  });

  // ── 4. Live quotes for spot price (fail-soft to avg_price) ─────────
  const equitySymbols = [...new Set(allowedPositions.filter((p) => p.symbol.length <= 6 && p.qty > 0).map((p) => p.symbol))];
  const quoteEntries = await Promise.all(
    equitySymbols.map(async (symbol) => [symbol.toUpperCase(), await fetchTradierQuote(symbol)] as const),
  );
  const quotes: Record<string, number> = {};
  for (const [symbol, quote] of quoteEntries) {
    if (quote) quotes[symbol] = quote.last;
  }
  const holdings = mapPaperPositionsToHoldings(allowedPositions, quotes);

  // Simple mark-to-market equity total for the per-name risk-cap basis —
  // paper mode has no separate "balances" endpoint the way SnapTrade does,
  // so account equity is just cash plus the marked value of every holding.
  const accountEquityUsd = account.cash_usd + holdings.reduce((sum, h) => sum + h.marketValue, 0);

  // ── 5. Existing paper proposals for this user (gates + dedup) ──────
  const { data: existingRows, error: existingErr } = await svc
    .from("proposals")
    .select("id, ticker, structure, legs, qty, expiry, max_loss_usd, collateral_usd, status")
    .eq("user_id", userId)
    .eq("mode", "paper")
    .in("status", ["pending", "approved", "executing", "executed"]);
  if (existingErr) {
    return errorResponse(`Failed to read existing paper proposals: ${existingErr.message}`, 500, req);
  }
  const openProposals: OpenProposal[] = ((existingRows ?? []) as ProposalRow[]).map(mapRowToOpenProposal);
  const pendingCount = openProposals.filter((p) => p.status === "pending").length;

  const nowMs = Date.now();
  const expiresAt = new Date(nowMs + 24 * 60 * 60 * 1000).toISOString();

  let candidates: CoveredCallCandidate[] = [];
  const MAX_PENDING = 3;
  if (pendingCount >= MAX_PENDING) {
    rejectionsToRecord.push({
      ticker: "*",
      reason: "max_pending_proposals_reached",
      detail: { reason: "max_pending_proposals_reached", currentPendingCount: pendingCount, maxPending: MAX_PENDING },
    });
  } else {
    const result = await buildCoveredCallCandidates({
      holdings,
      openProposals,
      accountEquityUsd,
      today,
      strikeSelector: tradierStrikeSelector,
      earningsChecker: finnhubEarningsChecker,
    });
    candidates = result.candidates;
    rejectionsToRecord.push(...result.rejections);
  }

  // ── 6. Insert surviving candidates ──────────────────────────────────
  const created: Array<{ id: string; ticker: string; strike: number; expiry: string; contracts: number }> = [];
  for (const c of candidates) {
    const row = candidateToInsertRow(userId, c, expiresAt, "paper");
    const { data: inserted, error: insertErr } = await svc.from("proposals").insert(row).select("id").single();
    if (insertErr || !inserted) {
      rejectionsToRecord.push({
        ticker: c.ticker,
        reason: "insert_failed",
        detail: { reason: "insert_failed", error: insertErr?.message ?? "unknown" },
      });
      continue;
    }
    const proposalId = (inserted as { id: string }).id;
    created.push({ id: proposalId, ticker: c.ticker, strike: c.strike, expiry: c.expiry, contracts: c.contracts });
    await svc.from("proposal_events").insert({
      proposal_id: proposalId,
      user_id: userId,
      event: "proposal_created",
      detail: { ticker: c.ticker, structure: c.structure, strike: c.strike, expiry: c.expiry, contracts: c.contracts, mode: "paper" },
    });
    if (c.earningsStatus === "unknown") {
      await svc.from("proposal_events").insert({
        proposal_id: proposalId,
        user_id: userId,
        event: "earnings_unknown",
        detail: { ticker: c.ticker, expiry: c.expiry },
      });
    }
    invokeCouncilVerdict(svc, userId, proposalId);
  }

  // ── 7. Record every rejection ────────────────────────────────────────
  for (const r of rejectionsToRecord) {
    await svc.from("proposal_events").insert({
      proposal_id: null,
      user_id: userId,
      event: "candidate_rejected",
      detail: { ticker: r.ticker, reason: r.reason, ...r.detail },
    });
  }

  return jsonResponse(
    {
      created,
      rejected: rejectionsToRecord.map((r) => ({ ticker: r.ticker, reason: r.reason })),
    },
    200,
    req,
  );
}

// ── Edge function entry point ───────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const auth = await authenticateRequest(req);

    const contentLength = parseInt(req.headers.get("content-length") || "0");
    if (contentLength > 50000) {
      return errorResponse("Request too large", 413, req);
    }

    const body = await req.json().catch(() => ({}));
    const {
      mode: rawMode,
      accountId,
      snaptradeUserId,
      snaptradeUserSecret,
    } = body as {
      mode?: string;
      accountId?: string;
      snaptradeUserId?: string;
      snaptradeUserSecret?: string;
    };

    // Paper mode is the default (relaunch 2026-07-21): the free-tier funnel,
    // no broker credentials needed. Live mode is unchanged below and keeps
    // requiring accountId/snaptradeUserId/snaptradeUserSecret.
    const mode: "paper" | "live" = rawMode === "live" ? "live" : "paper";

    const svc = await getServiceClient();

    if (mode === "paper") {
      const tier = (await getUserTier(svc, auth.userId)) as UserTier | null;
      return await handlePaperGenerate(svc, auth.userId, tier ?? undefined, req);
    }

    if (!accountId || !snaptradeUserId || !snaptradeUserSecret) {
      return errorResponse("Missing accountId, snaptradeUserId, or snaptradeUserSecret", 400, req);
    }
    const ACCOUNT_ID_RE = /^[a-zA-Z0-9-]{1,64}$/;
    if (!ACCOUNT_ID_RE.test(accountId)) {
      return errorResponse("Invalid account ID format", 400, req);
    }

    // ── 1. Feature gate (live mode only — paper mode is gated above) ──
    const tier = await getUserTier(svc, auth.userId);
    if (!tier || !ALLOWED_TIERS.includes(tier)) {
      return errorResponse("Your plan does not include proposal generation. Upgrade to Pro or Copilot.", 403, req);
    }

    // ── 2. Fetch execution settings (kill switch) ───────────────────
    const { data: settingsRow } = await svc
      .from("execution_settings")
      .select("kill_switch")
      .eq("user_id", auth.userId)
      .maybeSingle();
    // No row yet = defaults off (matches the "defaulting off" posture in
    // docs/relaunch-plan-2026-07.md Decisions #2 for auto-execution — the
    // kill switch itself defaults to NOT engaged when unset).
    const killSwitchEngaged = Boolean((settingsRow as { kill_switch?: boolean } | null)?.kill_switch);

    // ── 3. Fetch SnapTrade holdings + account equity ────────────────
    const [positions, balances] = await Promise.all([
      getSnapTradePositions(snaptradeUserId, snaptradeUserSecret, accountId),
      getSnapTradeBalances(snaptradeUserId, snaptradeUserSecret, accountId),
    ]);
    const holdings = mapPositionsToHoldings(positions);
    // Fails closed: if the balance endpoint doesn't return total equity, the
    // per-name risk cap gate (accountEquityUsd <= 0) rejects everything
    // rather than sizing risk against an unknown account value.
    const accountEquityUsd = balances?.total_value?.value ?? 0;

    // ── 4. Fetch existing proposals for this user (gates + dedup) ───
    const { data: existingRows, error: existingErr } = await svc
      .from("proposals")
      .select("id, ticker, structure, legs, qty, expiry, max_loss_usd, collateral_usd, status")
      .eq("user_id", auth.userId)
      .in("status", ["pending", "approved", "executing", "executed"]);
    if (existingErr) {
      return errorResponse(`Failed to read existing proposals: ${existingErr.message}`, 500, req);
    }
    const openProposals: OpenProposal[] = ((existingRows ?? []) as ProposalRow[]).map(mapRowToOpenProposal);
    const pendingCount = openProposals.filter((p) => p.status === "pending").length;

    const today = new Date().toISOString().slice(0, 10);
    const nowMs = Date.now();
    const expiresAt = new Date(nowMs + 24 * 60 * 60 * 1000).toISOString();

    const rejectionsToRecord: CandidateRejection[] = [];
    let candidates: CoveredCallCandidate[] = [];

    // ── 5. Flow-level gates (kill switch, max pending) — checked once,
    // not per-ticker, since they're account-level, not name-level. ────
    const MAX_PENDING = 3;
    if (killSwitchEngaged) {
      rejectionsToRecord.push({
        ticker: "*",
        reason: "kill_switch_engaged",
        detail: { reason: "kill_switch_engaged" },
      });
    } else if (pendingCount >= MAX_PENDING) {
      rejectionsToRecord.push({
        ticker: "*",
        reason: "max_pending_proposals_reached",
        detail: { reason: "max_pending_proposals_reached", currentPendingCount: pendingCount, maxPending: MAX_PENDING },
      });
    } else {
      // ── 6/7. Candidate builder (strike selection + earnings gate + all
      // per-name gates run inside, in that order — see proposalEngine.ts's
      // buildCoveredCallCandidates doc comment for the exact gate sequence).
      // The earnings gate needs the real, selected expiry, so it can't run
      // as a pre-filter ahead of strike selection the way the stub-era code
      // did — it's folded into the per-holding pipeline instead.
      const result = await buildCoveredCallCandidates({
        holdings,
        openProposals,
        accountEquityUsd,
        today,
        strikeSelector: tradierStrikeSelector,
        earningsChecker: finnhubEarningsChecker,
      });
      candidates = result.candidates;
      rejectionsToRecord.push(...result.rejections);
    }

    // ── 8. Insert surviving candidates ───────────────────────────────
    const created: Array<{ id: string; ticker: string; strike: number; expiry: string; contracts: number }> = [];
    for (const c of candidates) {
      const row = candidateToInsertRow(auth.userId, c, expiresAt, "live");
      const { data: inserted, error: insertErr } = await svc.from("proposals").insert(row).select("id").single();
      if (insertErr || !inserted) {
        rejectionsToRecord.push({
          ticker: c.ticker,
          reason: "insert_failed",
          detail: { reason: "insert_failed", error: insertErr?.message ?? "unknown" },
        });
        continue;
      }
      const proposalId = (inserted as { id: string }).id;
      created.push({ id: proposalId, ticker: c.ticker, strike: c.strike, expiry: c.expiry, contracts: c.contracts });
      await svc.from("proposal_events").insert({
        proposal_id: proposalId,
        user_id: auth.userId,
        event: "proposal_created",
        detail: { ticker: c.ticker, structure: c.structure, strike: c.strike, expiry: c.expiry, contracts: c.contracts },
      });
      // Fail-open disclosure: the earnings calendar was unavailable for this
      // ticker/window. The proposal is NOT blocked (see proposalEngine.ts's
      // buildCoveredCallCandidates), but the ambiguity is logged so a human
      // reviewer sees it before approving.
      if (c.earningsStatus === "unknown") {
        await svc.from("proposal_events").insert({
          proposal_id: proposalId,
          user_id: auth.userId,
          event: "earnings_unknown",
          detail: { ticker: c.ticker, expiry: c.expiry },
        });
      }
      invokeCouncilVerdict(svc, auth.userId, proposalId);
    }

    // ── 9. Record every rejection (no proposal row exists for these —
    // proposal_id is left null; the event still ties to the user + ticker) ──
    for (const r of rejectionsToRecord) {
      await svc.from("proposal_events").insert({
        proposal_id: null,
        user_id: auth.userId,
        event: "candidate_rejected",
        detail: { ticker: r.ticker, reason: r.reason, ...r.detail },
      });
    }

    return jsonResponse(
      {
        created,
        rejected: rejectionsToRecord.map((r) => ({ ticker: r.ticker, reason: r.reason })),
      },
      200,
      req,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "generate-proposals error";
    const sanitizedMsg = String(sanitizeError(msg));
    if (msg.includes("authentication") || msg.includes("token") || msg.includes("Missing")) {
      return errorResponse(sanitizedMsg, 401, req);
    }
    return errorResponse(sanitizedMsg, 500, req);
  }
});
