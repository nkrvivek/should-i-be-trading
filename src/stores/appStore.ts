import { create } from "zustand";

export type Theme = "dark" | "light";
export type ActivePage = "dashboard" | "terminal" | "analysis";
export type WorkflowProfile = "beginner" | "active_trader" | "options_trader";

const THEME_KEY = "sibt_theme";
const WORKFLOW_PROFILE_KEY = "sibt_workflow_profile";
const WORKFLOW_PROFILE_PROMPT_KEY = "sibt_workflow_profile_prompt_dismissed";

function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch { /* ignore */ }
  return "light"; // default to light
}

function persistTheme(theme: Theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  document.documentElement.setAttribute("data-theme", theme);
}

function loadWorkflowProfile(): WorkflowProfile {
  try {
    const stored = localStorage.getItem(WORKFLOW_PROFILE_KEY);
    if (stored === "beginner" || stored === "active_trader" || stored === "options_trader") {
      return stored;
    }
  } catch { /* ignore */ }
  return "beginner";
}

function hasStoredWorkflowProfile(): boolean {
  try {
    const stored = localStorage.getItem(WORKFLOW_PROFILE_KEY);
    return stored === "beginner" || stored === "active_trader" || stored === "options_trader";
  } catch {
    return false;
  }
}

function persistWorkflowProfile(profile: WorkflowProfile) {
  try { localStorage.setItem(WORKFLOW_PROFILE_KEY, profile); } catch { /* ignore */ }
}

function loadWorkflowProfilePromptDismissed(): boolean {
  try {
    return localStorage.getItem(WORKFLOW_PROFILE_PROMPT_KEY) === "true";
  } catch {
    return false;
  }
}

function persistWorkflowProfilePromptDismissed(dismissed: boolean) {
  try {
    if (dismissed) localStorage.setItem(WORKFLOW_PROFILE_PROMPT_KEY, "true");
    else localStorage.removeItem(WORKFLOW_PROFILE_PROMPT_KEY);
  } catch {
    /* ignore */
  }
}

// Set theme on document immediately (before React mounts) to prevent flash
persistTheme(loadTheme());

type AppState = {
  theme: Theme;
  activePage: ActivePage;
  workflowProfile: WorkflowProfile;
  hasChosenWorkflowProfile: boolean;
  workflowProfilePromptDismissed: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setActivePage: (page: ActivePage) => void;
  setWorkflowProfile: (profile: WorkflowProfile) => void;
  dismissWorkflowProfilePrompt: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  theme: loadTheme(),
  activePage: "dashboard",
  workflowProfile: loadWorkflowProfile(),
  hasChosenWorkflowProfile: hasStoredWorkflowProfile(),
  workflowProfilePromptDismissed: loadWorkflowProfilePromptDismissed(),
  setTheme: (theme) => {
    persistTheme(theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark";
      persistTheme(next);
      return { theme: next };
    }),
  setActivePage: (activePage) => set({ activePage }),
  setWorkflowProfile: (workflowProfile) => {
    persistWorkflowProfile(workflowProfile);
    persistWorkflowProfilePromptDismissed(true);
    set({
      workflowProfile,
      hasChosenWorkflowProfile: true,
      workflowProfilePromptDismissed: true,
    });
  },
  dismissWorkflowProfilePrompt: () => {
    persistWorkflowProfilePromptDismissed(true);
    set({ workflowProfilePromptDismissed: true });
  },
}));
