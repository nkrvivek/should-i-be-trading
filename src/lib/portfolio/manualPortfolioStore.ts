/**
 * Manual Portfolio Store — Zustand store with localStorage persistence
 * for CSV-imported positions.
 */
import { create } from "zustand";
import type { ManualPosition } from "../strategy/types";

const STORAGE_KEY = "sibt_manual_portfolio";

interface ManualPortfolioState {
  positions: ManualPosition[];
  source: string;
  importedAt: string | null;
  addPositions: (positions: ManualPosition[], source: string) => void;
  removePosition: (id: string) => void;
  clearAll: () => void;
}

/** Load persisted state from localStorage */
function loadFromStorage(): { positions: ManualPosition[]; source: string; importedAt: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { positions: [], source: "", importedAt: null };
    const parsed = JSON.parse(raw);
    return {
      positions: Array.isArray(parsed.positions) ? parsed.positions : [],
      source: parsed.source || "",
      importedAt: parsed.importedAt || null,
    };
  } catch {
    return { positions: [], source: "", importedAt: null };
  }
}

/** Persist state to localStorage */
function saveToStorage(state: { positions: ManualPosition[]; source: string; importedAt: string | null }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      positions: state.positions,
      source: state.source,
      importedAt: state.importedAt,
    }));
  } catch { /* quota exceeded — silently fail */ }
}

const initial = loadFromStorage();

export const useManualPortfolioStore = create<ManualPortfolioState>((set, get) => ({
  positions: initial.positions,
  source: initial.source,
  importedAt: initial.importedAt,

  addPositions: (positions, source) => {
    const now = new Date().toISOString();
    const next = {
      positions: [...get().positions, ...positions],
      source,
      importedAt: now,
    };
    saveToStorage(next);
    set(next);
  },

  removePosition: (id) => {
    const next = {
      positions: get().positions.filter((p) => p.id !== id),
      source: get().source,
      importedAt: get().importedAt,
    };
    saveToStorage(next);
    set({ positions: next.positions });
  },

  clearAll: () => {
    const next = { positions: [], source: "", importedAt: null };
    saveToStorage(next);
    set(next);
  },
}));
