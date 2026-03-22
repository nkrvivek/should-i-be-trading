import { useCallback, useEffect, useState } from "react";
import type { TrafficLightVerdict } from "../lib/trafficLight";

export type SignalHistoryEntry = {
  timestamp: string;
  signal: string;
  confidence: number;
  vixRegime: string;
  reasons: string[];
  criScore: number | null;
  vix: number | null;
};

const STORAGE_KEY = "sibt_signal_history";
const MAX_ENTRIES = 100;

function loadHistory(): SignalHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: SignalHistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function useSignalHistory() {
  const [history, setHistory] = useState<SignalHistoryEntry[]>(loadHistory);

  const recordVerdict = useCallback((verdict: TrafficLightVerdict, criScore: number | null, vix: number | null) => {
    setHistory((prev) => {
      // Don't duplicate if same signal within 5 minutes
      const last = prev[0];
      if (last) {
        const elapsed = Date.now() - new Date(last.timestamp).getTime();
        if (elapsed < 300_000 && last.signal === verdict.signal) return prev;
      }

      const entry: SignalHistoryEntry = {
        timestamp: new Date().toISOString(),
        signal: verdict.signal,
        confidence: verdict.confidence,
        vixRegime: verdict.vixRegime.label,
        reasons: verdict.reasons.slice(0, 3),
        criScore,
        vix,
      };

      const next = [entry, ...prev].slice(0, MAX_ENTRIES);
      saveHistory(next);
      return next;
    });
  }, []);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setHistory(loadHistory());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return { history, recordVerdict };
}
