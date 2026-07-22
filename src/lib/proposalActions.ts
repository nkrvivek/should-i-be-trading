/**
 * Proposal Actions — pure logic for the HITL approve/execute rail (WS3a,
 * docs/relaunch-plan-2026-07.md Phase 2).
 *
 * Dependency-free (no Deno/Supabase imports) so it can be imported by both
 * the proposal-action edge function (Deno, relative .ts import — the same
 * pattern generate-proposals/index.ts already uses to import
 * src/lib/proposalEngine.ts) and by vitest unit tests under tests/lib/. Uses
 * only the Web Crypto API (globalThis.crypto.subtle), which is available in
 * both Deno and Node/jsdom test environments.
 *
 * Three independently testable areas:
 *
 *   1. Magic-link tokens — HMAC-SHA256 over pid+action+exp. The token's TTL
 *      is always the PROPOSAL's own expires_at, never a shorter fixed
 *      window — a link must stay valid exactly as long as its ticket. (A
 *      shorter-TTL bug was fixed elsewhere in the stack 2026-07-21; this
 *      module is built the correct way from the start.)
 *
 *   2. State-transition guard — a proposal may be acted on exactly once,
 *      only while pending, and only before its expires_at. Blocks a
 *      double-approve, a reject-after-approve, or a stale link firing on an
 *      already-terminal proposal.
 *
 *   3. Fail-closed execution-status mapping — a raw broker order status maps
 *      to 'executed' only on an explicit fill signal, and to 'failed' only
 *      on an explicit terminal-failure signal. Anything else (pending,
 *      partial, unrecognized, or a failed poll) stays 'executing' with a
 *      'verify_pending' event — this function must never report a fill the
 *      broker has not confirmed.
 */

export type ProposalAction = "approve" | "reject";

// ── base64url + constant-time compare ────────────────────────────────────

function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── HMAC-SHA256 signing (same crypto.subtle.importKey/sign shape as
// supabase/functions/_shared/snaptradeClient.ts's signRequest) ───────────

async function hmacSign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return base64urlEncode(new Uint8Array(sig));
}

function tokenMessage(proposalId: string, action: ProposalAction, expEpochSec: number): string {
  return `${proposalId}:${action}:${expEpochSec}`;
}

// ── Magic-link token build/verify ─────────────────────────────────────────

export interface BuildTokenParams {
  proposalId: string;
  action: ProposalAction;
  /** The proposal's own expires_at (ISO timestamp) — never pass a shorter
   * synthetic window here. The token's TTL IS this value. */
  expiresAt: string;
  secret: string;
}

/** Build a magic-link token: "{expEpochSeconds}.{base64url sig}". The
 * signature covers proposalId, action, and exp, so tampering with any of
 * the three invalidates it. */
export async function buildMagicLinkToken(params: BuildTokenParams): Promise<string> {
  const expEpochSec = Math.floor(new Date(params.expiresAt).getTime() / 1000);
  const sig = await hmacSign(params.secret, tokenMessage(params.proposalId, params.action, expEpochSec));
  return `${expEpochSec}.${sig}`;
}

export interface VerifyTokenParams {
  proposalId: string;
  action: ProposalAction;
  token: string;
  secret: string;
  /** Injected for testability; defaults to Date.now(). */
  nowMs?: number;
}

export type TokenVerifyResult =
  | { ok: true }
  | { ok: false; reason: "malformed_token" | "bad_signature" | "expired" };

/** Verify a magic-link token against the pid/action it claims to authorize.
 * Fails closed on a malformed token, a signature mismatch (tampered pid,
 * action, or exp), or an expired exp. */
export async function verifyMagicLinkToken(params: VerifyTokenParams): Promise<TokenVerifyResult> {
  const dot = params.token.indexOf(".");
  if (dot <= 0 || dot === params.token.length - 1) {
    return { ok: false, reason: "malformed_token" };
  }
  const expStr = params.token.slice(0, dot);
  const sig = params.token.slice(dot + 1);
  if (!/^[0-9]+$/.test(expStr)) {
    return { ok: false, reason: "malformed_token" };
  }
  const expEpochSec = Number(expStr);

  const expectedSig = await hmacSign(params.secret, tokenMessage(params.proposalId, params.action, expEpochSec));
  if (!timingSafeEqual(sig, expectedSig)) {
    return { ok: false, reason: "bad_signature" };
  }

  const now = params.nowMs ?? Date.now();
  if (expEpochSec * 1000 < now) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true };
}

// ── Proposal action URLs (for email — WS-later reuse) ─────────────────────

export interface ProposalActionUrls {
  approveUrl: string;
  rejectUrl: string;
}

export interface BuildActionUrlsParams {
  proposalId: string;
  /** The proposal's own expires_at — passed straight through to
   * buildMagicLinkToken so both URLs live exactly as long as the ticket. */
  expiresAt: string;
  /** Base app URL, e.g. Deno.env.get("PUBLIC_APP_URL"). No trailing slash
   * required — one is stripped if present. */
  baseUrl: string;
  /** Deno.env.get("MAGIC_LINK_SECRET"). */
  secret: string;
}

/** Build the two magic-link URLs for a proposal. Both point at the
 * proposal-action edge function's GET handler, which renders a confirm page
 * before anything executes — the two-step, prefetch-safe pattern (a bare
 * GET, e.g. from an email link-scanner, never triggers an action). */
export async function buildProposalActionUrls(params: BuildActionUrlsParams): Promise<ProposalActionUrls> {
  const base = params.baseUrl.replace(/\/+$/, "");
  const [approveToken, rejectToken] = await Promise.all([
    buildMagicLinkToken({ proposalId: params.proposalId, action: "approve", expiresAt: params.expiresAt, secret: params.secret }),
    buildMagicLinkToken({ proposalId: params.proposalId, action: "reject", expiresAt: params.expiresAt, secret: params.secret }),
  ]);
  const qs = (action: ProposalAction, token: string) =>
    `pid=${encodeURIComponent(params.proposalId)}&action=${action}&token=${encodeURIComponent(token)}`;
  return {
    approveUrl: `${base}/functions/v1/proposal-action?${qs("approve", approveToken)}`,
    rejectUrl: `${base}/functions/v1/proposal-action?${qs("reject", rejectToken)}`,
  };
}

// ── State-transition guard ─────────────────────────────────────────────────

export interface TransitionParams {
  /** The proposal's current status column value. */
  status: string;
  /** The proposal's expires_at. */
  expiresAt: string;
  action: ProposalAction;
  nowMs?: number;
}

export type TransitionResult =
  | { ok: true; nextStatus: "approved" | "rejected" }
  | { ok: false; reason: "not_pending" | "expired" };

/** Guard the pending -> approved/rejected transition. A proposal may only be
 * acted on once, while still 'pending', and before its expires_at — every
 * other status (already approved/rejected/executing/executed/failed/
 * cancelled) or an expired-but-still-pending proposal is rejected with an
 * explicit machine-readable reason. This is what stops a double-approve or a
 * stale magic link from re-triggering execution. */
export function checkProposalTransition(params: TransitionParams): TransitionResult {
  if (params.status !== "pending") {
    return { ok: false, reason: "not_pending" };
  }
  const now = params.nowMs ?? Date.now();
  if (new Date(params.expiresAt).getTime() < now) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, nextStatus: params.action === "approve" ? "approved" : "rejected" };
}

// ── Fail-closed execution-status mapping ───────────────────────────────────

export type ExecutionStatus = "executed" | "failed" | "executing";

export interface ExecutionMappingResult {
  status: ExecutionStatus;
  event: "order_executed" | "order_failed" | "verify_pending";
}

const TERMINAL_FILLED = new Set(["EXECUTED", "FILLED"]);
const TERMINAL_FAILED = new Set(["CANCELLED", "CANCELED", "REJECTED", "FAILED", "EXPIRED"]);

/** Map a raw broker order-status string to our proposal execution status.
 * Fails closed: only an explicit filled/executed signal returns 'executed';
 * only an explicit cancelled/rejected/failed/expired signal returns
 * 'failed'. Everything else — pending, partial fills, an unrecognized
 * status string, or null from a failed status poll — stays 'executing' with
 * a 'verify_pending' event, so a proposal is never marked executed without
 * broker confirmation. */
export function mapBrokerStatusToExecutionStatus(brokerStatus: string | null | undefined): ExecutionMappingResult {
  const normalized = (brokerStatus ?? "").toUpperCase();
  if (TERMINAL_FILLED.has(normalized)) {
    return { status: "executed", event: "order_executed" };
  }
  if (TERMINAL_FAILED.has(normalized)) {
    return { status: "failed", event: "order_failed" };
  }
  return { status: "executing", event: "verify_pending" };
}

// ── OCC symbol helper (stub-level — see proposal-action/index.ts) ────────

export interface OccSymbolParams {
  ticker: string;
  /** ISO date, YYYY-MM-DD. */
  expiry: string;
  right: "C" | "P";
  strike: number;
}

/** Build a standard 21-character OCC option symbol (root padded to 6 chars +
 * YYMMDD + C/P + 8-digit strike-in-thousandths). This is a stand-in: today's
 * proposals.legs rows (see generate-proposals/index.ts's candidateToInsertRow)
 * carry no occ_symbol, and SnapTrade's real order-placement API resolves
 * options via a universal_symbol lookup rather than a raw OCC string —
 * broker-snaptrade/index.ts's existing placeOrder action already just
 * forwards order.symbol as-is, so this matches that same integration depth
 * rather than a full SnapTrade symbol-resolution implementation. */
export function buildOccSymbol(params: OccSymbolParams): string {
  const root = params.ticker.toUpperCase().padEnd(6, " ").slice(0, 6);
  const [y, m, d] = params.expiry.split("-");
  const yy = y.slice(2);
  const strikeThousandths = Math.round(params.strike * 1000);
  const strikeStr = String(strikeThousandths).padStart(8, "0");
  return `${root}${yy}${m}${d}${params.right}${strikeStr}`;
}
