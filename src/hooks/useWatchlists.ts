import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";

export type Watchlist = {
  id: string;
  name: string;
  tickers: string[];
  is_default: boolean;
};

const DEFAULT_WATCHLIST: Watchlist = {
  id: "local",
  name: "Default",
  tickers: ["SPY", "QQQ", "IWM", "DIA", "GLD", "TLT", "AAPL", "NVDA", "MSFT", "TSLA"],
  is_default: true,
};

export function useWatchlists() {
  const { user } = useAuthStore();
  const [watchlists, setWatchlists] = useState<Watchlist[]>([DEFAULT_WATCHLIST]);
  const [activeId, setActiveId] = useState<string>("local");
  const [loading, setLoading] = useState(false);

  const activeWatchlist = watchlists.find((w) => w.id === activeId) ?? watchlists[0] ?? DEFAULT_WATCHLIST;

  const fetchWatchlists = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;
    setLoading(true);
    const { data } = await supabase
      .from("watchlists")
      .select("id, name, tickers, is_default")
      .eq("user_id", user.id)
      .order("sort_order");
    if (data && data.length > 0) {
      setWatchlists(data);
      const def = data.find((w) => w.is_default);
      if (def) setActiveId(def.id);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchWatchlists(); }, [fetchWatchlists]); // eslint-disable-line react-hooks/set-state-in-effect

  const createWatchlist = useCallback(async (name: string, tickers: string[]) => {
    if (!user || !isSupabaseConfigured()) return;
    const { data } = await supabase
      .from("watchlists")
      .insert({ user_id: user.id, name, tickers })
      .select()
      .single();
    if (data) {
      setWatchlists((prev) => [...prev, data]);
      setActiveId(data.id);
    }
  }, [user]);

  const updateWatchlist = useCallback(async (id: string, updates: Partial<Pick<Watchlist, "name" | "tickers">>) => {
    if (!isSupabaseConfigured()) {
      // Local mode: update in-place
      setWatchlists((prev) => prev.map((w) => w.id === id ? { ...w, ...updates } : w));
      return;
    }
    await supabase.from("watchlists").update(updates).eq("id", id);
    await fetchWatchlists();
  }, [fetchWatchlists]);

  const deleteWatchlist = useCallback(async (id: string) => {
    if (!isSupabaseConfigured()) return;
    await supabase.from("watchlists").delete().eq("id", id);
    await fetchWatchlists();
  }, [fetchWatchlists]);

  return {
    watchlists,
    activeWatchlist,
    activeId,
    setActiveId,
    createWatchlist,
    updateWatchlist,
    deleteWatchlist,
    loading,
  };
}
