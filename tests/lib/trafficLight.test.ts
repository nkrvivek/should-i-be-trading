import { describe, it, expect } from "vitest";
import { computeVerdict, computeVixRegime } from "../../src/lib/trafficLight";
import type { CriData } from "../../src/api/types";

function makeCri(overrides: Partial<CriData> & { criScore?: number; criLevel?: string } = {}): CriData {
  const { criScore = 20, criLevel = "LOW", ...rest } = overrides;
  return {
    scan_time: "2026-03-21T10:00:00",
    date: "2026-03-21",
    market_open: true,
    vix: 16,
    vvix: 90,
    spy: 570,
    realized_vol: 12,
    cor1m: 30,
    cor1m_5d_change: 2,
    vix_5d_roc: 5,
    vvix_vix_ratio: 5.6,
    spx_distance_pct: 1.5,
    spx_100d_ma: 560,
    cri: { score: criScore, level: criLevel, components: { vix: 2, vvix: 3, correlation: 4, momentum: 0 } },
    crash_trigger: { triggered: false, conditions: { spx_below_100d_ma: false, realized_vol_gt_25: false, cor1m_gt_60: false } },
    history: [],
    ...rest,
  };
}

describe("computeVixRegime", () => {
  it("returns BUY_AGGRESSIVE for VIX >= 45", () => {
    expect(computeVixRegime(48).action).toBe("BUY_AGGRESSIVE");
  });

  it("returns BUY for VIX >= 30", () => {
    expect(computeVixRegime(32).action).toBe("BUY");
  });

  it("returns SELL for VIX <= 14", () => {
    expect(computeVixRegime(13).action).toBe("SELL");
    expect(computeVixRegime(14).action).toBe("SELL");
  });

  it("returns HOLD for VIX in normal range", () => {
    expect(computeVixRegime(20).action).toBe("HOLD");
    expect(computeVixRegime(25).action).toBe("HOLD");
  });

  it("boundary: VIX at 30 is BUY", () => {
    expect(computeVixRegime(30).action).toBe("BUY");
  });

  it("boundary: VIX at 45 is BUY_AGGRESSIVE", () => {
    expect(computeVixRegime(45).action).toBe("BUY_AGGRESSIVE");
  });
});

describe("computeVerdict", () => {
  it("returns NO_TRADE when market closed", () => {
    const v = computeVerdict({ cri: makeCri(), marketStatus: "CLOSED" });
    expect(v.signal).toBe("NO_TRADE");
    expect(v.reasons[0]).toContain("closed");
    expect(v.vixRegime).toBeDefined();
  });

  it("returns NO_TRADE when no data", () => {
    const v = computeVerdict({ cri: null, marketStatus: "OPEN" });
    expect(v.signal).toBe("NO_TRADE");
    expect(v.confidence).toBe(0);
    expect(v.vixRegime.action).toBe("HOLD");
  });

  it("returns NO_TRADE when CRI is CRITICAL", () => {
    const v = computeVerdict({
      cri: makeCri({ criScore: 80, criLevel: "CRITICAL" }),
      marketStatus: "OPEN",
    });
    expect(v.signal).toBe("NO_TRADE");
    expect(v.vixRegime).toBeDefined();
  });

  it("returns CAUTION (not NO_TRADE) when VIX > 35 with BUY signal", () => {
    const v = computeVerdict({
      cri: makeCri({ vix: 38 }),
      marketStatus: "OPEN",
      liveVix: 38,
    });
    // VIX > 35 now returns CAUTION (not NO_TRADE) because VIX regime says BUY
    expect(v.signal).toBe("CAUTION");
    expect(v.vixRegime.action).toBe("BUY");
  });

  it("returns CAUTION with BUY_AGGRESSIVE for VIX > 45", () => {
    const v = computeVerdict({
      cri: makeCri({ vix: 48 }),
      marketStatus: "OPEN",
      liveVix: 48,
    });
    expect(v.signal).toBe("CAUTION");
    expect(v.vixRegime.action).toBe("BUY_AGGRESSIVE");
    expect(v.overrides.some((o) => o.includes("BUY AGGRESSIVE"))).toBe(true);
  });

  it("returns CAUTION when CRI is HIGH", () => {
    const v = computeVerdict({
      cri: makeCri({ criScore: 55, criLevel: "HIGH" }),
      marketStatus: "OPEN",
    });
    expect(v.signal).toBe("CAUTION");
  });

  it("returns CAUTION when VIX between 25-35", () => {
    const v = computeVerdict({
      cri: makeCri({ vix: 28 }),
      marketStatus: "OPEN",
      liveVix: 28,
    });
    expect(v.signal).toBe("CAUTION");
  });

  it("returns CAUTION for elevated COR1M", () => {
    const v = computeVerdict({
      cri: makeCri({ cor1m: 65 }),
      marketStatus: "OPEN",
    });
    expect(v.signal).toBe("CAUTION");
  });

  it("returns CAUTION when VIX is complacent (<=14)", () => {
    const v = computeVerdict({
      cri: makeCri({ vix: 12 }),
      marketStatus: "OPEN",
      liveVix: 12,
    });
    // VIX <= 14 triggers SELL regime, which adds a caution reason
    expect(v.signal).toBe("CAUTION");
    expect(v.vixRegime.action).toBe("SELL");
  });

  it("returns TRADE in calm market with normal VIX", () => {
    const v = computeVerdict({ cri: makeCri(), marketStatus: "OPEN" });
    expect(v.signal).toBe("TRADE");
    expect(v.confidence).toBeGreaterThan(50);
    expect(v.vixRegime.action).toBe("HOLD");
  });

  it("uses live VIX over cri VIX", () => {
    const v = computeVerdict({
      cri: makeCri({ vix: 16 }),
      marketStatus: "OPEN",
      liveVix: 36,
    });
    expect(v.signal).toBe("CAUTION");
    expect(v.vixRegime.action).toBe("BUY");
  });

  it("includes vixRegime in all verdicts", () => {
    const trade = computeVerdict({ cri: makeCri(), marketStatus: "OPEN" });
    expect(trade.vixRegime).toBeDefined();
    expect(trade.vixRegime.label).toBeTruthy();
    expect(trade.vixRegime.detail).toBeTruthy();
  });
});
