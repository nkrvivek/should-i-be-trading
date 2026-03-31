export type LearningReminderCadence = "daily" | "weekly";

export type LearningReminderPrefs = {
  browserEnabled: boolean;
  emailOptIn: boolean;
  cadence: LearningReminderCadence;
  weeklyTarget: number;
  timezone: string;
  preferredHour: number;
  preferredWeekday: number;
  paused: boolean;
};

export type LearningProgressState = {
  completedLessons: Record<string, string>;
  sessions: string[];
  reminders: LearningReminderPrefs;
};

export type LearningStats = {
  completedCount: number;
  currentStreak: number;
  thisWeekSessions: number;
  weeklyTarget: number;
  weeklyProgress: number;
};

const STORAGE_KEY = "sibt_learning_progress";

export const DEFAULT_LEARNING_PROGRESS: LearningProgressState = {
  completedLessons: {},
  sessions: [],
  reminders: {
    browserEnabled: false,
    emailOptIn: false,
    cadence: "daily",
    weeklyTarget: 3,
    timezone: "UTC",
    preferredHour: 18,
    preferredWeekday: 1,
    paused: false,
  },
};

export function getLearningProgress(): LearningProgressState {
  if (typeof window === "undefined") return DEFAULT_LEARNING_PROGRESS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LEARNING_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<LearningProgressState>;
    return {
      completedLessons: parsed.completedLessons ?? {},
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      reminders: {
        ...DEFAULT_LEARNING_PROGRESS.reminders,
        timezone: getBrowserTimezone(),
        ...(parsed.reminders ?? {}),
      },
    };
  } catch {
    return {
      ...DEFAULT_LEARNING_PROGRESS,
      reminders: {
        ...DEFAULT_LEARNING_PROGRESS.reminders,
        timezone: getBrowserTimezone(),
      },
    };
  }
}

export function saveLearningProgress(state: LearningProgressState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function completeLesson(
  state: LearningProgressState,
  lessonSlug: string,
  completedAt = new Date(),
): LearningProgressState {
  const iso = completedAt.toISOString();
  const dayKey = toLocalDayKey(completedAt);
  const sessions = [...state.sessions];

  if (!sessions.some((entry) => toLocalDayKey(new Date(entry)) === dayKey)) {
    sessions.push(iso);
  }

  return {
    ...state,
    completedLessons: {
      ...state.completedLessons,
      [lessonSlug]: iso,
    },
    sessions,
  };
}

export function updateReminderPrefs(
  state: LearningProgressState,
  reminders: Partial<LearningReminderPrefs>,
): LearningProgressState {
  return {
    ...state,
    reminders: {
      ...state.reminders,
      ...reminders,
    },
  };
}

export function computeLearningStats(
  state: LearningProgressState,
  totalLessons: number,
  now = new Date(),
): LearningStats {
  const completedCount = Math.min(totalLessons, Object.keys(state.completedLessons).length);
  const thisWeekSessions = countSessionsThisWeek(state.sessions, now);
  const currentStreak = computeCurrentStreak(state.sessions, now);
  const weeklyTarget = Math.max(1, state.reminders.weeklyTarget);

  return {
    completedCount,
    currentStreak,
    thisWeekSessions,
    weeklyTarget,
    weeklyProgress: Math.min(1, thisWeekSessions / weeklyTarget),
  };
}

function countSessionsThisWeek(sessions: string[], now: Date): number {
  const start = new Date(now);
  const day = start.getDay();
  const diffToMonday = (day + 6) % 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - diffToMonday);

  return sessions.filter((entry) => {
    const date = new Date(entry);
    return date >= start && date <= now;
  }).length;
}

function computeCurrentStreak(sessions: string[], now: Date): number {
  const uniqueDays = [...new Set(sessions.map((entry) => toLocalDayKey(new Date(entry))))].sort().reverse();
  if (uniqueDays.length === 0) return 0;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayKey = toLocalDayKey(today);

  const cursor = new Date(today);
  let index = 0;
  let streak = 0;

  if (uniqueDays[0] !== todayKey) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (index < uniqueDays.length) {
    const expected = toLocalDayKey(cursor);
    if (uniqueDays[index] !== expected) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
    index += 1;
  }

  return streak;
}

function toLocalDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
