import { describe, it, expect } from "vitest";
import { computeSocialScore, type SocialSentimentData } from "../../src/lib/socialScoring";

describe("computeSocialScore", () => {
  it("returns NEUTRAL with confidence 0 when no data", () => {
    const result = computeSocialScore({});
    expect(result.overall).toBe(50);
    expect(result.label).toBe("NEUTRAL");
    expect(result.confidence).toBe(0);
    expect(result.breakdown).toHaveLength(0);
  });

  it("all sources bullish → score > 70, BULLISH label", () => {
    const data: SocialSentimentData = {
      stocktwits: {
        bullishPercent: 85,
        bearishPercent: 15,
        volume: 100,
        messages: [],
      },
      reddit: {
        mentions: 10,
        bullishCount: 8,
        bearishCount: 2,
        posts: [
          { title: "AAPL moon rally breakout!", selftext: "", author: "u1", score: 100, numComments: 5, createdUtc: 0, permalink: "", subreddit: "stocks" },
          { title: "Buying calls on this bull run", selftext: "", author: "u2", score: 200, numComments: 10, createdUtc: 0, permalink: "", subreddit: "stocks" },
        ],
      },
      fintwit: {
        posts: [
          { title: "Bull breakout confirmed", url: "", snippet: "rally incoming buy now" },
          { title: "Long AAPL calls", url: "", snippet: "moon shot bull target" },
        ],
        relevanceScore: 0.9,
      },
    };
    const result = computeSocialScore(data);
    expect(result.overall).toBeGreaterThan(70);
    expect(["BULLISH", "VERY_BULLISH"]).toContain(result.label);
    expect(result.confidence).toBe(1);
    expect(result.breakdown).toHaveLength(3);
  });

  it("all sources bearish → score < 30, BEARISH label", () => {
    const data: SocialSentimentData = {
      stocktwits: {
        bullishPercent: 10,
        bearishPercent: 90,
        volume: 100,
        messages: [],
      },
      reddit: {
        mentions: 10,
        bullishCount: 1,
        bearishCount: 9,
        posts: [
          { title: "SELL puts dump crash incoming", selftext: "", author: "u1", score: 100, numComments: 5, createdUtc: 0, permalink: "", subreddit: "stocks" },
          { title: "Short this overvalued garbage", selftext: "", author: "u2", score: 200, numComments: 10, createdUtc: 0, permalink: "", subreddit: "stocks" },
        ],
      },
      fintwit: {
        posts: [
          { title: "Bear crash sell now", url: "", snippet: "dump this stock" },
        ],
        relevanceScore: 0.8,
      },
    };
    const result = computeSocialScore(data);
    expect(result.overall).toBeLessThan(30);
    expect(["VERY_BEARISH", "BEARISH"]).toContain(result.label);
    expect(result.confidence).toBe(1);
  });

  it("mixed signals → NEUTRAL or BEARISH range (close to center)", () => {
    const data: SocialSentimentData = {
      stocktwits: {
        bullishPercent: 50,
        bearishPercent: 50,
        volume: 50,
        messages: [],
      },
      reddit: {
        mentions: 6,
        bullishCount: 3,
        bearishCount: 3,
        posts: [
          { title: "Could go either way", selftext: "", author: "u1", score: 30, numComments: 2, createdUtc: 0, permalink: "", subreddit: "stocks" },
        ],
      },
      fintwit: {
        posts: [
          { title: "Neutral outlook on stock", url: "", snippet: "wait and see approach" },
        ],
        relevanceScore: 0.5,
      },
    };
    const result = computeSocialScore(data);
    // With no sentiment keywords matching, FinTwit scores 0 and Reddit scores 50 (neutral)
    // So overall will be moderate — in BEARISH or NEUTRAL range
    expect(result.overall).toBeGreaterThanOrEqual(21);
    expect(result.overall).toBeLessThanOrEqual(60);
    expect(["BEARISH", "NEUTRAL"]).toContain(result.label);
  });

  it("only StockTwits data → confidence 0.33, score computed from StockTwits alone", () => {
    const data: SocialSentimentData = {
      stocktwits: {
        bullishPercent: 70,
        bearishPercent: 30,
        volume: 50,
        messages: [],
      },
    };
    const result = computeSocialScore(data);
    expect(result.confidence).toBeCloseTo(0.33, 1);
    expect(result.overall).toBe(70);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0].source).toBe("StockTwits");
    expect(result.breakdown[0].weight).toBe(1);
  });

  it("Reddit only with high bullish count → reflects in score", () => {
    const data: SocialSentimentData = {
      reddit: {
        mentions: 10,
        bullishCount: 9,
        bearishCount: 1,
        posts: [
          { title: "Buy buy buy moon rally!", selftext: "", author: "u1", score: 500, numComments: 50, createdUtc: 0, permalink: "", subreddit: "wallstreetbets" },
          { title: "Long calls breakout", selftext: "", author: "u2", score: 300, numComments: 20, createdUtc: 0, permalink: "", subreddit: "stocks" },
        ],
      },
    };
    const result = computeSocialScore(data);
    expect(result.confidence).toBeCloseTo(0.33, 1);
    expect(result.overall).toBeGreaterThan(60);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0].source).toBe("Reddit");
  });

  it("label boundary at 20 → VERY_BEARISH", () => {
    const data: SocialSentimentData = {
      stocktwits: {
        bullishPercent: 20,
        bearishPercent: 80,
        volume: 100,
        messages: [],
      },
    };
    const result = computeSocialScore(data);
    expect(result.label).toBe("VERY_BEARISH");
  });

  it("label boundary at 80 → BULLISH", () => {
    const data: SocialSentimentData = {
      stocktwits: {
        bullishPercent: 80,
        bearishPercent: 20,
        volume: 100,
        messages: [],
      },
    };
    const result = computeSocialScore(data);
    expect(result.label).toBe("BULLISH");
  });

  it("label at 81 → VERY_BULLISH", () => {
    const data: SocialSentimentData = {
      stocktwits: {
        bullishPercent: 81,
        bearishPercent: 19,
        volume: 100,
        messages: [],
      },
    };
    const result = computeSocialScore(data);
    expect(result.label).toBe("VERY_BULLISH");
  });

  it("all three sources maxed bullish → score ≥ 90", () => {
    const data: SocialSentimentData = {
      stocktwits: {
        bullishPercent: 98,
        bearishPercent: 2,
        volume: 500,
        messages: [],
      },
      reddit: {
        mentions: 20,
        bullishCount: 19,
        bearishCount: 1,
        posts: [
          { title: "Moon rally breakout buy calls!", selftext: "Bull pump squeeze", author: "u1", score: 500, numComments: 50, createdUtc: 0, permalink: "", subreddit: "wallstreetbets" },
          { title: "Long calls green moon rip!", selftext: "Breakout confirmed", author: "u2", score: 400, numComments: 30, createdUtc: 0, permalink: "", subreddit: "stocks" },
          { title: "Buy buy buy rally upside!", selftext: "", author: "u3", score: 300, numComments: 20, createdUtc: 0, permalink: "", subreddit: "stocks" },
        ],
      },
      fintwit: {
        posts: [
          { title: "Bull breakout buy calls", url: "", snippet: "moon rally squeeze pump green" },
          { title: "Long upside rally buy", url: "", snippet: "bull breakout rip green" },
          { title: "Calls moon pump", url: "", snippet: "buy bull long squeeze" },
        ],
        relevanceScore: 1.0,
      },
    };
    const result = computeSocialScore(data);
    expect(result.overall).toBeGreaterThanOrEqual(90);
    expect(result.label).toBe("VERY_BULLISH");
    expect(result.confidence).toBe(1);
  });

  it("only Reddit with high bearish → bearish range", () => {
    const data: SocialSentimentData = {
      reddit: {
        mentions: 10,
        bullishCount: 1,
        bearishCount: 9,
        posts: [
          { title: "Sell everything crash dump", selftext: "Short puts bear fade", author: "u1", score: 500, numComments: 50, createdUtc: 0, permalink: "", subreddit: "stocks" },
          { title: "Bear crash sell short", selftext: "Dump overvalued tank", author: "u2", score: 300, numComments: 30, createdUtc: 0, permalink: "", subreddit: "stocks" },
          { title: "Short this drop red tank", selftext: "", author: "u3", score: 200, numComments: 10, createdUtc: 0, permalink: "", subreddit: "stocks" },
        ],
      },
    };
    const result = computeSocialScore(data);
    expect(result.overall).toBeLessThan(30);
    expect(["VERY_BEARISH", "BEARISH"]).toContain(result.label);
    expect(result.confidence).toBeCloseTo(0.33, 1);
  });

  it("confidence calculation: 0 sources → 0, 1 → 0.33, 2 → 0.67, 3 → 1.0", () => {
    // 0 sources
    expect(computeSocialScore({}).confidence).toBe(0);

    // 1 source
    const one = computeSocialScore({
      stocktwits: { bullishPercent: 50, bearishPercent: 50, volume: 10, messages: [] },
    });
    expect(one.confidence).toBeCloseTo(0.33, 1);

    // 2 sources
    const two = computeSocialScore({
      stocktwits: { bullishPercent: 50, bearishPercent: 50, volume: 10, messages: [] },
      reddit: {
        mentions: 5, bullishCount: 2, bearishCount: 3,
        posts: [{ title: "Neutral post", selftext: "", author: "u1", score: 100, numComments: 5, createdUtc: 0, permalink: "", subreddit: "stocks" }],
      },
    });
    expect(two.confidence).toBeCloseTo(0.67, 1);

    // 3 sources
    const three = computeSocialScore({
      stocktwits: { bullishPercent: 50, bearishPercent: 50, volume: 10, messages: [] },
      reddit: {
        mentions: 5, bullishCount: 2, bearishCount: 3,
        posts: [{ title: "Neutral post", selftext: "", author: "u1", score: 100, numComments: 5, createdUtc: 0, permalink: "", subreddit: "stocks" }],
      },
      fintwit: {
        posts: [{ title: "Neutral take", url: "", snippet: "wait and see" }],
        relevanceScore: 0.5,
      },
    });
    expect(three.confidence).toBe(1);
  });

  it("StockTwits with 0 volume → still uses weight, score = 50", () => {
    const data: SocialSentimentData = {
      stocktwits: {
        bullishPercent: 50,
        bearishPercent: 50,
        volume: 0,
        messages: [],
      },
    };
    const result = computeSocialScore(data);
    expect(result.overall).toBe(50);
    expect(result.label).toBe("NEUTRAL");
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0].source).toBe("StockTwits");
  });
});
