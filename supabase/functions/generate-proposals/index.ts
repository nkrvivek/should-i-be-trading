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
 * Strike selection and the earnings-window gate are stubbed behind injected
 * functions in src/lib/proposalEngine.ts (stubStrikeSelector /
 * stubEarningsChecker) — both carry TODOs for the real chain-data
 * workstream.
 */

import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";
import { sanitizeError } from "../_shared/sanitize.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildCoveredCallCandidates,
  stubEarningsChecker,
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

function candidateToInsertRow(userId: string, c: CoveredCallCandidate, expiresAt: string) {
  return {
    user_id: userId,
    ticker: c.ticker,
    structure: c.structure,
    legs: [{ action: "SELL_TO_OPEN", right: "C", strike: c.strike }],
    qty: c.contracts,
    expiry: c.expiry,
    // net_credit_usd is unknown until real option-chain pricing lands
    // (strike selection is a stub — see proposalEngine.ts TODOs).
    net_credit_usd: null,
    // A covered call's downside isn't a defined max-loss dollar figure
    // (assignment is opportunity cost, not capital loss) — left null.
    max_loss_usd: null,
    // Notional the strike represents (strike * 100 * qty) — used as the
    // open-risk-cap basis for this structure (see proposalEngine.ts
    // openNameRiskUsd doc comment).
    collateral_usd: c.strike * 100 * c.contracts,
    rationale: c.rationale,
    proposal_signals: {}, // TODO: chain/greeks data once real strike selection lands
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
      accountId,
      snaptradeUserId,
      snaptradeUserSecret,
    } = body as {
      accountId?: string;
      snaptradeUserId?: string;
      snaptradeUserSecret?: string;
    };

    if (!accountId || !snaptradeUserId || !snaptradeUserSecret) {
      return errorResponse("Missing accountId, snaptradeUserId, or snaptradeUserSecret", 400, req);
    }
    const ACCOUNT_ID_RE = /^[a-zA-Z0-9-]{1,64}$/;
    if (!ACCOUNT_ID_RE.test(accountId)) {
      return errorResponse("Invalid account ID format", 400, req);
    }

    const svc = await getServiceClient();

    // ── 1. Feature gate ──────────────────────────────────────────────
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
      // ── 6. Earnings-window gate (stubbed — TODO real calendar) ────
      // v1: stubEarningsChecker always clears. Wired here (rather than
      // omitted) so a later workstream can drop in a real checker without
      // touching this call site — mirrors the strike-selector injection.
      const earningsClearByTicker = new Map<string, boolean>();
      for (const h of holdings) {
        earningsClearByTicker.set(h.ticker.toUpperCase(), await stubEarningsChecker(h.ticker, today));
      }
      const holdingsPastEarningsGate = holdings.filter((h) => {
        const clear = earningsClearByTicker.get(h.ticker.toUpperCase()) ?? true;
        if (!clear) {
          rejectionsToRecord.push({
            ticker: h.ticker.toUpperCase(),
            reason: "earnings_window_blocked",
            detail: { reason: "earnings_window_blocked" },
          });
        }
        return clear;
      });

      // ── 7. Candidate builder + per-name gates ──────────────────────
      const result = buildCoveredCallCandidates({
        holdings: holdingsPastEarningsGate,
        openProposals,
        accountEquityUsd,
        today,
      });
      candidates = result.candidates;
      rejectionsToRecord.push(...result.rejections);
    }

    // ── 8. Insert surviving candidates ───────────────────────────────
    const created: Array<{ id: string; ticker: string; strike: number; expiry: string; contracts: number }> = [];
    for (const c of candidates) {
      const row = candidateToInsertRow(auth.userId, c, expiresAt);
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
