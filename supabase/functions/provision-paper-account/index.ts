/**
 * provision-paper-account — paper trading engine (relaunch 2026-07-21).
 *
 * Authenticated POST, idempotent: creates the caller's `paper_accounts` row
 * ($100,000 starting cash) and seeds the 3-name "starter portfolio" (100
 * shares each of AAPL/SPY/F, at live Tradier quotes falling back to fixed
 * reference prices — see src/lib/paperAccountDefaults.ts's doc comment for
 * why: a brand-new paper account otherwise holds only cash, and generate-
 * proposals' handlePaperGenerate has nothing to build a covered call
 * against). Called once per user, from the paper-trading onboarding flow —
 * safe to call again (no-ops if an account row already exists).
 *
 * Writes both tables via the service-role client because paper_accounts'
 * insert policy (017_paper_trading.sql) requires the caller to be the row's
 * own user_id AND pins cash_usd/starting_cash_usd to exactly $100,000 — the
 * service role bypasses RLS entirely, so this function is the one place
 * responsible for enforcing that same $100,000 pin (via
 * buildDefaultPaperAccountRow, so the values can never drift from the RLS
 * policy's own check).
 */

import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";
import { sanitizeError } from "../_shared/sanitize.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchTradierQuote } from "../_shared/tradierClient.ts";
import {
  buildDefaultPaperAccountRow,
  buildStarterPositionRows,
  isAlreadyProvisioned,
  STARTER_PORTFOLIO_TICKERS,
} from "../../../src/lib/paperAccountDefaults.ts";

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, req);
  }

  try {
    const auth = await authenticateRequest(req);
    const svc = getServiceClient();

    // ── Idempotency: no-op if this user already has a paper account ──────
    const { data: existing, error: existingErr } = await svc
      .from("paper_accounts")
      .select("user_id, cash_usd")
      .eq("user_id", auth.userId)
      .maybeSingle();
    if (existingErr) {
      return errorResponse(`Failed to check existing paper account: ${existingErr.message}`, 500, req);
    }
    if (isAlreadyProvisioned(existing)) {
      return jsonResponse(
        { ok: true, alreadyProvisioned: true, cashUsd: (existing as { cash_usd: number }).cash_usd },
        200,
        req,
      );
    }

    // ── Live quotes for the starter portfolio (fail-soft to reference
    // prices — provisioning must succeed even if Tradier is unreachable) ──
    const quoteEntries = await Promise.all(
      STARTER_PORTFOLIO_TICKERS.map(async (symbol) => [symbol, await fetchTradierQuote(symbol)] as const),
    );
    const prices: Partial<Record<string, number>> = {};
    for (const [symbol, quote] of quoteEntries) {
      if (quote) prices[symbol] = quote.last;
    }

    const accountRow = buildDefaultPaperAccountRow(auth.userId);
    const { error: accountErr } = await svc.from("paper_accounts").insert(accountRow);
    if (accountErr) {
      return errorResponse(`Failed to create paper account: ${accountErr.message}`, 500, req);
    }

    const positionRows = buildStarterPositionRows(auth.userId, prices);
    const { error: positionsErr } = await svc.from("paper_positions").insert(positionRows);
    if (positionsErr) {
      // The account row exists but seeding failed partway — surface it
      // rather than silently leaving a cash-only account behind. The caller
      // can retry: paper_positions has no unique constraint blocking a
      // second insert attempt landing correctly once the underlying issue
      // (e.g. a transient DB error) clears, and this function is otherwise
      // idempotent on the account row.
      return errorResponse(`Created paper account but failed to seed starter portfolio: ${positionsErr.message}`, 500, req);
    }

    return jsonResponse(
      {
        ok: true,
        alreadyProvisioned: false,
        cashUsd: accountRow.cash_usd,
        starterPortfolio: positionRows.map((r) => ({ symbol: r.symbol, qty: r.qty, avgPrice: r.avg_price })),
      },
      200,
      req,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "provision-paper-account error";
    const sanitizedMsg = String(sanitizeError(msg));
    if (msg.includes("authentication") || msg.includes("token") || msg.includes("Missing")) {
      return errorResponse(sanitizedMsg, 401, req);
    }
    return errorResponse(sanitizedMsg, 500, req);
  }
});
