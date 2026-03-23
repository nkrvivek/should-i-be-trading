import { create } from "zustand";

export type Theme = "dark" | "light";
export type ActivePage = "dashboard" | "terminal" | "analysis";

const THEME_KEY = "sibt_theme";

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

// Set theme on document immediately (before React mounts) to prevent flash
persistTheme(loadTheme());

type AppState = {
  theme: Theme;
  activePage: ActivePage;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setActivePage: (page: ActivePage) => void;
};

export const useAppStore = create<AppState>((set) => ({
  theme: loadTheme(),
  activePage: "dashboard",
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
}));
