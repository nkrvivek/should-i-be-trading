import { LEARNING_TRACKS } from "./academy";

/**
 * Determine whether a track is unlocked based on completed lessons.
 *
 * Unlock rules (derived from LEARNING_TRACKS order):
 *  - options-basics (track 0): always unlocked
 *  - sibt-workflows (track 3): always unlocked
 *  - income-and-protection (track 1): all options-basics lessons complete
 *  - spreads-and-order-entry (track 2): all income-and-protection lessons complete
 *  - macro-products (track 4): all options-basics lessons complete
 */
export function isTrackUnlocked(
  trackSlug: string,
  completedLessons: Record<string, string>,
): boolean {
  const track = LEARNING_TRACKS.find((t) => t.slug === trackSlug);
  if (!track) return false;

  if (trackSlug === "options-basics" || trackSlug === "sibt-workflows") {
    return true;
  }

  if (trackSlug === "income-and-protection" || trackSlug === "macro-products") {
    const optionsBasics = LEARNING_TRACKS.find((t) => t.slug === "options-basics");
    if (!optionsBasics) return false;
    return optionsBasics.lessons.every((l) => Boolean(completedLessons[l.slug]));
  }

  if (trackSlug === "spreads-and-order-entry") {
    const incomeProtection = LEARNING_TRACKS.find((t) => t.slug === "income-and-protection");
    if (!incomeProtection) return false;
    return incomeProtection.lessons.every((l) => Boolean(completedLessons[l.slug]));
  }

  return false;
}

/**
 * Determine whether a specific lesson within a track is unlocked.
 * Track must be unlocked. Lesson 0 is always unlocked within an
 * unlocked track. Lesson N requires lesson N-1 to be complete.
 */
export function isLessonUnlocked(
  trackSlug: string,
  lessonSlug: string,
  completedLessons: Record<string, string>,
): boolean {
  if (!isTrackUnlocked(trackSlug, completedLessons)) return false;

  const track = LEARNING_TRACKS.find((t) => t.slug === trackSlug);
  if (!track) return false;

  const lessonIndex = track.lessons.findIndex((l) => l.slug === lessonSlug);
  if (lessonIndex < 0) return false;
  if (lessonIndex === 0) return true;

  const previousLesson = track.lessons[lessonIndex - 1];
  return Boolean(completedLessons[previousLesson.slug]);
}

/**
 * Returns a human-readable unlock requirement string, or null if already unlocked.
 */
export function getUnlockRequirement(
  trackSlug: string,
  lessonSlug: string,
  completedLessons: Record<string, string>,
): string | null {
  if (isLessonUnlocked(trackSlug, lessonSlug, completedLessons)) return null;

  // If track itself is locked, explain which prerequisite track needs completion
  if (!isTrackUnlocked(trackSlug, completedLessons)) {
    if (trackSlug === "income-and-protection" || trackSlug === "macro-products") {
      const optionsBasics = LEARNING_TRACKS.find((t) => t.slug === "options-basics");
      if (optionsBasics) {
        return `Complete '${optionsBasics.title}' to unlock`;
      }
    }
    if (trackSlug === "spreads-and-order-entry") {
      const incomeProtection = LEARNING_TRACKS.find((t) => t.slug === "income-and-protection");
      if (incomeProtection) {
        return `Complete '${incomeProtection.title}' to unlock`;
      }
    }
    return "Complete prerequisite track to unlock";
  }

  // Track is unlocked but lesson is locked -- need the previous lesson
  const track = LEARNING_TRACKS.find((t) => t.slug === trackSlug);
  if (!track) return null;

  const lessonIndex = track.lessons.findIndex((l) => l.slug === lessonSlug);
  if (lessonIndex <= 0) return null;

  const previousLesson = track.lessons[lessonIndex - 1];
  return `Complete '${previousLesson.title}' to unlock`;
}

/**
 * Returns completion percentage (0-100) for a given track.
 */
export function getTrackCompletionPercent(
  trackSlug: string,
  completedLessons: Record<string, string>,
): number {
  const track = LEARNING_TRACKS.find((t) => t.slug === trackSlug);
  if (!track || track.lessons.length === 0) return 0;

  const completed = track.lessons.filter((l) => Boolean(completedLessons[l.slug])).length;
  return Math.round((completed / track.lessons.length) * 100);
}
