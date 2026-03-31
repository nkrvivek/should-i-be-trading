import { describe, expect, it } from "vitest";
import { ALL_LEARNING_LESSONS, LEARNING_TRACKS } from "../../src/lib/academy";
import { SIBT_BADGE_PATHS } from "../../src/lib/learningBadges";

describe("academy content", () => {
  it("has multiple learning tracks and lessons", () => {
    expect(LEARNING_TRACKS.length).toBeGreaterThanOrEqual(5);
    expect(ALL_LEARNING_LESSONS.length).toBeGreaterThanOrEqual(12);
  });

  it("uses unique track slugs and lesson slugs", () => {
    const trackSlugs = new Set(LEARNING_TRACKS.map((track) => track.slug));
    const lessonSlugs = new Set(ALL_LEARNING_LESSONS.map((lesson) => lesson.slug));

    expect(trackSlugs.size).toBe(LEARNING_TRACKS.length);
    expect(lessonSlugs.size).toBe(ALL_LEARNING_LESSONS.length);
  });

  it("includes beginner-facing lessons on core novice topics", () => {
    const lessonTitles = ALL_LEARNING_LESSONS.map((lesson) => lesson.title);

    expect(lessonTitles).toContain("Calls, Puts, and Contract Basics");
    expect(lessonTitles).toContain("How Covered Calls Work");
    expect(lessonTitles).toContain("How To Use the Composite Screener");
    expect(lessonTitles).toContain("Forex Basics: Pairs, Pips, and Leverage");
    expect(lessonTitles).toContain("Futures Basics: Contracts, Margin, and Overnight Risk");
  });
});

describe("badge paths", () => {
  it("covers the intended markets", () => {
    const markets = SIBT_BADGE_PATHS.map((path) => path.market);

    expect(markets).toEqual(["stocks", "options", "etfs", "futures", "forex", "commodities"]);
  });

  it("defines three levels for each badge path", () => {
    for (const path of SIBT_BADGE_PATHS) {
      expect(path.levels).toHaveLength(3);
    }
  });
});
