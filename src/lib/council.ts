/**
 * Council — pure logic for the AI council verdict pipeline.
 *
 * Phase 2 workstream 4 (docs/relaunch-plan-2026-07.md): "AI council as
 * product: proposal -> multi-persona model panel verdict shown pre-approval
 * ('3 of 5 personas approve, dissent: ...')". Ported patterns from
 * autopilot-experiment/ai_council.py:
 *   - tolerant JSON extraction  -> ai_council.py::_try_extract_json
 *   - per-call failure isolation -> ai_council.py's ThreadPoolExecutor +
 *     per-task try/except (this module's TS equivalent is
 *     `Promise.allSettled` in council-verdict/index.ts, with
 *     `personaOutcomeFromSettled` below turning a settled result into a
 *     never-throws vote)
 *
 * This module is deliberately dependency-free (no Deno/no Supabase client) so
 * it can be imported by both the council-verdict edge function (Deno,
 * relative .ts import — same pattern as
 * supabase/functions/proxy-anthropic/index.ts importing src/lib/aiLimits.ts)
 * and by vitest unit tests under tests/lib/ — mirrors src/lib/proposalEngine.ts.
 *
 * Everything that actually talks to Anthropic or Supabase (the persona
 * fetch calls, the ai_usage RPC, the proposals/proposal_events writes) stays
 * in council-verdict/index.ts. Only the parts safe to unit-test without a
 * network or a database live here: vote aggregation, defensive JSON parsing
 * of a persona's raw model output, turning a `Promise.allSettled` result into
 * a vote, and the daily AI-budget arithmetic.
 */

import { getAiRequestLimit, type AiLimitTier } from "./aiLimits";

// ── GateResult (mirrors proposalEngine.ts's discriminated union) ──────────

export interface RejectionDetail {
  reason: string;
  [key: string]: unknown;
}

export type GateResult =
  | { ok: true }
  | { ok: false; reason: string; detail: RejectionDetail };

// ── Personas ────────────────────────────────────────────────────────────

export const PERSONAS = [
  "risk-manager",
  "technician",
  "macro",
  "income-strategist",
  "devils-advocate",
] as const;

export type PersonaName = (typeof PERSONAS)[number];

export type PersonaVote = "approve" | "reject" | "abstain";

export interface PersonaVerdict {
  persona: PersonaName;
  vote: PersonaVote;
  reason: string;
}

/** Matches the `proposals.council_verdict` jsonb column comment in
 * supabase/migrations/014_copilot_proposals.sql:
 * `{votes:[{persona,vote,reason}],approve_count,reject_count}`. */
export interface CouncilVerdict {
  votes: PersonaVerdict[];
  approve_count: number;
  reject_count: number;
}

/** Count approve/reject votes across all 5 personas. Abstains count toward
 * neither total (they're neither a yes nor a no) but still appear in
 * `votes` — the caller (council-verdict/index.ts) decides what an
 * abstain-heavy verdict means for the UI, this function only counts. */
export function aggregateVotes(votes: PersonaVerdict[]): CouncilVerdict {
  const approve_count = votes.filter((v) => v.vote === "approve").length;
  const reject_count = votes.filter((v) => v.vote === "reject").length;
  return { votes, approve_count, reject_count };
}

// ── Defensive JSON parsing of a persona's raw model output ─────────────────

const VALID_VOTES: readonly PersonaVote[] = ["approve", "reject", "abstain"];
const MAX_REASON_LENGTH = 200;

export interface ParsedPersonaOutput {
  vote: PersonaVote;
  reason: string;
  confidence: number;
}

/** Any malformed response falls back to exactly this — never a partial
 * guess. Matches the task brief's required fallback shape verbatim. */
const UNPARSEABLE_FALLBACK: ParsedPersonaOutput = {
  vote: "abstain",
  reason: "unparseable",
  confidence: 0,
};

/** Pull the first balanced-looking `{...}` block out of a persona's raw
 * text response, stripping a markdown code fence first if present. Models
 * asked for "strict JSON only" still sometimes wrap the answer in
 * ```json ... ``` or add a leading/trailing sentence — this tolerates both
 * without attempting a full parser (ported from ai_council.py's
 * _try_extract_json, which does the same fence-strip + first/last-brace
 * slice before calling json.loads). Returns null when no `{`/`}` pair
 * exists at all. */
export function extractJsonBlock(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  return candidate.slice(start, end + 1);
}

/** Defensively parse a persona's raw model output into
 * `{vote, reason, confidence}`. Never throws — any of the following falls
 * back to `{vote: "abstain", reason: "unparseable", confidence: 0}`:
 *   - no `{...}` block found in the text
 *   - the block isn't valid JSON
 *   - `vote` is missing or not one of approve/reject/abstain
 * `reason` is truncated to 200 chars (matches the task's `<=200 chars`
 * contract); a missing/invalid `confidence` defaults to 0.5 (neutral)
 * rather than failing the whole parse, since vote+reason is all
 * `council_verdict` actually persists. */
export function parsePersonaResponse(text: string): ParsedPersonaOutput {
  const jsonStr = extractJsonBlock(text);
  if (jsonStr === null) return UNPARSEABLE_FALLBACK;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return UNPARSEABLE_FALLBACK;
  }

  if (typeof parsed !== "object" || parsed === null) return UNPARSEABLE_FALLBACK;
  const obj = parsed as Record<string, unknown>;

  const vote = obj.vote;
  if (typeof vote !== "string" || !VALID_VOTES.includes(vote as PersonaVote)) {
    return UNPARSEABLE_FALLBACK;
  }

  const reason =
    typeof obj.reason === "string" && obj.reason.length > 0
      ? obj.reason.slice(0, MAX_REASON_LENGTH)
      : "unparseable";

  const confidence =
    typeof obj.confidence === "number" && obj.confidence >= 0 && obj.confidence <= 1
      ? obj.confidence
      : 0.5;

  return { vote: vote as PersonaVote, reason, confidence };
}

// ── Promise.allSettled -> vote (never throws, never crashes the council) ───

/** Turn one persona's `Promise.allSettled` outcome into a vote. A rejected
 * promise (the Anthropic call itself failed — network error, non-2xx
 * response, timeout) becomes an abstain with the same "unparseable" reason
 * as a malformed response, since from the aggregate verdict's point of view
 * both are "this persona produced nothing usable." A fulfilled promise is
 * run through `parsePersonaResponse`. This function itself never throws —
 * it's the boundary that guarantees one bad persona can never crash the
 * 5-way council run. */
export function personaOutcomeFromSettled(
  persona: PersonaName,
  settled: PromiseSettledResult<string>,
): PersonaVerdict {
  if (settled.status === "rejected") {
    return { persona, vote: "abstain", reason: "unparseable" };
  }
  const parsed = parsePersonaResponse(settled.value);
  return { persona, vote: parsed.vote, reason: parsed.reason };
}

// ── Daily AI-budget guard (cost guard ahead of the 5 persona calls) ───────

/** Billing tiers as they appear on a `profiles`/`subscriptions` row —
 * superset of `AiLimitTier` (src/lib/aiLimits.ts) by exactly one value:
 * `copilot`, the Phase 2 HITL execution tier added in migration
 * 014_copilot_proposals.sql. aiLimits.ts's tables don't have a `copilot`
 * row of their own. */
export type BillingTier = AiLimitTier | "copilot";

/** `copilot` has no AI-rate-limit tier of its own yet — same convention
 * already established in src/lib/featureGates.ts's `maxAiRequests()`
 * (treat it as `pro` until a dedicated copilot AI budget is defined).
 * Replicated here rather than imported so this module stays dependency-free
 * (featureGates.ts pulls in a `UserTier` type from src/stores/authStore.ts,
 * which this Deno-importable module has no business depending on). Any
 * unrecognized/undefined tier falls back to `free`, matching aiLimits.ts's
 * own `getAiRequestLimit` fallback. */
export function resolveAiLimitTier(tier: BillingTier | undefined): AiLimitTier {
  if (tier === "copilot") return "pro";
  if (!tier) return "free";
  return tier;
}

export interface BudgetCheckParams {
  tier: BillingTier | undefined;
  requestsUsedToday: number;
}

/** Cost guard run before the 5 persona calls: skip the whole council run
 * once the proposal owner's `ai_usage.request_count` for today is already
 * at or over their tier's daily limit (src/lib/aiLimits.ts's
 * `AI_REQUEST_LIMITS`, the same table proxy-anthropic/index.ts enforces).
 * `requestsUsedToday` is read by the caller from the `ai_usage` table
 * before this is called — this function is pure arithmetic over that
 * count, no I/O. */
export function checkCouncilBudget(params: BudgetCheckParams): GateResult {
  const aiTier = resolveAiLimitTier(params.tier);
  const limit = getAiRequestLimit(aiTier);
  if (params.requestsUsedToday >= limit) {
    return {
      ok: false,
      reason: "daily_ai_budget_exceeded",
      detail: {
        reason: "daily_ai_budget_exceeded",
        tier: params.tier ?? "free",
        aiTier,
        requestsUsedToday: params.requestsUsedToday,
        limit,
      },
    };
  }
  return { ok: true };
}
