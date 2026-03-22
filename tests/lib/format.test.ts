import { describe, it, expect } from "vitest";
import { fmtSigned, fmtPct, fmtUsd, fmtUsdExact, fmtSignedUsd, fmt, formatPrice, formatVolume, calcChangePercent, toneClass } from "../../src/lib/format";

describe("fmtSigned", () => {
  it("adds + for positive", () => expect(fmtSigned(1.5)).toBe("+1.50"));
  it("shows - for negative", () => expect(fmtSigned(-2.3)).toBe("-2.30"));
  it("returns --- for null", () => expect(fmtSigned(null)).toBe("---"));
  it("returns --- for NaN", () => expect(fmtSigned(NaN)).toBe("---"));
});

describe("fmtPct", () => {
  it("formats decimal as percent", () => expect(fmtPct(0.1234)).toBe("+12.34%"));
  it("handles raw mode", () => expect(fmtPct(12.34, 2, true)).toBe("+12.34%"));
  it("returns --- for null", () => expect(fmtPct(null)).toBe("---"));
});

describe("fmtUsd", () => {
  it("formats millions", () => expect(fmtUsd(1_500_000)).toBe("$1.50M"));
  it("formats thousands", () => expect(fmtUsd(45678)).toBe("$45,678"));
  it("formats negative", () => expect(fmtUsd(-1234)).toBe("-$1,234"));
});

describe("fmtUsdExact", () => {
  it("includes cents", () => expect(fmtUsdExact(1234.56)).toBe("$1,234.56"));
});

describe("fmtSignedUsd", () => {
  it("adds + for positive", () => expect(fmtSignedUsd(500)).toBe("+$500"));
  it("shows - for negative", () => expect(fmtSignedUsd(-300)).toBe("-$300"));
});

describe("fmt", () => {
  it("formats number", () => expect(fmt(3.14159, 3)).toBe("3.142"));
  it("returns --- for null", () => expect(fmt(null)).toBe("---"));
});

describe("formatPrice", () => {
  it("formats with 2 decimals", () => expect(formatPrice(123.4)).toBe("123.40"));
  it("returns --- for null", () => expect(formatPrice(null)).toBe("---"));
});

describe("formatVolume", () => {
  it("formats millions", () => expect(formatVolume(1_500_000)).toBe("1.5M"));
  it("formats thousands", () => expect(formatVolume(45_000)).toBe("45.0K"));
  it("returns --- for null", () => expect(formatVolume(null)).toBe("---"));
});

describe("calcChangePercent", () => {
  it("calculates correctly", () => expect(calcChangePercent(110, 100)).toBeCloseTo(10));
  it("returns null for null inputs", () => expect(calcChangePercent(null, 100)).toBeNull());
  it("returns null for zero previous", () => expect(calcChangePercent(100, 0)).toBeNull());
});

describe("toneClass", () => {
  it("returns positive", () => expect(toneClass(1)).toBe("positive"));
  it("returns negative", () => expect(toneClass(-1)).toBe("negative"));
  it("returns neutral", () => expect(toneClass(0)).toBe("neutral"));
});
