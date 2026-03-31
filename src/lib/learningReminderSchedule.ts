import type { LearningReminderPrefs } from "./learningProgress";

export type LearningReminderScheduleInput = {
  reminders: Pick<
    LearningReminderPrefs,
    "cadence" | "weeklyTarget" | "timezone" | "preferredHour" | "preferredWeekday" | "paused"
  >;
  sessions: string[];
  lastReminderSentAt?: string | null;
  now?: Date;
};

export type LearningReminderDecision = {
  due: boolean;
  kind: "daily" | "weekly";
  localDateKey: string;
  localWeekKey: string;
};

export function shouldSendLearningReminder(
  input: LearningReminderScheduleInput,
): LearningReminderDecision {
  const now = input.now ?? new Date();
  const timezone = input.reminders.timezone || "UTC";
  const localDateKey = getLocalDateKey(now, timezone);
  const localWeekKey = getLocalWeekKey(now, timezone);

  if (input.reminders.paused) {
    return { due: false, kind: input.reminders.cadence, localDateKey, localWeekKey };
  }

  const localHour = getLocalParts(now, timezone).hour;
  if (localHour < input.reminders.preferredHour) {
    return { due: false, kind: input.reminders.cadence, localDateKey, localWeekKey };
  }

  const sentDateKey = input.lastReminderSentAt ? getLocalDateKey(new Date(input.lastReminderSentAt), timezone) : null;
  const sentWeekKey = input.lastReminderSentAt ? getLocalWeekKey(new Date(input.lastReminderSentAt), timezone) : null;

  if (input.reminders.cadence === "daily") {
    const activeToday = input.sessions.some((session) => getLocalDateKey(new Date(session), timezone) === localDateKey);
    const alreadySentToday = sentDateKey === localDateKey;
    return {
      due: !activeToday && !alreadySentToday,
      kind: "daily",
      localDateKey,
      localWeekKey,
    };
  }

  const weekday = getLocalWeekday(now, timezone);
  if (weekday !== input.reminders.preferredWeekday) {
    return { due: false, kind: "weekly", localDateKey, localWeekKey };
  }

  const weeklySessions = countSessionsForWeek(input.sessions, timezone, now);
  const alreadySentThisWeek = sentWeekKey === localWeekKey;

  return {
    due: weeklySessions < Math.max(1, input.reminders.weeklyTarget) && !alreadySentThisWeek,
    kind: "weekly",
    localDateKey,
    localWeekKey,
  };
}

export function countSessionsForWeek(sessions: string[], timezone: string, now = new Date()): number {
  const targetWeek = getLocalWeekKey(now, timezone);
  return sessions.filter((session) => getLocalWeekKey(new Date(session), timezone) === targetWeek).length;
}

export function getLocalDateKey(date: Date, timezone: string): string {
  const parts = getLocalParts(date, timezone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function getLocalWeekKey(date: Date, timezone: string): string {
  const local = getLocalDate(date, timezone);
  const monday = new Date(local);
  const diffToMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - diffToMonday);
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
}

function getLocalWeekday(date: Date, timezone: string): number {
  return getLocalDate(date, timezone).getDay();
}

function getLocalDate(date: Date, timezone: string): Date {
  const parts = getLocalParts(date, timezone);
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

function getLocalParts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const values = Object.fromEntries(
    formatter.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function pad(value: number): string {
  return `${value}`.padStart(2, "0");
}
