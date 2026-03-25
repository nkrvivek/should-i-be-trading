import { useState, useCallback, useEffect } from "react";
import type { TradeJournalEntry } from "../lib/strategy/types";

const STORAGE_KEY = "sibt_trade_journal";

function loadJournal(): TradeJournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveJournal(entries: TradeJournalEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function useTradeJournal() {
  const [entries, setEntries] = useState<TradeJournalEntry[]>(loadJournal);

  useEffect(() => {
    saveJournal(entries);
  }, [entries]);

  const addTrade = useCallback((entry: Omit<TradeJournalEntry, "id">) => {
    const newEntry: TradeJournalEntry = { ...entry, id: crypto.randomUUID() };
    setEntries((prev) => [newEntry, ...prev]);
    return newEntry;
  }, []);

  const updateTrade = useCallback((id: string, updates: Partial<TradeJournalEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  }, []);

  const closeTrade = useCallback((id: string, exitPrice: number) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const pnl = e.direction === "bearish"
          ? (e.entry.price - exitPrice) * 100
          : (exitPrice - e.entry.price) * 100;
        const pnlPercent = (pnl / (e.entry.price * 100)) * 100;
        return {
          ...e,
          status: "closed" as const,
          exit: { price: exitPrice, date: new Date().toISOString() },
          pnl,
          pnlPercent,
        };
      })
    );
  }, []);

  const deleteTrade = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const openTrades = entries.filter((e) => e.status === "open");
  const closedTrades = entries.filter((e) => e.status === "closed" || e.status === "expired");

  const stats = {
    totalTrades: closedTrades.length,
    winRate: closedTrades.length > 0
      ? (closedTrades.filter((e) => (e.pnl ?? 0) > 0).length / closedTrades.length) * 100
      : 0,
    avgPnl: closedTrades.length > 0
      ? closedTrades.reduce((sum, e) => sum + (e.pnl ?? 0), 0) / closedTrades.length
      : 0,
    totalPnl: closedTrades.reduce((sum, e) => sum + (e.pnl ?? 0), 0),
    avgPnlPercent: closedTrades.length > 0
      ? closedTrades.reduce((sum, e) => sum + (e.pnlPercent ?? 0), 0) / closedTrades.length
      : 0,
  };

  return { entries, openTrades, closedTrades, stats, addTrade, updateTrade, closeTrade, deleteTrade };
}
