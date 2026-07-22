// Pure UI helpers for the proposals surface (WS3b). No Supabase, no React —
// kept side-effect free so they can be unit tested directly.

import type { BadgeVariant } from "../components/shared/Badge";

export type ProposalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "executing"
  | "executed"
  | "failed"
  | "cancelled";

export type GateChip = {
  name: string;
  passed: boolean;
};

export type CouncilVote = {
  persona: string;
  vote: "approve" | "reject";
  reason?: string;
};

export type CouncilSummary = {
  votes: CouncilVote[];
  approveCount: number;
  rejectCount: number;
};

// ── countdown ────────────────────────────────────────────────────────────

/**
 * Formats the time remaining until `expiresAtIso`, relative to `nowMs`
 * (defaults to Date.now()). Returns "EXPIRED" once the deadline has passed.
 */
export function formatCountdown(expiresAtIso: string, nowMs: number = Date.now()): string {
  const expiresMs = new Date(expiresAtIso).getTime();
  if (Number.isNaN(expiresMs)) return "—";

  const diffMs = expiresMs - nowMs;
  if (diffMs <= 0) return "EXPIRED";

  const days = Math.floor(diffMs / 86_400_000);
  if (days >= 1) {
    const hours = Math.floor((diffMs % 86_400_000) / 3_600_000);
    return `${days}d ${hours}h`;
  }

  const hours = Math.floor(diffMs / 3_600_000);
  if (hours >= 1) {
    const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
    return `${hours}h ${minutes}m`;
  }

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes >= 1) return `${minutes}m`;

  const seconds = Math.floor(diffMs / 1000);
  return seconds >= 1 ? `${seconds}s` : "<1m";
}

// ── status → badge ───────────────────────────────────────────────────────

const STATUS_BADGES: Record<ProposalStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: "PENDING", variant: "warning" },
  approved: { label: "APPROVED", variant: "positive" },
  rejected: { label: "REJECTED", variant: "negative" },
  expired: { label: "EXPIRED", variant: "default" },
  executing: { label: "EXECUTING", variant: "info" },
  executed: { label: "EXECUTED", variant: "positive" },
  failed: { label: "FAILED", variant: "negative" },
  cancelled: { label: "CANCELLED", variant: "default" },
};

export function statusBadge(status: string): { label: string; variant: BadgeVariant } {
  const known = STATUS_BADGES[status as ProposalStatus];
  if (known) return known;
  return { label: status.toUpperCase(), variant: "default" };
}

// ── gate-chip derivation ─────────────────────────────────────────────────

function resolvePassed(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.passed === "boolean") return obj.passed;
    if (typeof obj.ok === "boolean") return obj.ok;
  }
  return false;
}

function isGateValue(value: unknown): boolean {
  if (typeof value === "boolean") return true;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return typeof obj.passed === "boolean" || typeof obj.ok === "boolean";
  }
  return false;
}

/**
 * `proposal_signals` is a loosely-shaped jsonb blob (regime/gates/confluence
 * detail — see migration 014). Today the real generate-proposals function
 * emits `{}` (TODO placeholder), so this must degrade gracefully to `[]`.
 * Accepts, in order of preference:
 *   - `{ gates: [{name, passed|ok}, ...] }`
 *   - `{ gates: { gateName: boolean | {passed|ok} } }`
 *   - a flat object of `{ gateName: boolean | {passed|ok} }` at the top level
 */
export function deriveGateChips(signals: unknown): GateChip[] {
  if (!signals || typeof signals !== "object") return [];

  const obj = signals as Record<string, unknown>;
  const gatesSource = "gates" in obj ? obj.gates : obj;

  if (Array.isArray(gatesSource)) {
    return gatesSource
      .filter(
        (g): g is Record<string, unknown> =>
          !!g && typeof g === "object" && typeof (g as Record<string, unknown>).name === "string",
      )
      .map((g) => ({ name: g.name as string, passed: resolvePassed(g) }));
  }

  if (gatesSource && typeof gatesSource === "object") {
    return Object.entries(gatesSource as Record<string, unknown>)
      .filter(([key, value]) => key !== "gates" && isGateValue(value))
      .map(([key, value]) => ({ name: key, passed: resolvePassed(value) }));
  }

  return [];
}

// ── council verdict ──────────────────────────────────────────────────────

/**
 * `council_verdict` is `{votes:[{persona,vote,reason}],approve_count,reject_count}`
 * per migration 014, or `null` when no council ran yet. Returns `null` when
 * there is nothing to show (no verdict, or a verdict object with no `votes`
 * key at all) so callers can hide the whole section.
 */
export function deriveCouncilSummary(verdict: unknown): CouncilSummary | null {
  if (!verdict || typeof verdict !== "object") return null;

  const obj = verdict as Record<string, unknown>;
  if (!("votes" in obj)) return null;

  const rawVotes = Array.isArray(obj.votes) ? obj.votes : [];
  const votes: CouncilVote[] = [];
  for (const raw of rawVotes) {
    if (!raw || typeof raw !== "object") continue;
    const v = raw as Record<string, unknown>;
    if (typeof v.persona !== "string") continue;
    if (v.vote !== "approve" && v.vote !== "reject") continue;
    votes.push({
      persona: v.persona,
      vote: v.vote,
      reason: typeof v.reason === "string" ? v.reason : undefined,
    });
  }

  const approveCount =
    typeof obj.approve_count === "number" ? obj.approve_count : votes.filter((v) => v.vote === "approve").length;
  const rejectCount =
    typeof obj.reject_count === "number" ? obj.reject_count : votes.filter((v) => v.vote === "reject").length;

  return { votes, approveCount, rejectCount };
}

// ── persona initials ─────────────────────────────────────────────────────

/** "Aggressive Analyst" -> "AA", "Neutral" -> "NE", "" -> "?" */
export function personaInitials(persona: string): string {
  const trimmed = persona.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}
