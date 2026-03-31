export type AcademyPanelView = "academy" | "glossary";

export type AcademyViewState = {
  activeView: AcademyPanelView;
  selectedTrackSlug: string | null;
  selectedLessonSlug: string | null;
  viewingLessonSlug: string | null;
};

const STORAGE_KEY = "sibt_academy_view_state";

export const DEFAULT_ACADEMY_VIEW_STATE: AcademyViewState = {
  activeView: "academy",
  selectedTrackSlug: null,
  selectedLessonSlug: null,
  viewingLessonSlug: null,
};

export function getAcademyViewState(): AcademyViewState {
  if (typeof window === "undefined") return DEFAULT_ACADEMY_VIEW_STATE;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ACADEMY_VIEW_STATE;
    const parsed = JSON.parse(raw) as Partial<AcademyViewState>;
    return {
      activeView: parsed.activeView === "glossary" ? "glossary" : "academy",
      selectedTrackSlug: typeof parsed.selectedTrackSlug === "string" ? parsed.selectedTrackSlug : null,
      selectedLessonSlug: typeof parsed.selectedLessonSlug === "string" ? parsed.selectedLessonSlug : null,
      viewingLessonSlug: typeof parsed.viewingLessonSlug === "string" ? parsed.viewingLessonSlug : null,
    };
  } catch {
    return DEFAULT_ACADEMY_VIEW_STATE;
  }
}

export function saveAcademyViewState(state: AcademyViewState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
