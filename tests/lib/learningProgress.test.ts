import { describe, expect, it } from "vitest";
import {
  completeLesson,
  computeLearningStats,
  DEFAULT_LEARNING_PROGRESS,
  updateReminderPrefs,
} from "../../src/lib/learningProgress";

describe("learning progress", () => {
  it("records completed lessons and session dates", () => {
    const completed = completeLesson(
      DEFAULT_LEARNING_PROGRESS,
      "calls-and-puts",
      new Date("2026-03-31T12:00:00Z"),
    );

    expect(completed.completedLessons["calls-and-puts"]).toBe("2026-03-31T12:00:00.000Z");
    expect(completed.sessions).toHaveLength(1);
  });

  it("does not duplicate same-day sessions", () => {
    const first = completeLesson(DEFAULT_LEARNING_PROGRESS, "calls-and-puts", new Date("2026-03-31T12:00:00Z"));
    const second = completeLesson(first, "buy-to-open-sell-to-close", new Date("2026-03-31T18:00:00Z"));

    expect(second.sessions).toHaveLength(1);
  });

  it("computes streak and weekly progress", () => {
    const state = {
      completedLessons: {
        "lesson-a": "2026-03-31T10:00:00.000Z",
        "lesson-b": "2026-03-30T10:00:00.000Z",
        "lesson-c": "2026-03-29T10:00:00.000Z",
      },
      sessions: [
        "2026-03-31T10:00:00.000Z",
        "2026-03-30T10:00:00.000Z",
        "2026-03-29T10:00:00.000Z",
      ],
      reminders: {
        browserEnabled: false,
        emailOptIn: false,
        cadence: "daily" as const,
        weeklyTarget: 3,
      },
    };

    const stats = computeLearningStats(state, 12, new Date("2026-03-31T18:00:00Z"));

    expect(stats.completedCount).toBe(3);
    expect(stats.currentStreak).toBe(3);
    expect(stats.thisWeekSessions).toBe(2);
    expect(stats.weeklyTarget).toBe(3);
    expect(stats.weeklyProgress).toBeCloseTo(2 / 3);
  });

  it("updates reminder preferences safely", () => {
    const next = updateReminderPrefs(DEFAULT_LEARNING_PROGRESS, {
      cadence: "weekly",
      browserEnabled: true,
      weeklyTarget: 4,
    });

    expect(next.reminders.cadence).toBe("weekly");
    expect(next.reminders.browserEnabled).toBe(true);
    expect(next.reminders.weeklyTarget).toBe(4);
  });
});
