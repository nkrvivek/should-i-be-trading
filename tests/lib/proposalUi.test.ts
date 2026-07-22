import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatCountdown,
  statusBadge,
  deriveGateChips,
  deriveCouncilSummary,
  personaInitials,
} from "../../src/lib/proposalUi";

describe("formatCountdown", () => {
  const now = new Date("2026-07-21T12:00:00Z").getTime();

  it("shows EXPIRED once the deadline has passed", () => {
    expect(formatCountdown("2026-07-21T11:59:00Z", now)).toBe("EXPIRED");
  });

  it("shows EXPIRED exactly at the deadline", () => {
    expect(formatCountdown("2026-07-21T12:00:00Z", now)).toBe("EXPIRED");
  });

  it("formats multi-day remaining time as Nd Nh", () => {
    expect(formatCountdown("2026-07-23T16:00:00Z", now)).toBe("2d 4h");
  });

  it("formats sub-day remaining time as Nh Nm", () => {
    expect(formatCountdown("2026-07-21T15:12:00Z", now)).toBe("3h 12m");
  });

  it("formats sub-hour remaining time as Nm", () => {
    expect(formatCountdown("2026-07-21T12:45:00Z", now)).toBe("45m");
  });

  it("formats sub-minute remaining time in seconds", () => {
    expect(formatCountdown("2026-07-21T12:00:30Z", now)).toBe("30s");
  });

  it("returns a dash for an unparseable timestamp", () => {
    expect(formatCountdown("not-a-date", now)).toBe("—");
  });

  it("defaults to Date.now() when nowMs is omitted", () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const future = new Date(now + 60_000).toISOString();
    expect(formatCountdown(future)).toBe("1m");
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

describe("statusBadge", () => {
  it("maps pending to a warning badge", () => {
    expect(statusBadge("pending")).toEqual({ label: "PENDING", variant: "warning" });
  });

  it("maps approved to a positive badge", () => {
    expect(statusBadge("approved")).toEqual({ label: "APPROVED", variant: "positive" });
  });

  it("maps rejected to a negative badge", () => {
    expect(statusBadge("rejected")).toEqual({ label: "REJECTED", variant: "negative" });
  });

  it("maps expired to a default badge", () => {
    expect(statusBadge("expired")).toEqual({ label: "EXPIRED", variant: "default" });
  });

  it("maps executing to an info badge", () => {
    expect(statusBadge("executing")).toEqual({ label: "EXECUTING", variant: "info" });
  });

  it("maps executed to a positive badge", () => {
    expect(statusBadge("executed")).toEqual({ label: "EXECUTED", variant: "positive" });
  });

  it("maps failed to a negative badge", () => {
    expect(statusBadge("failed")).toEqual({ label: "FAILED", variant: "negative" });
  });

  it("maps cancelled to a default badge", () => {
    expect(statusBadge("cancelled")).toEqual({ label: "CANCELLED", variant: "default" });
  });

  it("falls back to an uppercased default badge for unknown statuses", () => {
    expect(statusBadge("mystery")).toEqual({ label: "MYSTERY", variant: "default" });
  });
});

describe("deriveGateChips", () => {
  it("returns an empty array for null", () => {
    expect(deriveGateChips(null)).toEqual([]);
  });

  it("returns an empty array for undefined", () => {
    expect(deriveGateChips(undefined)).toEqual([]);
  });

  it("returns an empty array for a non-object (the current real-world {} placeholder resolves the same way)", () => {
    expect(deriveGateChips("nonsense")).toEqual([]);
    expect(deriveGateChips({})).toEqual([]);
  });

  it("derives chips from an array of {name, passed}", () => {
    const signals = { gates: [{ name: "per_name_risk_cap", passed: true }, { name: "kill_switch", passed: false }] };
    expect(deriveGateChips(signals)).toEqual([
      { name: "per_name_risk_cap", passed: true },
      { name: "kill_switch", passed: false },
    ]);
  });

  it("derives chips from an array using {ok} instead of {passed}", () => {
    const signals = { gates: [{ name: "coverage_available", ok: true }] };
    expect(deriveGateChips(signals)).toEqual([{ name: "coverage_available", passed: true }]);
  });

  it("filters out array entries missing a name", () => {
    const signals = { gates: [{ passed: true }, { name: "min_shares", passed: true }] };
    expect(deriveGateChips(signals)).toEqual([{ name: "min_shares", passed: true }]);
  });

  it("derives chips from a gates object map of booleans", () => {
    const signals = { gates: { per_name_risk_cap: true, kill_switch: false } };
    expect(deriveGateChips(signals)).toEqual([
      { name: "per_name_risk_cap", passed: true },
      { name: "kill_switch", passed: false },
    ]);
  });

  it("derives chips from a gates object map of {ok} objects", () => {
    const signals = { gates: { coverage_available: { ok: false } } };
    expect(deriveGateChips(signals)).toEqual([{ name: "coverage_available", passed: false }]);
  });

  it("falls back to treating the whole object as a gate map when there is no gates key", () => {
    const signals = { coverage_available: true, min_shares: false };
    expect(deriveGateChips(signals)).toEqual([
      { name: "coverage_available", passed: true },
      { name: "min_shares", passed: false },
    ]);
  });

  it("ignores non-gate-shaped keys (e.g. nested regime detail) when falling back to a flat object", () => {
    const signals = { regime: { label: "risk-on" }, coverage_available: true };
    expect(deriveGateChips(signals)).toEqual([{ name: "coverage_available", passed: true }]);
  });
});

describe("deriveCouncilSummary", () => {
  it("returns null for null", () => {
    expect(deriveCouncilSummary(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(deriveCouncilSummary(undefined)).toBeNull();
  });

  it("returns null for a non-object", () => {
    expect(deriveCouncilSummary("nonsense")).toBeNull();
  });

  it("returns null when the object has no votes key (matches today's real-world null verdict)", () => {
    expect(deriveCouncilSummary({})).toBeNull();
  });

  it("derives votes, approve count, and reject count", () => {
    const verdict = {
      votes: [
        { persona: "Aggressive Analyst", vote: "approve", reason: "flow confirms breakout" },
        { persona: "Conservative Analyst", vote: "reject", reason: "IV crush risk" },
      ],
      approve_count: 1,
      reject_count: 1,
    };
    expect(deriveCouncilSummary(verdict)).toEqual({
      votes: [
        { persona: "Aggressive Analyst", vote: "approve", reason: "flow confirms breakout" },
        { persona: "Conservative Analyst", vote: "reject", reason: "IV crush risk" },
      ],
      approveCount: 1,
      rejectCount: 1,
    });
  });

  it("computes approve/reject counts from votes when counts are absent", () => {
    const verdict = {
      votes: [
        { persona: "A", vote: "approve" },
        { persona: "B", vote: "approve" },
        { persona: "C", vote: "reject" },
      ],
    };
    expect(deriveCouncilSummary(verdict)).toEqual({
      votes: [
        { persona: "A", vote: "approve", reason: undefined },
        { persona: "B", vote: "approve", reason: undefined },
        { persona: "C", vote: "reject", reason: undefined },
      ],
      approveCount: 2,
      rejectCount: 1,
    });
  });

  it("filters out votes with an invalid vote value", () => {
    const verdict = { votes: [{ persona: "A", vote: "abstain" }, { persona: "B", vote: "approve" }] };
    expect(deriveCouncilSummary(verdict)).toEqual({
      votes: [{ persona: "B", vote: "approve", reason: undefined }],
      approveCount: 1,
      rejectCount: 0,
    });
  });

  it("filters out votes missing a persona", () => {
    const verdict = { votes: [{ vote: "approve" }, { persona: "B", vote: "reject" }] };
    expect(deriveCouncilSummary(verdict)).toEqual({
      votes: [{ persona: "B", vote: "reject", reason: undefined }],
      approveCount: 0,
      rejectCount: 1,
    });
  });

  it("returns an empty votes list when votes key is present but empty", () => {
    expect(deriveCouncilSummary({ votes: [] })).toEqual({ votes: [], approveCount: 0, rejectCount: 0 });
  });
});

describe("personaInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(personaInitials("Aggressive Analyst")).toBe("AA");
  });

  it("uppercases mixed-case input", () => {
    expect(personaInitials("neutral analyst")).toBe("NA");
  });

  it("takes the first two letters of a single word", () => {
    expect(personaInitials("Neutral")).toBe("NE");
  });

  it("returns ? for an empty string", () => {
    expect(personaInitials("")).toBe("?");
  });

  it("returns ? for a whitespace-only string", () => {
    expect(personaInitials("   ")).toBe("?");
  });
});
