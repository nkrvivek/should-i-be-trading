import { describe, it, expect } from "vitest";
import { evaluateEarningsWindow } from "../../src/lib/earningsGate";

const TODAY = "2026-07-21";
const EXPIRY = "2026-08-21";

describe("evaluateEarningsWindow", () => {
  it("returns 'unknown' when the earnings calendar lookup failed (null dates)", () => {
    const result = evaluateEarningsWindow({ today: TODAY, expiry: EXPIRY, earningsDates: null });
    expect(result.status).toBe("unknown");
  });

  it("returns 'clear' when no earnings date falls inside [today, expiry]", () => {
    const result = evaluateEarningsWindow({ today: TODAY, expiry: EXPIRY, earningsDates: ["2026-09-10"] });
    expect(result.status).toBe("clear");
  });

  it("returns 'clear' for an empty earnings-dates array (calendar returned no scheduled dates)", () => {
    const result = evaluateEarningsWindow({ today: TODAY, expiry: EXPIRY, earningsDates: [] });
    expect(result.status).toBe("clear");
  });

  it("returns 'blocked' when an earnings date falls strictly inside the window", () => {
    const result = evaluateEarningsWindow({ today: TODAY, expiry: EXPIRY, earningsDates: ["2026-08-05"] });
    expect(result.status).toBe("blocked");
  });

  it("treats an earnings date equal to today as inside the window (blocked)", () => {
    const result = evaluateEarningsWindow({ today: TODAY, expiry: EXPIRY, earningsDates: [TODAY] });
    expect(result.status).toBe("blocked");
  });

  it("treats an earnings date equal to the expiry as inside the window (blocked)", () => {
    const result = evaluateEarningsWindow({ today: TODAY, expiry: EXPIRY, earningsDates: [EXPIRY] });
    expect(result.status).toBe("blocked");
  });

  it("returns 'clear' when the only earnings date is before today (already reported)", () => {
    const result = evaluateEarningsWindow({ today: TODAY, expiry: EXPIRY, earningsDates: ["2026-06-01"] });
    expect(result.status).toBe("clear");
  });

  it("returns 'blocked' when at least one of several dates falls inside the window", () => {
    const result = evaluateEarningsWindow({
      today: TODAY,
      expiry: EXPIRY,
      earningsDates: ["2026-01-01", "2026-08-10", "2027-01-01"],
    });
    expect(result.status).toBe("blocked");
  });
});
