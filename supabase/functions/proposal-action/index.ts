/**
 * proposal-action — WS3a (docs/relaunch-plan-2026-07.md Phase 2): the HITL
 * approve/execute rail.
 *
 * Two entry paths:
 *   - In-app: authenticated POST { proposal_id, action } — JSON in, JSON out.
 *   - Magic link: GET ?pid=&action=&token= renders a minimal HTML confirm
 *     page; the page's own form POSTs back { pid, action, token } as
 *     application/x-www-form-urlencoded (a plain HTML form, so it works
 *     without JS). This two-step shape is deliberate: a bare GET (e.g. an
 *     email client's link-scanner prefetching the URL) only ever renders a
 *     page — it can NEVER trigger approve/reject. Only an explicit POST does.
 *
 * Approve flow: state-transition guard -> mark approved -> decrypt the
 * user's broker connection -> place the SnapTrade order -> poll briefly for
 * a terminal status -> map to executed/failed/executing, writing a
 * proposal_events row at every step. Fail-closed throughout: any
 * uncertainty (a place-order network error, a missing order id, a stalled
 * poll) leaves the proposal at 'executing' with a 'verify_pending' event —
 * this function never reports a fill the broker hasn't confirmed.
 *
 * Reject flow: always available, regardless of tier — just a state
 * transition + audit event, no broker call.
 *
 * TODO(later workstream): opt-in auto-execution. execution_settings.
 * auto_execute_enabled/auto_max_notional_usd/auto_max_trades_per_day/
 * kill_switch (014_copilot_proposals.sql) exist but are not read here — this
 * function only ever runs after an explicit human approve (in-app tap or
 * magic-link click). The auto-execute branch — its own caps, kill switch,
 * and compliance review before it exits beta (relaunch plan Decisions #2) —
 * ships separately and would slot in here as an alternate trigger path,
 * not a change to the execute logic itself.
 */

import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";
import { sanitizeError } from "../_shared/sanitize.ts";
import { BRAND } from "../_shared/email.ts";
import { consumeRateLimit } from "../_shared/rateLimit.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkProposalTransition,
  verifyMagicLinkToken,
  mapBrokerStatusToExecutionStatus,
  buildOccSymbol,
  type ProposalAction,
} from "../../../src/lib/proposalActions.ts";
import { placeSnapTradeOrder, getSnapTradeOrderStatus } from "../_shared/snaptradeClient.ts";
import { fetchTradierQuote } from "../_shared/tradierClient.ts";
import { selectFillPrice, type PaperFillSide } from "../../../src/lib/paperFillEngine.ts";

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

const VALID_ACTIONS = new Set(["approve", "reject"]);
const PID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const POLL_ATTEMPTS = 3;
const POLL_DELAY_MS = 1200;

type ServiceClient = ReturnType<typeof getServiceClient>;

interface ProposalLeg {
  action?: string;
  right?: string;
  strike?: number;
  expiry?: string;
  occ_symbol?: string;
  qty?: number;
}

interface ProposalRow {
  id: string;
  user_id: string;
  ticker: string;
  structure: string;
  legs: ProposalLeg[] | null;
  qty: number;
  expiry: string | null;
  status: string;
  expires_at: string;
  mode: "paper" | "live";
}

async function fetchProposal(svc: ServiceClient, proposalId: string): Promise<ProposalRow | null> {
  const { data } = await svc
    .from("proposals")
    .select("id, user_id, ticker, structure, legs, qty, expiry, status, expires_at, mode")
    .eq("id", proposalId)
    .maybeSingle();
  return (data as ProposalRow | null) ?? null;
}

async function insertEvent(svc: ServiceClient, proposalId: string, userId: string, event: string, detail: unknown) {
  await svc.from("proposal_events").insert({ proposal_id: proposalId, user_id: userId, event, detail });
}

// ── HTML rendering (magic-link path) ──────────────────────────────────────

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function pageShell(title: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — ${BRAND.name}</title>
</head>
<body style="font-family:${BRAND.fonts.sans};background:${BRAND.colors.bg};color:${BRAND.colors.text};margin:0;padding:0;">
  <div style="max-width:480px;margin:60px auto;padding:32px 24px;background:${BRAND.colors.panel};border:1px solid ${BRAND.colors.border};border-radius:8px;">
    <div style="font-family:${BRAND.fonts.mono};font-size:20px;font-weight:700;color:${BRAND.colors.accent};letter-spacing:2px;margin-bottom:24px;">${BRAND.name}</div>
    ${content}
  </div>
</body>
</html>`;
}

function confirmPage(params: { proposalId: string; action: ProposalAction; token: string; summary: string }): string {
  const verb = params.action === "approve" ? "Approve" : "Reject";
  return pageShell(
    `${verb} proposal`,
    `
    <h1 style="font-size:20px;margin:0 0 12px;">${verb} this trade?</h1>
    <p style="color:${BRAND.colors.muted};font-size:14px;line-height:1.6;margin:0 0 24px;">${params.summary}</p>
    <form method="POST" action="">
      <input type="hidden" name="pid" value="${params.proposalId}">
      <input type="hidden" name="action" value="${params.action}">
      <input type="hidden" name="token" value="${params.token}">
      <button type="submit" style="width:100%;padding:12px;background:${BRAND.colors.accent};color:${BRAND.colors.bg};border:none;border-radius:4px;font-weight:600;font-size:14px;cursor:pointer;">${verb.toUpperCase()}</button>
    </form>
    `,
  );
}

function resultPage(title: string, message: string): string {
  return pageShell(
    title,
    `
    <h1 style="font-size:20px;margin:0 0 12px;">${title}</h1>
    <p style="color:${BRAND.colors.muted};font-size:14px;line-height:1.6;">${message}</p>
    `,
  );
}

// ── Body parsing (JSON for in-app, form-urlencoded for magic-link) ────────

async function parseBody(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") ?? "";
  const out: Record<string, string> = {};
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    for (const [k, v] of new URLSearchParams(text).entries()) out[k] = v;
    return out;
  }
  const json = await req.json().catch(() => ({}));
  for (const [k, v] of Object.entries((json ?? {}) as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

// ── Core action + execution logic ─────────────────────────────────────────

interface ActResult {
  ok: boolean;
  status: string;
  message: string;
}

async function actOnProposal(params: {
  svc: ServiceClient;
  proposal: ProposalRow;
  action: ProposalAction;
  approvedVia: "in_app" | "magic_link";
}): Promise<ActResult> {
  const { svc, proposal, action, approvedVia } = params;

  const transition = checkProposalTransition({
    status: proposal.status,
    expiresAt: proposal.expires_at,
    action,
  });

  if (!transition.ok) {
    await insertEvent(svc, proposal.id, proposal.user_id, "action_rejected", {
      reason: transition.reason,
      attempted_action: action,
      current_status: proposal.status,
    });
    const message =
      transition.reason === "expired"
        ? "This proposal has expired and can no longer be acted on."
        : `This proposal is already ${proposal.status} — no action taken.`;
    return { ok: false, status: proposal.status, message };
  }

  if (action === "reject") {
    await svc.from("proposals").update({ status: "rejected" }).eq("id", proposal.id);
    await insertEvent(svc, proposal.id, proposal.user_id, "proposal_rejected", { via: approvedVia });
    return { ok: true, status: "rejected", message: "Proposal rejected." };
  }

  await svc
    .from("proposals")
    .update({ status: "approved", approved_at: new Date().toISOString(), approved_via: approvedVia })
    .eq("id", proposal.id);
  await insertEvent(svc, proposal.id, proposal.user_id, "proposal_approved", { via: approvedVia });

  const exec =
    proposal.mode === "paper"
      ? await executePaperProposal(svc, proposal)
      : await executeApprovedProposal(svc, proposal);
  return { ok: true, status: exec.status, message: exec.message };
}

// ── Paper-mode execution: fill at a live Tradier quote, book it through the
// execute_paper_fill RPC (supabase/migrations/017_paper_trading.sql) — no
// SnapTrade/broker_connections involvement at all. v1 paper mode only ever
// stages covered-call candidates (see generate-proposals/index.ts's
// handlePaperGenerate), so every leg here is an option leg (multiplier 100).
async function executePaperProposal(svc: ServiceClient, proposal: ProposalRow): Promise<{ status: string; message: string }> {
  const leg = proposal.legs?.[0];
  if (!leg || leg.strike == null || !proposal.expiry) {
    await svc.from("proposals").update({ status: "failed" }).eq("id", proposal.id);
    await insertEvent(svc, proposal.id, proposal.user_id, "execution_failed", { reason: "missing_leg_detail" });
    return { status: "failed", message: "Approved, but the proposal is missing strike/expiry detail — nothing was filled." };
  }

  const symbol =
    leg.occ_symbol ??
    buildOccSymbol({
      ticker: proposal.ticker,
      expiry: leg.expiry ?? proposal.expiry,
      right: (leg.right as "C" | "P") ?? "C",
      strike: leg.strike,
    });

  await svc.from("proposals").update({ status: "executing" }).eq("id", proposal.id);
  await insertEvent(svc, proposal.id, proposal.user_id, "execution_started", { symbol, qty: proposal.qty, mode: "paper" });

  const quote = await fetchTradierQuote(symbol);
  if (!quote) {
    await insertEvent(svc, proposal.id, proposal.user_id, "verify_pending", { reason: "quote_unavailable" });
    return { status: "executing", message: "Approved. A live quote wasn't available for the fill — try again shortly." };
  }

  const SIDE_BY_LEG_ACTION: Record<string, PaperFillSide> = {
    SELL_TO_OPEN: "sell_to_open",
    BUY_TO_CLOSE: "buy_to_close",
    BUY: "buy",
    SELL: "sell",
  };
  const side = SIDE_BY_LEG_ACTION[(leg.action ?? "SELL_TO_OPEN").toUpperCase()] ?? "sell_to_open";
  const price = selectFillPrice(side, quote);
  const OPTION_MULTIPLIER = 100;

  const { data: fillResult, error: fillErr } = await svc.rpc("execute_paper_fill", {
    p_user_id: proposal.user_id,
    p_proposal_id: proposal.id,
    p_symbol: symbol,
    p_side: side,
    p_qty: proposal.qty,
    p_price: price,
    p_multiplier: OPTION_MULTIPLIER,
  });

  if (fillErr || !fillResult) {
    const insufficientCash = (fillErr?.message ?? "").toLowerCase().includes("insufficient");
    await insertEvent(svc, proposal.id, proposal.user_id, "verify_pending", {
      reason: insufficientCash ? "insufficient_paper_cash" : "paper_fill_failed",
      error: fillErr?.message ?? "unknown",
    });
    return {
      status: "executing",
      message: insufficientCash
        ? "Approved, but your paper account doesn't have enough cash for this fill — nothing was recorded."
        : "Approved, but the paper fill couldn't be recorded — please retry.",
    };
  }

  await svc.from("proposals").update({ status: "executed" }).eq("id", proposal.id);
  await insertEvent(svc, proposal.id, proposal.user_id, "execution_confirmed", {
    symbol,
    qty: proposal.qty,
    price,
    side,
    mode: "paper",
  });

  return {
    status: "executed",
    message: `Approved and filled in paper trading at $${price.toFixed(2)} — no real money moved.`,
  };
}

async function executeApprovedProposal(svc: ServiceClient, proposal: ProposalRow): Promise<{ status: string; message: string }> {
  const { data: connRow, error: connErr } = await svc
    .from("broker_connections")
    .select("id, snaptrade_user_id, snaptrade_user_secret_encrypted, account_id")
    .eq("user_id", proposal.user_id)
    .eq("provider", "snaptrade")
    .maybeSingle();

  if (connErr || !connRow || !(connRow as { account_id?: string }).account_id) {
    await svc.from("proposals").update({ status: "failed" }).eq("id", proposal.id);
    await insertEvent(svc, proposal.id, proposal.user_id, "execution_failed", { reason: "no_broker_connection" });
    return { status: "failed", message: "Approved, but no broker connection is on file — nothing was placed." };
  }
  const conn = connRow as {
    id: string;
    snaptrade_user_id: string;
    snaptrade_user_secret_encrypted: string;
    account_id: string;
  };

  // Decrypt via the same service-role decrypt_credential RPC pattern
  // supabase/functions/_shared/auth.ts's getUserCredential already uses for
  // user_credentials.
  const { data: decrypted, error: decErr } = await svc.rpc("decrypt_credential", {
    encrypted_text: conn.snaptrade_user_secret_encrypted,
  });
  if (decErr || !decrypted) {
    await svc.from("proposals").update({ status: "failed" }).eq("id", proposal.id);
    await insertEvent(svc, proposal.id, proposal.user_id, "execution_failed", { reason: "credential_decrypt_failed" });
    return { status: "failed", message: "Approved, but the stored broker credential could not be read — nothing was placed." };
  }
  const userSecret = decrypted as string;

  const leg = proposal.legs?.[0];
  if (!leg || leg.strike == null || !proposal.expiry) {
    await svc.from("proposals").update({ status: "failed" }).eq("id", proposal.id);
    await insertEvent(svc, proposal.id, proposal.user_id, "execution_failed", { reason: "missing_leg_detail" });
    return { status: "failed", message: "Approved, but the proposal is missing strike/expiry detail — nothing was placed." };
  }

  const symbol =
    leg.occ_symbol ??
    buildOccSymbol({
      ticker: proposal.ticker,
      expiry: leg.expiry ?? proposal.expiry,
      right: (leg.right as "C" | "P") ?? "C",
      strike: leg.strike,
    });

  await svc.from("proposals").update({ status: "executing" }).eq("id", proposal.id);
  await insertEvent(svc, proposal.id, proposal.user_id, "execution_started", { symbol, qty: proposal.qty });

  let placeResult: { brokerage_order_id?: string; id?: string; status?: string } | null = null;
  try {
    placeResult = await placeSnapTradeOrder(conn.snaptrade_user_id, userSecret, conn.account_id, {
      action: leg.action ?? "SELL_TO_OPEN",
      order_type: "Market",
      time_in_force: "Day",
      symbol,
      units: proposal.qty,
    });
  } catch (placeErr) {
    // Fail-closed: an error placing the order does not prove the broker
    // never received it (e.g. a network blip after the request was sent).
    // Stay at 'executing' + 'verify_pending' rather than guessing 'failed'.
    await svc.from("proposals").update({ status: "executing" }).eq("id", proposal.id);
    await insertEvent(svc, proposal.id, proposal.user_id, "verify_pending", {
      reason: "place_order_error",
      error: placeErr instanceof Error ? placeErr.message : String(placeErr),
    });
    return { status: "executing", message: "Approved. Order submission is unconfirmed — verifying with your broker." };
  }

  const brokerageOrderId = placeResult?.brokerage_order_id ?? placeResult?.id ?? null;
  if (!brokerageOrderId) {
    await insertEvent(svc, proposal.id, proposal.user_id, "verify_pending", { reason: "no_order_id_returned" });
    return { status: "executing", message: "Approved. Order submitted but no confirmation id was returned — verifying with your broker." };
  }

  // Poll briefly for a terminal status — short attempts, not a long wait
  // (edge function time budget); a still-pending order after this stays
  // 'executing' for a later reconciliation pass to pick up.
  let finalStatus: string | null = placeResult?.status ?? null;
  for (let i = 0; i < POLL_ATTEMPTS; i++) {
    if (mapBrokerStatusToExecutionStatus(finalStatus).status !== "executing") break;
    await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
    try {
      finalStatus = await getSnapTradeOrderStatus(conn.snaptrade_user_id, userSecret, conn.account_id, brokerageOrderId);
    } catch {
      finalStatus = null;
      break;
    }
  }

  const mapped = mapBrokerStatusToExecutionStatus(finalStatus);
  await svc.from("proposals").update({ status: mapped.status }).eq("id", proposal.id);
  await insertEvent(svc, proposal.id, proposal.user_id, mapped.event, {
    brokerage_order_id: brokerageOrderId,
    broker_status: finalStatus,
  });

  const message =
    mapped.status === "executed"
      ? "Approved and executed — your broker confirmed the fill."
      : mapped.status === "failed"
        ? "Approved, but the broker rejected or cancelled the order."
        : "Approved and submitted — still verifying the fill with your broker.";

  return { status: mapped.status, message };
}

// ── Edge function entry point ──────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  const url = new URL(req.url);
  const secret = Deno.env.get("MAGIC_LINK_SECRET");

  try {
    const svc = getServiceClient();

    // ── GET: render the confirm page (never executes anything) ──────────
    if (req.method === "GET") {
      const pid = url.searchParams.get("pid") ?? "";
      const action = url.searchParams.get("action") ?? "";
      const token = url.searchParams.get("token") ?? "";

      if (!PID_RE.test(pid) || !VALID_ACTIONS.has(action) || !token) {
        return htmlResponse(resultPage("Invalid link", "This link is missing required information."), 400);
      }
      if (!secret) {
        return htmlResponse(resultPage("Unavailable", "This action can't be processed right now. Please try again later."), 500);
      }

      const verify = await verifyMagicLinkToken({ proposalId: pid, action: action as ProposalAction, token, secret });
      if (!verify.ok) {
        const msg = verify.reason === "expired" ? "This link has expired." : "This link is invalid.";
        return htmlResponse(resultPage("Link invalid", msg), 400);
      }

      const proposal = await fetchProposal(svc, pid);
      if (!proposal) {
        return htmlResponse(resultPage("Not found", "This proposal no longer exists."), 404);
      }

      const summary = `${proposal.ticker} — ${proposal.structure.replace(/_/g, " ")}, qty ${proposal.qty}${proposal.expiry ? `, expiring ${proposal.expiry}` : ""}.`;
      return htmlResponse(confirmPage({ proposalId: pid, action: action as ProposalAction, token, summary }));
    }

    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405, req);
    }

    const body = await parseBody(req);
    const pid = body.pid || body.proposal_id || "";
    const action = body.action || "";
    const token = body.token;

    if (!PID_RE.test(pid) || !VALID_ACTIONS.has(action)) {
      return token !== undefined
        ? htmlResponse(resultPage("Invalid request", "Missing or invalid proposal id / action."), 400)
        : errorResponse("Missing or invalid proposal_id / action", 400, req);
    }

    // ── Magic-link path: unauthenticated, token-verified ─────────────────
    if (token) {
      if (!secret) {
        return htmlResponse(resultPage("Unavailable", "This action can't be processed right now. Please try again later."), 500);
      }
      const rl = consumeRateLimit({ key: `proposal-action:${pid}`, capacity: 10, refillMs: 60_000 });
      if (!rl.allowed) {
        return htmlResponse(resultPage("Slow down", "Too many attempts on this link. Try again shortly."), 429);
      }
      const verify = await verifyMagicLinkToken({ proposalId: pid, action: action as ProposalAction, token, secret });
      if (!verify.ok) {
        const msg = verify.reason === "expired" ? "This link has expired." : "This link is invalid.";
        return htmlResponse(resultPage("Link invalid", msg), 400);
      }
      const proposal = await fetchProposal(svc, pid);
      if (!proposal) {
        return htmlResponse(resultPage("Not found", "This proposal no longer exists."), 404);
      }
      const result = await actOnProposal({ svc, proposal, action: action as ProposalAction, approvedVia: "magic_link" });
      return htmlResponse(resultPage(result.ok ? "Done" : "No action taken", result.message));
    }

    // ── In-app path: authenticated ───────────────────────────────────────
    const auth = await authenticateRequest(req);
    const proposal = await fetchProposal(svc, pid);
    if (!proposal || proposal.user_id !== auth.userId) {
      // Same 404 whether missing or owned by someone else — don't leak
      // existence of another user's proposal.
      return errorResponse("Proposal not found", 404, req);
    }
    const result = await actOnProposal({ svc, proposal, action: action as ProposalAction, approvedVia: "in_app" });
    return jsonResponse({ ok: result.ok, status: result.status, message: result.message }, 200, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "proposal-action error";
    const sanitizedMsg = String(sanitizeError(msg));
    const status = msg.includes("authentication") || msg.includes("token") || msg.includes("Missing") ? 401 : 500;
    return errorResponse(sanitizedMsg, status, req);
  }
});
