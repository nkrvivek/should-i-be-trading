import { create } from "zustand";

export type Theme = "dark" | "light";
export type ActivePage = "dashboard" | "terminal" | "analysis";

type AppState = {
  theme: Theme;
  activePage: ActivePage;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setActivePage: (page: ActivePage) => void;
};

export const useAppStore = create<AppState>((set) => ({
  theme: "dark",
  activePage: "dashboard",
  setTheme: (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      return { theme: next };
    }),
  setActivePage: (activePage) => set({ activePage }),
}));
