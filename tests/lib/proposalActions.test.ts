import { describe, it, expect } from "vitest";
import {
  buildMagicLinkToken,
  verifyMagicLinkToken,
  buildProposalActionUrls,
  checkProposalTransition,
  mapBrokerStatusToExecutionStatus,
  buildOccSymbol,
  transitionProposal,
  writeStatusIfCurrently,
  type ConditionalStatusUpdate,
} from "../../src/lib/proposalActions";

const SECRET = "test-magic-link-secret";
const PID = "11111111-1111-1111-1111-111111111111";
const OTHER_PID = "22222222-2222-2222-2222-222222222222";
const FUTURE_EXPIRY = "2026-08-15T00:00:00.000Z"; // relative to fixed "now" below
const PAST_EXPIRY = "2026-07-01T00:00:00.000Z";
const NOW_MS = new Date("2026-07-21T12:00:00.000Z").getTime();

describe("buildMagicLinkToken / verifyMagicLinkToken", () => {
  it("verifies a token built for the same pid/action/exp", async () => {
    const token = await buildMagicLinkToken({ proposalId: PID, action: "approve", expiresAt: FUTURE_EXPIRY, secret: SECRET });
    const result = await verifyMagicLinkToken({ proposalId: PID, action: "approve", token, secret: SECRET, nowMs: NOW_MS });
    expect(result.ok).toBe(true);
  });

  it("rejects when the proposal id doesn't match (tampered pid)", async () => {
    const token = await buildMagicLinkToken({ proposalId: PID, action: "approve", expiresAt: FUTURE_EXPIRY, secret: SECRET });
    const result = await verifyMagicLinkToken({ proposalId: OTHER_PID, action: "approve", token, secret: SECRET, nowMs: NOW_MS });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad_signature");
  });

  it("rejects when the action doesn't match (approve token used as reject)", async () => {
    const token = await buildMagicLinkToken({ proposalId: PID, action: "approve", expiresAt: FUTURE_EXPIRY, secret: SECRET });
    const result = await verifyMagicLinkToken({ proposalId: PID, action: "reject", token, secret: SECRET, nowMs: NOW_MS });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad_signature");
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await buildMagicLinkToken({ proposalId: PID, action: "approve", expiresAt: FUTURE_EXPIRY, secret: SECRET });
    const result = await verifyMagicLinkToken({ proposalId: PID, action: "approve", token, secret: "wrong-secret", nowMs: NOW_MS });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad_signature");
  });

  it("rejects a token whose exp has passed", async () => {
    const token = await buildMagicLinkToken({ proposalId: PID, action: "approve", expiresAt: PAST_EXPIRY, secret: SECRET });
    const result = await verifyMagicLinkToken({ proposalId: PID, action: "approve", token, secret: SECRET, nowMs: NOW_MS });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("expired");
  });

  it("accepts a token right up until its expires_at (TTL == proposal expiry, not a shorter window)", async () => {
    const token = await buildMagicLinkToken({ proposalId: PID, action: "approve", expiresAt: FUTURE_EXPIRY, secret: SECRET });
    const justBefore = new Date(FUTURE_EXPIRY).getTime() - 1000;
    const result = await verifyMagicLinkToken({ proposalId: PID, action: "approve", token, secret: SECRET, nowMs: justBefore });
    expect(result.ok).toBe(true);
  });

  it("rejects a malformed token with no separator", async () => {
    const result = await verifyMagicLinkToken({ proposalId: PID, action: "approve", token: "not-a-real-token", secret: SECRET, nowMs: NOW_MS });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("malformed_token");
  });

  it("rejects a token with a non-numeric exp segment", async () => {
    const result = await verifyMagicLinkToken({ proposalId: PID, action: "approve", token: "abc.somesignature", secret: SECRET, nowMs: NOW_MS });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("malformed_token");
  });
});

describe("buildProposalActionUrls", () => {
  it("produces approve and reject URLs carrying the pid, action, and distinct tokens", async () => {
    const urls = await buildProposalActionUrls({ proposalId: PID, expiresAt: FUTURE_EXPIRY, baseUrl: "https://sibt.ai", secret: SECRET });
    expect(urls.approveUrl).toContain(`pid=${PID}`);
    expect(urls.approveUrl).toContain("action=approve");
    expect(urls.rejectUrl).toContain("action=reject");
    expect(urls.approveUrl).not.toBe(urls.rejectUrl);
  });

  it("strips a trailing slash from baseUrl", async () => {
    const urls = await buildProposalActionUrls({ proposalId: PID, expiresAt: FUTURE_EXPIRY, baseUrl: "https://sibt.ai/", secret: SECRET });
    expect(urls.approveUrl.startsWith("https://sibt.ai/functions/v1/proposal-action?")).toBe(true);
  });

  it("each URL's token independently verifies for its own action", async () => {
    const urls = await buildProposalActionUrls({ proposalId: PID, expiresAt: FUTURE_EXPIRY, baseUrl: "https://sibt.ai", secret: SECRET });
    const approveToken = new URL(urls.approveUrl).searchParams.get("token")!;
    const rejectToken = new URL(urls.rejectUrl).searchParams.get("token")!;
    const approveResult = await verifyMagicLinkToken({ proposalId: PID, action: "approve", token: approveToken, secret: SECRET, nowMs: NOW_MS });
    const rejectResult = await verifyMagicLinkToken({ proposalId: PID, action: "reject", token: rejectToken, secret: SECRET, nowMs: NOW_MS });
    expect(approveResult.ok).toBe(true);
    expect(rejectResult.ok).toBe(true);
  });
});

describe("checkProposalTransition (state guard)", () => {
  it("allows pending -> approved", () => {
    const result = checkProposalTransition({ status: "pending", expiresAt: FUTURE_EXPIRY, action: "approve", nowMs: NOW_MS });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.nextStatus).toBe("approved");
  });

  it("allows pending -> rejected", () => {
    const result = checkProposalTransition({ status: "pending", expiresAt: FUTURE_EXPIRY, action: "reject", nowMs: NOW_MS });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.nextStatus).toBe("rejected");
  });

  it("rejects a second approve on an already-approved proposal", () => {
    const result = checkProposalTransition({ status: "approved", expiresAt: FUTURE_EXPIRY, action: "approve", nowMs: NOW_MS });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_pending");
  });

  it("rejects acting on an already-rejected proposal", () => {
    const result = checkProposalTransition({ status: "rejected", expiresAt: FUTURE_EXPIRY, action: "reject", nowMs: NOW_MS });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_pending");
  });

  it("rejects approving a proposal that is already executing", () => {
    const result = checkProposalTransition({ status: "executing", expiresAt: FUTURE_EXPIRY, action: "approve", nowMs: NOW_MS });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_pending");
  });

  it("rejects a pending proposal whose expires_at has passed", () => {
    const result = checkProposalTransition({ status: "pending", expiresAt: PAST_EXPIRY, action: "approve", nowMs: NOW_MS });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("expired");
  });

  it("checks not_pending before expired when both would apply", () => {
    // An already-executed proposal whose expiry also happens to be in the
    // past should report the more specific 'not_pending' reason, not
    // 'expired' — status is checked first.
    const result = checkProposalTransition({ status: "executed", expiresAt: PAST_EXPIRY, action: "approve", nowMs: NOW_MS });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_pending");
  });
});

/** In-memory fake of the real Supabase-backed ConditionalStatusUpdate
 * (proposal-action/index.ts's makeConditionalStatusUpdate) — a single row
 * keyed by proposal id, with "first caller wins" semantics: an UPDATE only
 * takes effect (and only returns true) if the row's current status still
 * matches `expectedPriorStatus` at the moment it runs, exactly like the real
 * `.eq("status", expectedPriorStatus)` conditional UPDATE. This is what lets
 * these tests prove the double-tap/retry race is closed without a database. */
function makeFakeConditionalStatusUpdate(initialStatus: string): { updateStatus: ConditionalStatusUpdate; getStatus: () => string } {
  let status = initialStatus;
  const updateStatus: ConditionalStatusUpdate = async (_proposalId, expectedPriorStatus, patch) => {
    if (status !== expectedPriorStatus) return false;
    status = (patch.status as string) ?? status;
    return true;
  };
  return { updateStatus, getStatus: () => status };
}

describe("transitionProposal (atomic pending -> approved/rejected authority)", () => {
  it("approves once and reports the new status", async () => {
    const { updateStatus, getStatus } = makeFakeConditionalStatusUpdate("pending");
    const result = await transitionProposal({
      proposalId: PID,
      status: "pending",
      expiresAt: FUTURE_EXPIRY,
      action: "approve",
      patch: { status: "approved" },
      updateStatus,
      nowMs: NOW_MS,
    });
    expect(result).toEqual({ ok: true, nextStatus: "approved" });
    expect(getStatus()).toBe("approved");
  });

  it("double-approve: the second call gets a conflict, not a second execution", async () => {
    const { updateStatus, getStatus } = makeFakeConditionalStatusUpdate("pending");
    // Both callers read the same 'pending' status before either writes —
    // the race this fix closes (double-tap, client retry, magic-link race).
    const first = await transitionProposal({
      proposalId: PID,
      status: "pending",
      expiresAt: FUTURE_EXPIRY,
      action: "approve",
      patch: { status: "approved" },
      updateStatus,
      nowMs: NOW_MS,
    });
    const second = await transitionProposal({
      proposalId: PID,
      status: "pending", // same stale read both callers started from
      expiresAt: FUTURE_EXPIRY,
      action: "approve",
      patch: { status: "approved" },
      updateStatus,
      nowMs: NOW_MS,
    });
    expect(first).toEqual({ ok: true, nextStatus: "approved" });
    expect(second).toEqual({ ok: false, reason: "conflict" });
    expect(getStatus()).toBe("approved"); // only ever transitioned once
  });

  it("concurrent approve + reject on the same pending proposal: only one wins", async () => {
    const { updateStatus, getStatus } = makeFakeConditionalStatusUpdate("pending");
    const approve = await transitionProposal({
      proposalId: PID,
      status: "pending",
      expiresAt: FUTURE_EXPIRY,
      action: "approve",
      patch: { status: "approved" },
      updateStatus,
      nowMs: NOW_MS,
    });
    const reject = await transitionProposal({
      proposalId: PID,
      status: "pending",
      expiresAt: FUTURE_EXPIRY,
      action: "reject",
      patch: { status: "rejected" },
      updateStatus,
      nowMs: NOW_MS,
    });
    expect(approve.ok).toBe(true);
    expect(reject).toEqual({ ok: false, reason: "conflict" });
    expect(getStatus()).toBe("approved");
  });

  it("never calls updateStatus at all when the cheap pre-check already rejects (expired)", async () => {
    let called = false;
    const updateStatus: ConditionalStatusUpdate = async () => {
      called = true;
      return true;
    };
    const result = await transitionProposal({
      proposalId: PID,
      status: "pending",
      expiresAt: PAST_EXPIRY,
      action: "approve",
      patch: { status: "approved" },
      updateStatus,
      nowMs: NOW_MS,
    });
    expect(result).toEqual({ ok: false, reason: "expired" });
    expect(called).toBe(false);
  });
});

describe("writeStatusIfCurrently (guarded write for post-approval status steps)", () => {
  it("writes when the expected prior status still matches", async () => {
    const { updateStatus, getStatus } = makeFakeConditionalStatusUpdate("approved");
    const result = await writeStatusIfCurrently({
      proposalId: PID,
      expectedPriorStatus: "approved",
      patch: { status: "executing" },
      updateStatus,
    });
    expect(result).toEqual({ ok: true });
    expect(getStatus()).toBe("executing");
  });

  it("reports conflict and does not write when the status has already moved on", async () => {
    const { updateStatus, getStatus } = makeFakeConditionalStatusUpdate("executed");
    const result = await writeStatusIfCurrently({
      proposalId: PID,
      expectedPriorStatus: "executing",
      patch: { status: "failed" },
      updateStatus,
    });
    expect(result).toEqual({ ok: false, reason: "conflict" });
    expect(getStatus()).toBe("executed"); // untouched
  });
});

describe("mapBrokerStatusToExecutionStatus (fail-closed mapping)", () => {
  it("maps EXECUTED to executed", () => {
    expect(mapBrokerStatusToExecutionStatus("EXECUTED")).toEqual({ status: "executed", event: "order_executed" });
  });

  it("maps FILLED to executed", () => {
    expect(mapBrokerStatusToExecutionStatus("FILLED")).toEqual({ status: "executed", event: "order_executed" });
  });

  it("maps lowercase 'filled' to executed (case-insensitive)", () => {
    expect(mapBrokerStatusToExecutionStatus("filled")).toEqual({ status: "executed", event: "order_executed" });
  });

  it("maps CANCELLED to failed", () => {
    expect(mapBrokerStatusToExecutionStatus("CANCELLED")).toEqual({ status: "failed", event: "order_failed" });
  });

  it("maps REJECTED to failed", () => {
    expect(mapBrokerStatusToExecutionStatus("REJECTED")).toEqual({ status: "failed", event: "order_failed" });
  });

  it("fails closed to executing/verify_pending on PENDING (not yet terminal)", () => {
    expect(mapBrokerStatusToExecutionStatus("PENDING")).toEqual({ status: "executing", event: "verify_pending" });
  });

  it("fails closed to executing/verify_pending on a null status (failed poll)", () => {
    expect(mapBrokerStatusToExecutionStatus(null)).toEqual({ status: "executing", event: "verify_pending" });
  });

  it("fails closed to executing/verify_pending on an unrecognized status string", () => {
    expect(mapBrokerStatusToExecutionStatus("SOME_NEW_BROKER_STATE")).toEqual({ status: "executing", event: "verify_pending" });
  });

  it("fails closed to executing/verify_pending on a partial fill", () => {
    expect(mapBrokerStatusToExecutionStatus("PARTIAL_FILLED")).toEqual({ status: "executing", event: "verify_pending" });
  });
});

describe("buildOccSymbol", () => {
  it("builds a standard OCC symbol from ticker/expiry/right/strike", () => {
    expect(buildOccSymbol({ ticker: "AAPL", expiry: "2026-08-15", right: "C", strike: 250 })).toBe("AAPL  260815C00250000");
  });

  it("pads a short ticker root to 6 characters", () => {
    const symbol = buildOccSymbol({ ticker: "F", expiry: "2026-01-16", right: "P", strike: 12.5 });
    expect(symbol.slice(0, 6)).toBe("F     ");
    expect(symbol).toBe("F     260116P00012500");
  });

  it("handles a fractional strike correctly (strike * 1000)", () => {
    const symbol = buildOccSymbol({ ticker: "SOFI", expiry: "2026-09-18", right: "C", strike: 8.5 });
    expect(symbol.endsWith("C00008500")).toBe(true);
  });

  it("strips dots from a dotted ticker before padding the root (BRK.B)", () => {
    const symbol = buildOccSymbol({ ticker: "BRK.B", expiry: "2026-08-21", right: "C", strike: 450 });
    expect(symbol.slice(0, 6)).toBe("BRKB  ");
    expect(symbol).toBe("BRKB  260821C00450000");
  });
});
