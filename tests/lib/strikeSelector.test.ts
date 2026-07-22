import { describe, it, expect } from "vitest";
import { selectCoveredCallStrike, type ChainOption } from "../../src/lib/strikeSelector";

const SPOT = 200;

function chain(overrides: Partial<ChainOption>[]): ChainOption[] {
  return overrides.map((o) => ({ strike: 0, bid: 0, delta: null, ...o }));
}

describe("selectCoveredCallStrike", () => {
  it("returns null when the chain is empty (no chain data)", () => {
    expect(selectCoveredCallStrike({ spot: SPOT, costBasis: null, options: [] })).toBeNull();
  });

  it("picks the strike whose delta is closest to the 0.25 band midpoint", () => {
    const options = chain([
      { strike: 205, bid: 2.5, delta: 0.35 },
      { strike: 210, bid: 1.8, delta: 0.24 },
      { strike: 215, bid: 1.1, delta: 0.15 },
    ]);
    const result = selectCoveredCallStrike({ spot: SPOT, costBasis: null, options });
    expect(result).toEqual({ strike: 210, bid: 1.8, delta: 0.24, method: "delta_band" });
  });

  it("prefers an option inside the 0.20-0.30 band over one closer in raw distance but outside it", () => {
    // 0.19 is numerically closer to 0.25 than nothing else here, but 0.22 is
    // the only in-band option, so it must win even though the target-distance
    // math alone (if it ignored the band) might favor differently.
    const options = chain([
      { strike: 208, bid: 2.0, delta: 0.19 },
      { strike: 212, bid: 1.5, delta: 0.22 },
    ]);
    const result = selectCoveredCallStrike({ spot: SPOT, costBasis: null, options });
    expect(result?.strike).toBe(212);
    expect(result?.method).toBe("delta_band");
  });

  it("falls back to the closest available delta when nothing is in the 0.20-0.30 band", () => {
    const options = chain([
      { strike: 220, bid: 0.8, delta: 0.12 },
      { strike: 225, bid: 0.5, delta: 0.08 },
    ]);
    const result = selectCoveredCallStrike({ spot: SPOT, costBasis: null, options });
    expect(result?.strike).toBe(220);
    expect(result?.method).toBe("delta_band");
  });

  it("falls back to 5-8% OTM by spot when no option carries a delta (Greeks unavailable)", () => {
    const options = chain([
      { strike: 205, bid: 1.0, delta: null }, // 2.5% OTM — outside the 5-8% band
      { strike: 213, bid: 0.6, delta: null }, // 6.5% OTM — right at midpoint
      { strike: 230, bid: 0.3, delta: null }, // 15% OTM — outside the band
    ]);
    const result = selectCoveredCallStrike({ spot: SPOT, costBasis: null, options });
    expect(result).toEqual({ strike: 213, bid: 0.6, delta: null, method: "otm_fallback" });
  });

  it("falls back to the closest-above-5%-OTM strike when nothing falls inside the 5-8% band", () => {
    const options = chain([
      { strike: 220, bid: 0.4, delta: null }, // 10% OTM, above min but outside 8% max
      { strike: 240, bid: 0.2, delta: null }, // 20% OTM
    ]);
    const result = selectCoveredCallStrike({ spot: SPOT, costBasis: null, options });
    expect(result?.strike).toBe(220);
    expect(result?.method).toBe("otm_fallback");
  });

  it("never selects a strike at or below the holding's cost basis", () => {
    const options = chain([
      { strike: 195, bid: 3.0, delta: 0.6 }, // below cost basis of 200 — must be excluded
      { strike: 210, bid: 1.5, delta: 0.22 },
    ]);
    const result = selectCoveredCallStrike({ spot: SPOT, costBasis: 200, options });
    expect(result?.strike).toBe(210);
  });

  it("returns null when every strike is at or below the cost basis", () => {
    const options = chain([{ strike: 195, bid: 3.0, delta: 0.3 }]);
    const result = selectCoveredCallStrike({ spot: SPOT, costBasis: 200, options });
    expect(result).toBeNull();
  });

  it("ignores the basis floor when cost basis is unknown (null)", () => {
    const options = chain([{ strike: 195, bid: 3.0, delta: 0.25 }]);
    const result = selectCoveredCallStrike({ spot: SPOT, costBasis: null, options });
    expect(result?.strike).toBe(195);
  });

  it("rejects a contract whose bid is below the $0.05 minimum", () => {
    const options = chain([{ strike: 210, bid: 0.03, delta: 0.22 }]);
    const result = selectCoveredCallStrike({ spot: SPOT, costBasis: null, options });
    expect(result).toBeNull();
  });

  it("accepts a contract whose bid is exactly at the $0.05 minimum", () => {
    const options = chain([{ strike: 210, bid: 0.05, delta: 0.22 }]);
    const result = selectCoveredCallStrike({ spot: SPOT, costBasis: null, options });
    expect(result?.strike).toBe(210);
  });
});
