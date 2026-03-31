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
const spreadsLessons = LEARNING_TRACKS.find((t) => t.slug === "spreads-and-order-entry")!.lessons;
const macroProductsLessons = LEARNING_TRACKS.find((t) => t.slug === "macro-products")!.lessons;
const sibtWorkflowLessons = LEARNING_TRACKS.find((t) => t.slug === "sibt-workflows")!.lessons;

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

  it("income-and-protection stays locked when options-basics is only partially complete", () => {
    const completed = completedMap(optionsBasicsLessons.slice(0, 2).map((l) => l.slug));
    expect(isTrackUnlocked("income-and-protection", completed)).toBe(false);
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

  it("spreads-and-order-entry stays locked until every income lesson is complete", () => {
    const completed = completedMap([
      ...optionsBasicsLessons.map((l) => l.slug),
      ...incomeProtectionLessons.slice(0, 2).map((l) => l.slug),
    ]);
    expect(isTrackUnlocked("spreads-and-order-entry", completed)).toBe(false);
  });

  it("returns false for an unknown track", () => {
    expect(isTrackUnlocked("not-a-track", {})).toBe(false);
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

  it("requires the immediately previous lesson, not any earlier lesson in the track", () => {
    const completed = completedMap([optionsBasicsLessons[0].slug]);
    expect(isLessonUnlocked("options-basics", optionsBasicsLessons[2].slug, completed)).toBe(false);
  });

  it("applies sequential unlocking to always-available workflow tracks", () => {
    expect(isLessonUnlocked("sibt-workflows", sibtWorkflowLessons[1].slug, {})).toBe(false);

    const completed = completedMap([sibtWorkflowLessons[0].slug]);
    expect(isLessonUnlocked("sibt-workflows", sibtWorkflowLessons[1].slug, completed)).toBe(true);
  });

  it("returns false for an unknown lesson slug", () => {
    expect(isLessonUnlocked("options-basics", "not-a-lesson", {})).toBe(false);
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

  it("prefers the track prerequisite when the track itself is still locked", () => {
    const result = getUnlockRequirement("income-and-protection", incomeProtectionLessons[1].slug, {});
    expect(result).toBe("Complete 'Options Basics' to unlock");
  });

  it("returns the previous lesson title for later lessons in an unlocked track", () => {
    const completed = completedMap([optionsBasicsLessons[0].slug]);
    const result = getUnlockRequirement("options-basics", optionsBasicsLessons[2].slug, completed);
    expect(result).toBe(`Complete '${optionsBasicsLessons[1].title}' to unlock`);
  });

  it("falls back to the generic prerequisite message for an unknown track", () => {
    expect(getUnlockRequirement("not-a-track", "missing-lesson", {})).toBe("Complete prerequisite track to unlock");
  });

  it("returns null for an unknown lesson in an otherwise unlocked track", () => {
    expect(getUnlockRequirement("options-basics", "missing-lesson", {})).toBeNull();
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

  it("rounds thirds to whole-number percentages", () => {
    expect(getTrackCompletionPercent("options-basics", completedMap([optionsBasicsLessons[0].slug]))).toBe(33);
    expect(
      getTrackCompletionPercent(
        "options-basics",
        completedMap(optionsBasicsLessons.slice(0, 2).map((l) => l.slug)),
      ),
    ).toBe(67);
  });

  it("computes exact percentages for tracks with two lessons", () => {
    expect(getTrackCompletionPercent("macro-products", completedMap([macroProductsLessons[0].slug]))).toBe(50);
    expect(getTrackCompletionPercent("macro-products", completedMap(macroProductsLessons.map((l) => l.slug)))).toBe(100);
  });

  it("ignores completions from other tracks", () => {
    const completed = completedMap([
      ...incomeProtectionLessons.map((l) => l.slug),
      spreadsLessons[0].slug,
    ]);
    expect(getTrackCompletionPercent("options-basics", completed)).toBe(0);
  });

  it("returns 0 for an unknown track", () => {
    expect(getTrackCompletionPercent("not-a-track", completedMap(optionsBasicsLessons.map((l) => l.slug)))).toBe(0);
  });
});
