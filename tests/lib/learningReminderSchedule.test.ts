import { describe, expect, it } from "vitest";
import { shouldSendLearningReminder } from "../../src/lib/learningReminderSchedule";

describe("learning reminder scheduling", () => {
  it("sends a daily reminder only after the preferred hour if the user was inactive today", () => {
    const result = shouldSendLearningReminder({
      reminders: {
        cadence: "daily",
        weeklyTarget: 3,
        timezone: "America/Los_Angeles",
        preferredHour: 18,
        preferredWeekday: 1,
        paused: false,
      },
      sessions: ["2026-04-01T16:00:00.000Z"],
      now: new Date("2026-04-03T02:30:00.000Z"),
    });

    expect(result.due).toBe(true);
    expect(result.kind).toBe("daily");
  });

  it("does not send a daily reminder twice on the same local day", () => {
    const result = shouldSendLearningReminder({
      reminders: {
        cadence: "daily",
        weeklyTarget: 3,
        timezone: "America/New_York",
        preferredHour: 18,
        preferredWeekday: 1,
        paused: false,
      },
      sessions: [],
      lastReminderSentAt: "2026-04-02T22:00:00.000Z",
      now: new Date("2026-04-03T00:30:00.000Z"),
    });

    expect(result.due).toBe(false);
  });

  it("sends a weekly reminder on the preferred weekday when the weekly goal is behind", () => {
    const result = shouldSendLearningReminder({
      reminders: {
        cadence: "weekly",
        weeklyTarget: 3,
        timezone: "America/Los_Angeles",
        preferredHour: 18,
        preferredWeekday: 1,
        paused: false,
      },
      sessions: ["2026-03-31T20:00:00.000Z"],
      now: new Date("2026-04-07T02:30:00.000Z"),
    });

    expect(result.due).toBe(true);
    expect(result.kind).toBe("weekly");
  });
});
