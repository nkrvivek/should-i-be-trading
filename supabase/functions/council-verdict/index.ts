/**
 * council-verdict — Phase 2 workstream 4 (docs/relaunch-plan-2026-07.md):
 * "AI council as product: proposal -> multi-persona model panel verdict
 * shown pre-approval ('3 of 5 personas approve, dissent: ...'), per-tier
 * model budgets on existing ai_usage rails."
 *
 * POST { proposal_id }: loads the proposal, runs 5 personas (risk-manager,
 * technician, macro, income-strategist, devils-advocate) concurrently over
 * the same proposal context, writes the aggregated verdict back onto the
 * proposal row and to the proposal_events audit log, and logs 5 ai_usage
 * increments (one per persona call) attributed to the proposal's owner.
 *
 * Callers: service_role (the normal path — generate-proposals/index.ts
 * fires this immediately after inserting a proposal) OR the proposal's own
 * owner via a normal user JWT (for a future "re-run council" UI action).
 * Any other authenticated user, or a caller with no valid credential at
 * all, is rejected.
 *
 * Persona calls use the same raw-fetch-to-Anthropic pattern as
 * proxy-anthropic/index.ts (this repo doesn't use the Anthropic SDK in Deno
 * edge functions) and the same server-side ANTHROPIC_API_KEY. Model is
 * claude-sonnet-5 with `temperature` omitted entirely — Sonnet 5 rejects
 * any non-default sampling parameter (temperature/top_p/top_k) with an
 * HTTP 400, so "modest" sampling here means "let the default stand," not
 * an explicit low value.
 *
 * Every persona call is isolated: a parse failure or a rejected promise
 * both become an abstain vote (src/lib/council.ts::personaOutcomeFromSelfed
 * -- see personaOutcomeFromSettled) rather than failing the whole request.
 * ai_council.py's per-analyst try/except + ThreadPoolExecutor is the
 * pattern this ports; Promise.allSettled is the TS equivalent.
 *
 * Account-relative sizing note: the `proposals` row carries collateral_usd
 * / max_loss_usd / qty, which is the account-relative size signal actually
 * available at this stage (real-time account equity would need re-fetching
 * broker credentials that aren't stored server-side yet — see
 * generate-proposals/index.ts's credential-model doc comment). Personas are
 * told this and asked to reason about size using those dollar figures
 * rather than a fabricated equity percentage.
 */

import { authenticateRequest, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";
import { sanitizeError } from "../_shared/sanitize.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAiRequestLimit, type AiLimitTier } from "../../../src/lib/aiLimits.ts";
import {
  PERSONAS,
  aggregateVotes,
  personaOutcomeFromSettled,
  checkCouncilBudget,
  type PersonaName,
  type PersonaVerdict,
  type BillingTier,
} from "../../../src/lib/council.ts";

const COUNCIL_MODEL = "claude-sonnet-5";
const COUNCIL_MAX_TOKENS = 512;

// ── Persona system prompts ──────────────────────────────────────────────
// Each persona is told what to weigh, told to ignore everything else, and
// given the same strict-JSON-only output contract. Kept short: these are
// system prompts, not few-shot essays -- the proposal context is the user
// message, shared verbatim across all 5 calls.

const OUTPUT_CONTRACT =
  'Respond with strict JSON only, no other text, no markdown fence: ' +
  '{"vote":"approve"|"reject"|"abstain","reason":"<=200 characters","confidence":0-1}.';

const PERSONA_PROMPTS: Record<PersonaName, string> = {
  "risk-manager":
    "You are the risk manager on a trading approval council. Judge this proposal purely on capital at risk: " +
    "the size implied by collateral_usd/max_loss_usd/qty relative to a typical account, whether the max loss is " +
    "well-defined and bounded, and whether the structure risks over-concentration in one name. Reject oversized " +
    "or poorly bounded risk; approve only when the loss is capped and modest. " + OUTPUT_CONTRACT,
  technician:
    "You are the technical analyst on a trading approval council. Judge this proposal on trade structure and " +
    "timing: strike placement relative to spot, expiry/DTE choice, and whether proposal_signals and the rationale " +
    "describe a well-formed, well-timed setup. Approve when the structure and timing look sound; reject when " +
    "strikes or expiry look mispriced or the setup is weak. " + OUTPUT_CONTRACT,
  macro:
    "You are the macro strategist on a trading approval council. Judge this proposal against the broader market " +
    "regime and macro backdrop implied by the rationale and signals -- does the trade fit a reasonable regime read, " +
    "or does it fight the prevailing tape or ignore an obvious macro risk. Approve when the trade is " +
    "regime-consistent; reject when it looks like a bad macro bet. " + OUTPUT_CONTRACT,
  "income-strategist":
    "You are the income strategist on a trading approval council. Judge this proposal on income merit: premium " +
    "collected (net_credit_usd) relative to capital committed (collateral_usd/max_loss_usd), and whether this is a " +
    "durable, repeatable income trade rather than a one-off bet. Approve well-compensated income structures; " +
    "reject low-yield or poorly compensated risk. " + OUTPUT_CONTRACT,
  "devils-advocate":
    "You are the devil's advocate on a trading approval council. Find the strongest reason this proposal could go " +
    "wrong: an assumption in the rationale that may not hold, a plausible scenario where the max loss is realized, " +
    "or a reason the other personas' read is too optimistic. Default to skepticism; approve only if you cannot " +
    "find a material objection. " + OUTPUT_CONTRACT,
};

// ── Supabase / tier helpers (mirrors proxy-anthropic/index.ts) ─────────────

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Same subscription -> profile/trial -> free resolution order as
 * proxy-anthropic/index.ts::getUserTier, adapted to take an already-built
 * service client instead of creating its own. */
async function getUserTier(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<BillingTier> {
  try {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_tier, status, current_period_end")
      .eq("user_id", userId)
      .single();

    if (sub && sub.plan_tier !== "free") {
      if (sub.status === "active" || sub.status === "trialing") return sub.plan_tier as BillingTier;
      if (sub.status === "past_due" && sub.current_period_end) {
        const gracePeriodEnd = new Date(sub.current_period_end);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);
        if (new Date() < gracePeriodEnd) return sub.plan_tier as BillingTier;
        return "free";
      }
    }

    const { data } = await supabase
      .from("profiles")
      .select("tier, trial_ends_at")
      .eq("id", userId)
      .single();

    if (!data) return "free";
    if (data.tier === "free" && data.trial_ends_at) {
      if (new Date(data.trial_ends_at) > new Date()) return "trial";
    }
    return (data.tier as BillingTier) ?? "free";
  } catch {
    return "free";
  }
}

async function isServiceRoleCaller(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return Boolean(serviceKey) && token === serviceKey;
}

// ── Proposal row shape (only the columns the council needs) ────────────────

interface ProposalRow {
  id: string;
  user_id: string;
  ticker: string;
  structure: string;
  legs: unknown;
  qty: number;
  expiry: string | null;
  net_credit_usd: number | null;
  max_loss_usd: number | null;
  collateral_usd: number | null;
  rationale: string;
  proposal_signals: unknown;
}

function buildProposalContext(row: ProposalRow): string {
  return JSON.stringify(
    {
      ticker: row.ticker,
      structure: row.structure,
      legs: row.legs,
      qty: row.qty,
      expiry: row.expiry,
      net_credit_usd: row.net_credit_usd,
      max_loss_usd: row.max_loss_usd,
      collateral_usd: row.collateral_usd,
      rationale: row.rationale,
      proposal_signals: row.proposal_signals,
    },
    null,
    2,
  );
}

// ── Anthropic call (raw fetch, matches proxy-anthropic/index.ts) ──────────

async function callPersona(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    // No `temperature` field: claude-sonnet-5 returns HTTP 400 on any
    // non-default temperature/top_p/top_k -- omitting the field is the only
    // way to get "modest"/default sampling on this model.
    body: JSON.stringify({
      model: COUNCIL_MODEL,
      max_tokens: COUNCIL_MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Anthropic API error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== "string") throw new Error("No text content in Anthropic response");
  return text;
}

// ── Edge function entry point ───────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const contentLength = parseInt(req.headers.get("content-length") || "0");
    if (contentLength > 50000) {
      return errorResponse("Request too large", 413, req);
    }

    const body = await req.json().catch(() => ({}));
    const { proposal_id: proposalId } = body as { proposal_id?: string };
    if (!proposalId || typeof proposalId !== "string") {
      return errorResponse("Missing proposal_id", 400, req);
    }

    // ── Auth: service_role OR the proposal's own authenticated owner ────
    const isServiceRole = await isServiceRoleCaller(req);
    let callerUserId: string | null = null;
    if (!isServiceRole) {
      try {
        const ctx = await authenticateRequest(req);
        callerUserId = ctx.userId;
      } catch (authErr) {
        return errorResponse(
          `Authentication failed: ${authErr instanceof Error ? authErr.message : "Invalid token"}`,
          401,
          req,
        );
      }
    }

    const svc = getServiceClient();

    const { data: proposalRow, error: proposalErr } = await svc
      .from("proposals")
      .select(
        "id, user_id, ticker, structure, legs, qty, expiry, net_credit_usd, max_loss_usd, collateral_usd, rationale, proposal_signals",
      )
      .eq("id", proposalId)
      .single();

    if (proposalErr || !proposalRow) {
      return errorResponse("Proposal not found", 404, req);
    }
    const proposal = proposalRow as ProposalRow;

    if (callerUserId && proposal.user_id !== callerUserId) {
      return errorResponse("Forbidden", 403, req);
    }

    const ownerId = proposal.user_id;
    const today = new Date().toISOString().slice(0, 10);

    // ── Cost guard: skip the whole run if today's ai_usage is already at
    // or over the owner's tier limit (before spending anything on personas)
    const tier = await getUserTier(svc, ownerId);
    const { data: usageRow } = await svc
      .from("ai_usage")
      .select("request_count")
      .eq("user_id", ownerId)
      .eq("usage_date", today)
      .maybeSingle();
    const requestsUsedToday = (usageRow as { request_count?: number } | null)?.request_count ?? 0;

    const budgetGate = checkCouncilBudget({ tier, requestsUsedToday });
    if (!budgetGate.ok) {
      await svc.from("proposal_events").insert({
        proposal_id: proposalId,
        user_id: ownerId,
        event: "council_skipped_budget",
        detail: budgetGate.detail,
      });
      return jsonResponse({ skipped: true, reason: budgetGate.reason }, 200, req);
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return errorResponse("No server-side Anthropic API key configured", 500, req);
    }

    const aiTier: AiLimitTier = tier === "copilot" ? "pro" : (tier as AiLimitTier);
    const dailyLimit = getAiRequestLimit(aiTier);
    const userPrompt =
      "Evaluate this staged trade proposal.\n\nProposal:\n" + buildProposalContext(proposal);

    // ── Run all 5 personas concurrently. Each call independently logs its
    // own ai_usage increment (fail-open on the RPC itself, matching
    // proxy-anthropic's precedent — an accounting hiccup should never block
    // a persona's actual vote). Promise.allSettled means one persona
    // throwing (network error, non-2xx, malformed text) can never crash the
    // other 4 or the request as a whole. ──────────────────────────────────
    const settled = await Promise.allSettled(
      PERSONAS.map(async (persona) => {
        try {
          await svc.rpc("increment_ai_usage", {
            p_user_id: ownerId,
            p_usage_date: today,
            p_daily_limit: dailyLimit,
          });
        } catch {
          // Fail open on the usage RPC itself — matches
          // proxy-anthropic/index.ts::checkAndIncrementUsage's precedent.
        }
        return callPersona(PERSONA_PROMPTS[persona], userPrompt, apiKey);
      }),
    );

    const votes: PersonaVerdict[] = PERSONAS.map((persona, i) =>
      personaOutcomeFromSettled(persona, settled[i]),
    );
    const verdict = aggregateVotes(votes);

    await svc.from("proposals").update({ council_verdict: verdict }).eq("id", proposalId);
    await svc.from("proposal_events").insert({
      proposal_id: proposalId,
      user_id: ownerId,
      event: "council_verdict",
      detail: verdict,
    });

    return jsonResponse({ verdict }, 200, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "council-verdict error";
    const sanitizedMsg = String(sanitizeError(msg));
    return errorResponse(sanitizedMsg, 500, req);
  }
});
