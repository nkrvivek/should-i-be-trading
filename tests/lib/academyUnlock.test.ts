import { describe, expect, it } from "vitest";
import { LEARNING_TRACKS } from "../../src/lib/academy";
import {
  isTrackUnlocked,
  isLessonUnlocked,
  getUnlockRequirement,
  getTrackCompletionPercent,
} from "../../src/lib/academyUnlock";

const optionsBasicsLessons = LEARNING_TRACKS.find((t) => t.slug === "options-basics")!.lessons;
const incomeProtectionLessons = LEARNING_TRACKS.find((t) => t.slug === "income-and-protection")!.lessons;

function completedMap(slugs: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const slug of slugs) {
    map[slug] = new Date().toISOString();
  }
  return map;
}

describe("isTrackUnlocked", () => {
  it("options-basics is always unlocked", () => {
    expect(isTrackUnlocked("options-basics", {})).toBe(true);
  });

  it("sibt-workflows is always unlocked", () => {
    expect(isTrackUnlocked("sibt-workflows", {})).toBe(true);
  });

  it("income-and-protection is locked with no completions", () => {
    expect(isTrackUnlocked("income-and-protection", {})).toBe(false);
  });

  it("income-and-protection unlocks when all options-basics lessons are complete", () => {
    const completed = completedMap(optionsBasicsLessons.map((l) => l.slug));
    expect(isTrackUnlocked("income-and-protection", completed)).toBe(true);
  });

  it("macro-products unlocks with options-basics complete", () => {
    const completed = completedMap(optionsBasicsLessons.map((l) => l.slug));
    expect(isTrackUnlocked("macro-products", completed)).toBe(true);
  });

  it("spreads-and-order-entry is locked until income-and-protection is complete", () => {
    const completed = completedMap(optionsBasicsLessons.map((l) => l.slug));
    expect(isTrackUnlocked("spreads-and-order-entry", completed)).toBe(false);
  });

  it("spreads-and-order-entry unlocks when income-and-protection is complete", () => {
    const completed = completedMap([
      ...optionsBasicsLessons.map((l) => l.slug),
      ...incomeProtectionLessons.map((l) => l.slug),
    ]);
    expect(isTrackUnlocked("spreads-and-order-entry", completed)).toBe(true);
  });
});

describe("isLessonUnlocked", () => {
  it("first lesson of an unlocked track is always unlocked", () => {
    expect(isLessonUnlocked("options-basics", optionsBasicsLessons[0].slug, {})).toBe(true);
  });

  it("second lesson is locked until first is complete", () => {
    expect(isLessonUnlocked("options-basics", optionsBasicsLessons[1].slug, {})).toBe(false);
    const completed = completedMap([optionsBasicsLessons[0].slug]);
    expect(isLessonUnlocked("options-basics", optionsBasicsLessons[1].slug, completed)).toBe(true);
  });

  it("lesson in locked track is never unlocked", () => {
    expect(isLessonUnlocked("income-and-protection", incomeProtectionLessons[0].slug, {})).toBe(false);
  });
});

describe("getUnlockRequirement", () => {
  it("returns null for an unlocked lesson", () => {
    expect(getUnlockRequirement("options-basics", optionsBasicsLessons[0].slug, {})).toBeNull();
  });

  it("returns track requirement when track is locked", () => {
    const result = getUnlockRequirement("income-and-protection", incomeProtectionLessons[0].slug, {});
    expect(result).toContain("Options Basics");
  });

  it("returns previous lesson requirement when lesson is locked but track is unlocked", () => {
    const result = getUnlockRequirement("options-basics", optionsBasicsLessons[1].slug, {});
    expect(result).toContain(optionsBasicsLessons[0].title);
  });
});

describe("getTrackCompletionPercent", () => {
  it("returns 0 for no completions", () => {
    expect(getTrackCompletionPercent("options-basics", {})).toBe(0);
  });

  it("returns 100 when all lessons are complete", () => {
    const completed = completedMap(optionsBasicsLessons.map((l) => l.slug));
    expect(getTrackCompletionPercent("options-basics", completed)).toBe(100);
  });

  it("returns partial percentage for partial completion", () => {
    const completed = completedMap([optionsBasicsLessons[0].slug]);
    const percent = getTrackCompletionPercent("options-basics", completed);
    expect(percent).toBeGreaterThan(0);
    expect(percent).toBeLessThan(100);
  });
});
