import { describe, it, expect } from "vitest";
import {
  fingerprint,
  isDuplicateCandidate,
  openCoveredCallContracts,
  availableCoverageContracts,
  openNameRiskUsd,
  checkPerNameRiskCap,
  checkMaxPendingProposals,
  checkKillSwitch,
  checkCoverageAvailable,
  checkMinimumShares,
  buildCoveredCallCandidates,
  stubStrikeSelector,
  type OpenProposal,
  type EquityHolding,
} from "../../src/lib/proposalEngine";

const TODAY = "2026-07-21";

function makeOpenProposal(overrides: Partial<OpenProposal> = {}): OpenProposal {
  return {
    ticker: "AAPL",
    structure: "covered_call",
    expiry: "2026-08-15",
    strike: 250,
    qty: 1,
    maxLossUsd: null,
    collateralUsd: 25000,
    status: "approved",
    ...overrides,
  };
}

describe("fingerprint", () => {
  it("produces the same key for identical ticker+structure+expiry+strike", () => {
    const a = { ticker: "AAPL", structure: "covered_call" as const, expiry: "2026-08-15", strike: 250 };
    const b = { ticker: "aapl", structure: "covered_call" as const, expiry: "2026-08-15", strike: 250 };
    expect(fingerprint(a)).toBe(fingerprint(b));
  });

  it("produces different keys when strike differs", () => {
    const a = { ticker: "AAPL", structure: "covered_call" as const, expiry: "2026-08-15", strike: 250 };
    const b = { ticker: "AAPL", structure: "covered_call" as const, expiry: "2026-08-15", strike: 260 };
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });
});

describe("isDuplicateCandidate (fingerprint dedup)", () => {
  it("flags a candidate matching an existing pending proposal's fingerprint", () => {
    const existing = [makeOpenProposal({ status: "pending" })];
    const candidate = { ticker: "AAPL", structure: "covered_call" as const, expiry: "2026-08-15", strike: 250 };
    expect(isDuplicateCandidate(candidate, existing)).toBe(true);
  });

  it("does not flag a candidate with a different strike as duplicate", () => {
    const existing = [makeOpenProposal({ status: "pending", strike: 250 })];
    const candidate = { ticker: "AAPL", structure: "covered_call" as const, expiry: "2026-08-15", strike: 260 };
    expect(isDuplicateCandidate(candidate, existing)).toBe(false);
  });
});

describe("openCoveredCallContracts (coverage guard)", () => {
  it("subtracts contracts already written and live for the same ticker", () => {
    const proposals = [makeOpenProposal({ ticker: "AAPL", qty: 2, status: "approved" })];
    const written = openCoveredCallContracts(proposals, TODAY);
    expect(written["AAPL"]).toBe(2);
  });

  it("ignores expired legs when computing already-written contracts", () => {
    const proposals = [makeOpenProposal({ ticker: "AAPL", qty: 2, expiry: "2026-01-01", status: "approved" })];
    const written = openCoveredCallContracts(proposals, TODAY);
    expect(written["AAPL"]).toBeUndefined();
  });

  it("ignores non-live statuses (rejected/expired) when computing already-written contracts", () => {
    const proposals = [makeOpenProposal({ ticker: "AAPL", qty: 2, status: "rejected" })];
    const written = openCoveredCallContracts(proposals, TODAY);
    expect(written["AAPL"]).toBeUndefined();
  });
});

describe("availableCoverageContracts (coverage subtraction)", () => {
  it("returns shares_held // 100 minus already-written contracts", () => {
    expect(availableCoverageContracts(500, 2)).toBe(3);
  });

  it("never returns negative when already-written exceeds the lot count", () => {
    expect(availableCoverageContracts(200, 5)).toBe(0);
  });

  it("floors partial lots", () => {
    expect(availableCoverageContracts(250, 0)).toBe(2);
  });
});

describe("checkCoverageAvailable / checkMinimumShares", () => {
  it("rejects with below_100_share_lot when shares held is under one lot", () => {
    const result = checkMinimumShares(50);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("below_100_share_lot");
  });

  it("rejects with no_coverage_available when the guard has consumed all lots", () => {
    const result = checkCoverageAvailable({ sharesHeld: 100, alreadyWrittenContracts: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no_coverage_available");
  });

  it("passes when at least one contract of coverage remains", () => {
    const result = checkCoverageAvailable({ sharesHeld: 300, alreadyWrittenContracts: 1 });
    expect(result.ok).toBe(true);
  });
});

describe("openNameRiskUsd (open-risk ledger)", () => {
  it("sums collateral across multiple live proposals for the same name", () => {
    const proposals = [
      makeOpenProposal({ ticker: "AAPL", collateralUsd: 10000, status: "approved" }),
      makeOpenProposal({ ticker: "AAPL", collateralUsd: 5000, status: "executed" }),
    ];
    const risk = openNameRiskUsd(proposals, TODAY);
    expect(risk["AAPL"]).toBe(15000);
  });

  it("prefers maxLossUsd over collateralUsd when both are present", () => {
    const proposals = [makeOpenProposal({ ticker: "MSFT", maxLossUsd: 3000, collateralUsd: 10000, status: "approved" })];
    const risk = openNameRiskUsd(proposals, TODAY);
    expect(risk["MSFT"]).toBe(3000);
  });
});

describe("checkPerNameRiskCap (cap arithmetic + rejection reason)", () => {
  it("rejects when projected risk exceeds the per-name cap, carrying a reason", () => {
    const result = checkPerNameRiskCap({
      ticker: "AAPL",
      candidateRiskUsd: 6000,
      accountEquityUsd: 50000, // 10% cap = $5,000
      openRiskByTicker: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("per_name_risk_cap_exceeded");
      expect(result.detail.capUsd).toBe(5000);
      expect(result.detail.projectedRiskUsd).toBe(6000);
    }
  });

  it("accounts for existing open risk when checking the cap", () => {
    const result = checkPerNameRiskCap({
      ticker: "AAPL",
      candidateRiskUsd: 2000,
      accountEquityUsd: 50000, // 10% cap = $5,000
      openRiskByTicker: { AAPL: 4000 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.detail.projectedRiskUsd).toBe(6000);
  });

  it("passes when projected risk stays under the cap", () => {
    const result = checkPerNameRiskCap({
      ticker: "AAPL",
      candidateRiskUsd: 1000,
      accountEquityUsd: 50000,
      openRiskByTicker: {},
    });
    expect(result.ok).toBe(true);
  });

  it("fails closed with no_account_equity when account equity is unknown", () => {
    const result = checkPerNameRiskCap({
      ticker: "AAPL",
      candidateRiskUsd: 100,
      accountEquityUsd: 0,
      openRiskByTicker: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no_account_equity");
  });
});

describe("checkMaxPendingProposals (max-pending guard)", () => {
  it("rejects at the default cap of 3 pending proposals", () => {
    const result = checkMaxPendingProposals({ currentPendingCount: 3 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("max_pending_proposals_reached");
  });

  it("passes below the cap", () => {
    const result = checkMaxPendingProposals({ currentPendingCount: 2 });
    expect(result.ok).toBe(true);
  });
});

describe("checkKillSwitch", () => {
  it("rejects when the kill switch is engaged", () => {
    const result = checkKillSwitch(true);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("kill_switch_engaged");
  });

  it("passes when the kill switch is off", () => {
    expect(checkKillSwitch(false).ok).toBe(true);
  });
});

describe("buildCoveredCallCandidates (integration of gates + builder)", () => {
  const baseHolding: EquityHolding = { ticker: "AAPL", sharesHeld: 300, avgPrice: 180, marketValue: 60000 }; // spot=200

  it("builds one candidate per eligible holding with the stub strike ~5% OTM", async () => {
    const { candidates, rejections } = await buildCoveredCallCandidates({
      holdings: [baseHolding],
      openProposals: [],
      accountEquityUsd: 1_000_000,
      today: TODAY,
    });
    const stub = await stubStrikeSelector({ ticker: "AAPL", spot: 200, costBasis: 180, today: TODAY });
    expect(rejections).toHaveLength(0);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].ticker).toBe("AAPL");
    expect(candidates[0].contracts).toBe(3);
    expect(candidates[0].strike).toBe(stub!.strike);
    expect(candidates[0].strikeSource).toBe("stub");
    expect(candidates[0].earningsStatus).toBe("clear");
  });

  it("rejects a holding under 100 shares with below_100_share_lot", async () => {
    const { candidates, rejections } = await buildCoveredCallCandidates({
      holdings: [{ ticker: "SOFI", sharesHeld: 40, avgPrice: 10, marketValue: 400 }],
      openProposals: [],
      accountEquityUsd: 1_000_000,
      today: TODAY,
    });
    expect(candidates).toHaveLength(0);
    expect(rejections).toEqual([
      { ticker: "SOFI", reason: "below_100_share_lot", detail: expect.objectContaining({ sharesHeld: 40 }) },
    ]);
  });

  it("reduces contract count by already-written calls and rejects fully-covered holdings", async () => {
    const openProposals = [makeOpenProposal({ ticker: "AAPL", qty: 3, status: "approved" })];
    const { candidates, rejections } = await buildCoveredCallCandidates({
      holdings: [baseHolding], // 300 shares -> 3 lots, all 3 already written
      openProposals,
      accountEquityUsd: 1_000_000,
      today: TODAY,
    });
    expect(candidates).toHaveLength(0);
    expect(rejections[0].reason).toBe("no_coverage_available");
  });

  it("skips a candidate that duplicates an existing pending proposal's fingerprint", async () => {
    const stub = await stubStrikeSelector({ ticker: "AAPL", spot: 200, costBasis: 180, today: TODAY });
    const openProposals = [
      makeOpenProposal({
        ticker: "AAPL",
        structure: "covered_call",
        expiry: stub!.expiry,
        strike: stub!.strike,
        status: "pending",
        qty: 1,
      }),
    ];
    const { candidates, rejections } = await buildCoveredCallCandidates({
      holdings: [baseHolding],
      openProposals,
      accountEquityUsd: 1_000_000,
      today: TODAY,
    });
    expect(candidates).toHaveLength(0);
    expect(rejections[0].reason).toBe("duplicate_fingerprint");
  });

  it("rejects when the per-name open-risk cap would be exceeded", async () => {
    const { candidates, rejections } = await buildCoveredCallCandidates({
      holdings: [baseHolding], // candidate risk = strike(~210)*100*3 ≈ $63,000
      openProposals: [],
      accountEquityUsd: 100_000, // 10% cap = $10,000 — far under candidate risk
      today: TODAY,
    });
    expect(candidates).toHaveLength(0);
    expect(rejections[0].reason).toBe("per_name_risk_cap_exceeded");
  });

  it("processes multiple holdings independently, mixing approvals and rejections", async () => {
    const { candidates, rejections } = await buildCoveredCallCandidates({
      holdings: [baseHolding, { ticker: "SOFI", sharesHeld: 40, avgPrice: 10, marketValue: 400 }],
      openProposals: [],
      accountEquityUsd: 1_000_000,
      today: TODAY,
    });
    expect(candidates).toHaveLength(1);
    expect(candidates[0].ticker).toBe("AAPL");
    expect(rejections).toHaveLength(1);
    expect(rejections[0].ticker).toBe("SOFI");
  });

  it("rejects with no_valid_strike when the injected strike selector returns null (no chain)", async () => {
    const { candidates, rejections } = await buildCoveredCallCandidates({
      holdings: [baseHolding],
      openProposals: [],
      accountEquityUsd: 1_000_000,
      today: TODAY,
      strikeSelector: async () => null,
    });
    expect(candidates).toHaveLength(0);
    expect(rejections[0].reason).toBe("no_valid_strike");
  });

  it("rejects with earnings_window_blocked when the earnings checker reports blocked", async () => {
    const { candidates, rejections } = await buildCoveredCallCandidates({
      holdings: [baseHolding],
      openProposals: [],
      accountEquityUsd: 1_000_000,
      today: TODAY,
      earningsChecker: async () => "blocked",
    });
    expect(candidates).toHaveLength(0);
    expect(rejections[0].reason).toBe("earnings_window_blocked");
  });

  it("does not block on earnings_unknown, but carries the status onto the candidate", async () => {
    const { candidates, rejections } = await buildCoveredCallCandidates({
      holdings: [baseHolding],
      openProposals: [],
      accountEquityUsd: 1_000_000,
      today: TODAY,
      earningsChecker: async () => "unknown",
    });
    expect(rejections).toHaveLength(0);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].earningsStatus).toBe("unknown");
  });

  it("counts a broker-side short call the internal ledger doesn't know about (external/manual write)", async () => {
    // No open_proposals row at all for this ticker — only the broker's real
    // option book (via brokerShortCallsByTicker) knows a call is written.
    // Coverage guard fix: this must still reduce available contracts, not
    // just the internal proposals-table ledger.
    const { candidates, rejections } = await buildCoveredCallCandidates({
      holdings: [baseHolding], // 300 shares -> 3 lots
      openProposals: [],
      accountEquityUsd: 1_000_000,
      today: TODAY,
      brokerShortCallsByTicker: { AAPL: 2 },
    });
    expect(rejections).toHaveLength(0);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].contracts).toBe(1); // 3 lots - 2 broker-written = 1 available
  });

  it("takes the broker count over the internal ledger when the broker count is higher (max, not sum)", async () => {
    const openProposals = [makeOpenProposal({ ticker: "AAPL", qty: 1, status: "approved" })];
    const { candidates } = await buildCoveredCallCandidates({
      holdings: [baseHolding],
      openProposals, // internal ledger says 1 written
      accountEquityUsd: 1_000_000,
      today: TODAY,
      brokerShortCallsByTicker: { AAPL: 2 }, // broker says 2 written — higher, wins
    });
    expect(candidates[0].contracts).toBe(1); // 3 lots - max(1, 2) = 1, never 3 - (1+2)
  });

  it("keeps the internal ledger as a floor when the broker feed lags (internal higher than broker)", async () => {
    const openProposals = [makeOpenProposal({ ticker: "AAPL", qty: 3, status: "approved" })];
    const { candidates, rejections } = await buildCoveredCallCandidates({
      holdings: [baseHolding], // 3 lots, all 3 already written per the internal ledger
      openProposals,
      accountEquityUsd: 1_000_000,
      today: TODAY,
      brokerShortCallsByTicker: { AAPL: 0 }, // broker feed hasn't caught up yet
    });
    expect(candidates).toHaveLength(0);
    expect(rejections[0].reason).toBe("no_coverage_available");
  });

  it("passes ticker/spot/costBasis/today through to the injected strike selector", async () => {
    const calls: unknown[] = [];
    const { candidates } = await buildCoveredCallCandidates({
      holdings: [baseHolding],
      openProposals: [],
      accountEquityUsd: 1_000_000,
      today: TODAY,
      strikeSelector: async (params) => {
        calls.push(params);
        return { strike: 215, expiry: "2026-08-20", delta: 0.25, bid: 1.2, method: "delta_band", chainSource: "tradier" };
      },
    });
    expect(calls).toEqual([{ ticker: "AAPL", spot: 200, costBasis: 180, today: TODAY }]);
    expect(candidates[0].strikeSource).toBe("tradier");
    expect(candidates[0].delta).toBe(0.25);
  });
});
