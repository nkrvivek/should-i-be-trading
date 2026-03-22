import { describe, it, expect } from "vitest";
import { isMarketOpen, getMarketStatus, getTodayET, isWeekday } from "../../src/lib/marketHours";

describe("isWeekday", () => {
  it("returns true for Monday", () => {
    // March 17, 2026 = Monday
    expect(isWeekday(new Date("2026-03-17T12:00:00-05:00"))).toBe(true);
  });

  it("returns false for Saturday", () => {
    expect(isWeekday(new Date("2026-03-21T12:00:00-05:00"))).toBe(false);
  });
});

describe("isMarketOpen", () => {
  it("returns true during trading hours", () => {
    // 10:00 AM ET on a Wednesday
    expect(isMarketOpen(new Date("2026-03-18T10:00:00-05:00"))).toBe(true);
  });

  it("returns false before market open", () => {
    // March is EDT (-04:00), 09:00 ET = 09:00-04:00 = 13:00 UTC
    expect(isMarketOpen(new Date("2026-03-18T09:00:00-04:00"))).toBe(false);
  });

  it("returns false on weekend", () => {
    expect(isMarketOpen(new Date("2026-03-21T12:00:00-05:00"))).toBe(false);
  });
});

describe("getMarketStatus", () => {
  it("returns OPEN during regular hours", () => {
    expect(getMarketStatus(new Date("2026-03-18T14:00:00-05:00"))).toBe("OPEN");
  });

  it("returns PRE_MARKET before open", () => {
    expect(getMarketStatus(new Date("2026-03-18T08:00:00-05:00"))).toBe("PRE_MARKET");
  });

  it("returns AFTER_HOURS after close", () => {
    expect(getMarketStatus(new Date("2026-03-18T17:00:00-05:00"))).toBe("AFTER_HOURS");
  });

  it("returns CLOSED on weekend", () => {
    expect(getMarketStatus(new Date("2026-03-21T12:00:00-05:00"))).toBe("CLOSED");
  });

  it("returns CLOSED late night on weekday", () => {
    expect(getMarketStatus(new Date("2026-03-18T22:00:00-05:00"))).toBe("CLOSED");
  });
});

describe("getTodayET", () => {
  it("returns YYYY-MM-DD format", () => {
    const result = getTodayET(new Date("2026-03-18T10:00:00-05:00"));
    expect(result).toBe("2026-03-18");
  });
});
