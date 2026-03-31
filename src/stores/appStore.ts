import { create } from "zustand";

export type Theme = "dark" | "light";
export type ActivePage = "dashboard" | "terminal" | "analysis";
export type WorkflowProfile = "beginner" | "active_trader" | "options_trader";

const THEME_KEY = "sibt_theme";
const WORKFLOW_PROFILE_KEY = "sibt_workflow_profile";

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

function persistWorkflowProfile(profile: WorkflowProfile) {
  try { localStorage.setItem(WORKFLOW_PROFILE_KEY, profile); } catch { /* ignore */ }
}

// Set theme on document immediately (before React mounts) to prevent flash
persistTheme(loadTheme());

type AppState = {
  theme: Theme;
  activePage: ActivePage;
  workflowProfile: WorkflowProfile;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setActivePage: (page: ActivePage) => void;
  setWorkflowProfile: (profile: WorkflowProfile) => void;
};

export const useAppStore = create<AppState>((set) => ({
  theme: loadTheme(),
  activePage: "dashboard",
  workflowProfile: loadWorkflowProfile(),
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
    set({ workflowProfile });
  },
}));
