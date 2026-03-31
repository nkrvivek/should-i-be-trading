import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  completeLesson,
  getLearningProgress,
  saveLearningProgress,
  type LearningProgressState,
  type LearningReminderPrefs,
} from "../lib/learningProgress";
import { useAuthStore } from "../stores/authStore";

type LearningProgressRow = {
  completed_lessons: Record<string, string> | null;
  weekly_target: number | null;
};

type LearningReminderPrefsRow = {
  cadence: "daily" | "weekly";
  weekly_target: number;
  timezone: string;
  browser_enabled: boolean;
  email_enabled: boolean;
  preferred_hour: number;
  preferred_weekday: number;
  paused: boolean;
};

function buildReminderPrefs(row: LearningReminderPrefsRow | null, fallback: LearningProgressState["reminders"]): LearningReminderPrefs {
  if (!row) return fallback;
  return {
    browserEnabled: row.browser_enabled,
    emailOptIn: row.email_enabled,
    cadence: row.cadence,
    weeklyTarget: row.weekly_target,
    timezone: row.timezone,
    preferredHour: row.preferred_hour,
    preferredWeekday: row.preferred_weekday,
    paused: row.paused,
  };
}

export function useLearningAcademy() {
  const { user } = useAuthStore();
  const [progress, setProgress] = useState<LearningProgressState>(() => getLearningProgress());
  const [loading, setLoading] = useState(false);
  const [persistence, setPersistence] = useState<"local" | "account">("local");

  useEffect(() => {
    let active = true;

    if (!user || !isSupabaseConfigured()) {
      const timer = setTimeout(() => {
        if (!active) return;
        setPersistence("local");
        setProgress(getLearningProgress());
        setLoading(false);
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }

    const startTimer = setTimeout(() => {
      if (!active) return;
      setLoading(true);
    }, 0);

    const load = async () => {
      const [progressRes, prefsRes, sessionsRes] = await Promise.all([
        supabase.from("learning_progress").select("completed_lessons, weekly_target").eq("user_id", user.id).maybeSingle(),
        supabase.from("learning_reminder_preferences").select("cadence, weekly_target, timezone, browser_enabled, email_enabled, preferred_hour, preferred_weekday, paused").eq("user_id", user.id).maybeSingle(),
        supabase.from("learning_sessions").select("completed_at").eq("user_id", user.id).order("completed_at", { ascending: false }).limit(90),
      ]);

      if (!active) return;

      const localFallback = getLearningProgress();
      const progressRow = progressRes.data as LearningProgressRow | null;
      const sessions = (sessionsRes.data ?? []).map((row) => row.completed_at as string);

      const merged: LearningProgressState = {
        completedLessons: progressRow?.completed_lessons ?? {},
        sessions,
        reminders: buildReminderPrefs(
          prefsRes.data as LearningReminderPrefsRow | null,
          {
            ...localFallback.reminders,
            weeklyTarget: progressRow?.weekly_target ?? localFallback.reminders.weeklyTarget,
          },
        ),
      };

      setProgress(merged);
      setPersistence("account");
      saveLearningProgress(merged);
      setLoading(false);
    };

    void load().catch(() => {
      if (!active) return;
      setPersistence("local");
      setProgress(getLearningProgress());
      setLoading(false);
    });

    return () => {
      active = false;
      clearTimeout(startTimer);
    };
  }, [user]);

  useEffect(() => {
    saveLearningProgress(progress);
  }, [progress]);

  const markLessonComplete = useCallback(async (lessonSlug: string) => {
    const next = completeLesson(progress, lessonSlug);
    setProgress(next);

    if (!user || !isSupabaseConfigured()) return;

    const completedAt = next.completedLessons[lessonSlug];
    await supabase.from("learning_sessions").insert({
      user_id: user.id,
      lesson_slug: lessonSlug,
      completed_at: completedAt,
    });
  }, [progress, user]);

  const saveReminderPrefs = useCallback(async (partial: Partial<LearningReminderPrefs>) => {
    const next = {
      ...progress,
      reminders: {
        ...progress.reminders,
        ...partial,
      },
    };
    setProgress(next);

    if (!user || !isSupabaseConfigured()) return;

    await supabase.from("learning_reminder_preferences").upsert({
      user_id: user.id,
      cadence: next.reminders.cadence,
      weekly_target: next.reminders.weeklyTarget,
      timezone: next.reminders.timezone,
      browser_enabled: next.reminders.browserEnabled,
      email_enabled: next.reminders.emailOptIn,
      preferred_hour: next.reminders.preferredHour,
      preferred_weekday: next.reminders.preferredWeekday,
      paused: next.reminders.paused,
      last_engaged_at: next.sessions[0] ?? null,
    });
  }, [progress, user]);

  return {
    progress,
    setProgress,
    markLessonComplete,
    saveReminderPrefs,
    loading,
    persistence,
  };
}
