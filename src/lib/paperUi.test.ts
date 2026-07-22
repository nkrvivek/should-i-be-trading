import { describe, expect, it } from "vitest";
import {
  modeBadge,
  approveDisclosure,
  positionsValue,
  paperAccountValue,
  capMeterLabel,
  capMeterFraction,
  isTickerAllowlisted,
  FREE_PAPER_DAILY_ACTIONS,
} from "./paperUi";

describe("modeBadge", () => {
  it("labels live mode as LIVE with a positive variant", () => {
    expect(modeBadge("live")).toEqual({ label: "LIVE", variant: "positive" });
  });

  it("labels paper mode as PAPER with a muted variant", () => {
    expect(modeBadge("paper")).toEqual({ label: "PAPER", variant: "default" });
  });

  it("falls back to PAPER when mode is missing (safer default)", () => {
    expect(modeBadge(undefined)).toEqual({ label: "PAPER", variant: "default" });
    expect(modeBadge(null)).toEqual({ label: "PAPER", variant: "default" });
  });

  it("falls back to PAPER on an unrecognized value", () => {
    expect(modeBadge("bogus")).toEqual({ label: "PAPER", variant: "default" });
  });
});

describe("approveDisclosure", () => {
  it("returns the real-order warning for live mode", () => {
    expect(approveDisclosure("live")).toBe("This places a real order.");
  });

  it("returns the simulated-fill message for paper mode", () => {
    expect(approveDisclosure("paper")).toBe("This is a simulated fill. No real money moves.");
  });

  it("returns the simulated-fill message when mode is missing", () => {
    expect(approveDisclosure(undefined)).toBe("This is a simulated fill. No real money moves.");
  });
});

describe("positionsValue", () => {
  it("sums qty * price across positions", () => {
    expect(positionsValue([{ qty: 10, price: 5 }, { qty: 2, price: 100 }])).toBe(250);
  });

  it("returns 0 for an empty list", () => {
    expect(positionsValue([])).toBe(0);
  });
});

describe("paperAccountValue", () => {
  it("adds cash to marked position value", () => {
    expect(paperAccountValue(1000, [{ qty: 10, price: 5 }])).toBe(1050);
  });

  it("returns cash alone when there are no positions", () => {
    expect(paperAccountValue(100_000, [])).toBe(100_000);
  });
});

describe("capMeterLabel", () => {
  it("formats used vs the default free-tier limit", () => {
    expect(capMeterLabel(3)).toBe(`3 of ${FREE_PAPER_DAILY_ACTIONS} daily actions used`);
  });

  it("clamps a count above the limit down to the limit", () => {
    expect(capMeterLabel(999, 20)).toBe("20 of 20 daily actions used");
  });

  it("clamps a negative count to 0", () => {
    expect(capMeterLabel(-5, 20)).toBe("0 of 20 daily actions used");
  });
});

describe("capMeterFraction", () => {
  it("returns a fraction between 0 and 1", () => {
    expect(capMeterFraction(5, 20)).toBe(0.25);
  });

  it("clamps above-limit usage to 1", () => {
    expect(capMeterFraction(50, 20)).toBe(1);
  });

  it("returns 0 when limit is 0 (guards divide-by-zero)", () => {
    expect(capMeterFraction(5, 0)).toBe(0);
  });
});

describe("isTickerAllowlisted", () => {
  it("accepts a ticker on the allowlist, case-insensitively", () => {
    expect(isTickerAllowlisted("aapl")).toBe(true);
  });

  it("rejects a ticker not on the allowlist", () => {
    expect(isTickerAllowlisted("ZZZZ")).toBe(false);
  });
});
