import { describe, expect, it } from "vitest";
import {
  computeCompositeTradeScore,
  normalizeInsiderScore,
  normalizeSectorMomentum,
  normalizeShortInterest,
  normalizeStockScore,
} from "../../src/lib/compositeTradeScore";

describe("compositeTradeScore", () => {
  it("all signals bullish produces a TRADE verdict", () => {
    const result = computeCompositeTradeScore("AAPL", {
      marketQuality: 90,
      regimeComposite: 85,
      fsiScore: 80,
      sectorEtfChange: 2.5,
      stockScoreComposite: 9.5,
      insiderSignalScore: 80,
      earningsScore: 88,
      socialScore: 82,
      shortRatio: 0.1,
    });

    expect(result.overall).toBeGreaterThan(75);
    expect(result.verdict).toBe("TRADE");
    expect(result.confidence).toBe(1);
    expect(result.sectorEtf).toBe("XLK");
  });

  it("all signals bearish produces an AVOID verdict", () => {
    const result = computeCompositeTradeScore("TSLA", {
      marketQuality: 10,
      regimeComposite: 15,
      fsiScore: 10,
      sectorEtfChange: -3,
      stockScoreComposite: 1,
      insiderSignalScore: -100,
      earningsScore: 15,
      socialScore: 20,
      shortRatio: 1,
    });

    expect(result.overall).toBeLessThan(35);
    expect(result.verdict).toBe("AVOID");
    expect(result.confidence).toBe(1);
  });

  it("mixed market and ticker signals lands in CAUTION", () => {
    const result = computeCompositeTradeScore("NFLX", {
      marketQuality: 85,
      regimeComposite: 80,
      fsiScore: 75,
      sectorEtfChange: 1.5,
      stockScoreComposite: 3,
      insiderSignalScore: -60,
      earningsScore: 30,
      socialScore: 35,
      shortRatio: 0.8,
    });

    expect(result.overall).toBeGreaterThanOrEqual(40);
    expect(result.overall).toBeLessThan(65);
    expect(result.verdict).toBe("CAUTION");
  });

  it("all inputs missing defaults to a neutral CAUTION score with zero confidence", () => {
    const result = computeCompositeTradeScore("aapl", {});

    expect(result.symbol).toBe("AAPL");
    expect(result.overall).toBe(50);
    expect(result.verdict).toBe("CAUTION");
    expect(result.confidence).toBe(0);
    expect(result.marketBase).toBe(50);
    expect(result.tickerScore).toBe(50);
  });

  it("only market data provided preserves neutral ticker score", () => {
    const result = computeCompositeTradeScore("MSFT", {
      marketQuality: 80,
      regimeComposite: 70,
      fsiScore: 60,
      sectorEtfChange: 1.5,
    });

    expect(result.confidence).toBe(0.44);
    expect(result.tickerScore).toBe(50);
    expect(result.marketBase).toBeGreaterThan(50);
  });

  it("normalizes stock score from 1-10 to 0-100", () => {
    expect(normalizeStockScore(1)).toBe(0);
    expect(normalizeStockScore(10)).toBe(100);
    expect(normalizeStockScore(5.5)).toBe(50);
  });

  it("normalizes insider score from -100..100 to 0..100", () => {
    expect(normalizeInsiderScore(-100)).toBe(0);
    expect(normalizeInsiderScore(0)).toBe(50);
    expect(normalizeInsiderScore(100)).toBe(100);
  });

  it("normalizes short ratio inversely", () => {
    expect(normalizeShortInterest(0)).toBe(100);
    expect(normalizeShortInterest(0.6)).toBe(40);
    expect(normalizeShortInterest(1)).toBe(0);
  });

  it("normalizes sector momentum with capped tails", () => {
    expect(normalizeSectorMomentum(3)).toBe(95);
    expect(normalizeSectorMomentum(-3)).toBe(10);
    expect(normalizeSectorMomentum(0)).toBe(60);
  });

  it("verdict boundary at 39 vs 40 works", () => {
    const avoid = computeCompositeTradeScore("AAPL", {
      marketQuality: 0,
      fsiScore: 0,
      sectorEtfChange: -2,
    });
    const caution = computeCompositeTradeScore("AAPL", {
      marketQuality: 0,
      fsiScore: 0,
    });

    expect(avoid.overall).toBe(39);
    expect(avoid.verdict).toBe("AVOID");
    expect(caution.overall).toBe(40);
    expect(caution.verdict).toBe("CAUTION");
  });

  it("verdict boundary at 64 vs 65 works", () => {
    const caution = computeCompositeTradeScore("AAPL", {
      marketQuality: 100,
      regimeComposite: 90,
    });
    const trade = computeCompositeTradeScore("AAPL", {
      marketQuality: 100,
      regimeComposite: 100,
    });

    expect(caution.overall).toBe(64);
    expect(caution.verdict).toBe("CAUTION");
    expect(trade.overall).toBe(65);
    expect(trade.verdict).toBe("TRADE");
  });

  it("rescales marketBase and tickerScore independently", () => {
    const marketOnly = computeCompositeTradeScore("AAPL", {
      marketQuality: 100,
      regimeComposite: 100,
      fsiScore: 100,
      sectorEtfChange: 3,
    });
    const tickerOnly = computeCompositeTradeScore("AAPL", {
      stockScoreComposite: 1,
      insiderSignalScore: -100,
      earningsScore: 0,
      socialScore: 0,
      shortRatio: 1,
    });

    expect(marketOnly.marketBase).toBe(99);
    expect(marketOnly.tickerScore).toBe(50);
    expect(tickerOnly.marketBase).toBe(50);
    expect(tickerOnly.tickerScore).toBe(0);
  });
});
