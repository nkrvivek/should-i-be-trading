/**
 * Day Trading Activity Monitor — Activity sub-tab within SignalsPage.
 *
 * Shows volume leaders, insider buying clusters, and FINRA short interest.
 * Feature-gated to starter tier and above.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "../../stores/authStore";
import { hasFeature } from "../../lib/featureGates";
import { useMarketActivity } from "../../hooks/useMarketActivity";
import { VolumeLeaders } from "../../components/activity/VolumeLeaders";
import { InsiderClusterPanel } from "../../components/activity/InsiderClusterPanel";
import { ShortInterestMonitor } from "../../components/activity/ShortInterestMonitor";
import { detectInsiderClusters, type InsiderCluster, type InsiderTransaction } from "../../lib/activity/insiderClusters";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getEdgeHeaders } from "../../api/edgeHeaders";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/** Fetch insider transactions for a symbol via the Finnhub edge function */
async function fetchInsiderTransactions(symbol: string): Promise<InsiderTransaction[]> {
  if (!isSupabaseConfigured()) return [];
  const headers = await getEdgeHeaders();
  const url = `${SUPABASE_URL}/functions/v1/finnhub?endpoint=stock/insider-transactions&symbol=${symbol}`;
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];
    const json = await res.json();
    const txs = json?.data ?? json ?? [];
    if (!Array.isArray(txs)) return [];
    return txs.map((t: Record<string, unknown>) => ({
      symbol: symbol.toUpperCase(),
      name: (t.name as string) ?? "Unknown",
      title: (t.title as string) ?? undefined,
      transactionType: (t.transactionType as string) ?? (t.transactionCode as string) ?? "",
      value: Math.abs(Number(t.value) || Number(t.change) * Number(t.transactionPrice) || 0),
      date: (t.transactionDate as string) ?? (t.filingDate as string) ?? "",
      shares: Math.abs(Number(t.share) || Number(t.change) || 0),
    }));
  } catch {
    return [];
  }
}

export default function ActivityContent() {
  const effectiveTier = useAuthStore((s) => s.effectiveTier);
  const tier = effectiveTier();
  const canAccess = hasFeature(tier, "market_activity");

  const { data, loading, error, refresh } = useMarketActivity();
  const [clusters, setClusters] = useState<InsiderCluster[]>([]);
  const [clustersLoading, setClustersLoading] = useState(false);

  // Fetch insider data for top active symbols and detect clusters
  const loadClusters = useCallback(async () => {
    if (!data?.actives?.length) return;
    setClustersLoading(true);
    try {
      const topSymbols = data.actives.slice(0, 20).map((s) => s.symbol);
      const allTxs = await Promise.all(topSymbols.map(fetchInsiderTransactions));
      const flat = allTxs.flat();
      const detected = detectInsiderClusters(flat, 14, 2); // 14-day window
      setClusters(detected);
    } catch {
      setClusters([]);
    } finally {
      setClustersLoading(false);
    }
  }, [data?.actives]);

  useEffect(() => {
    if (canAccess && data?.actives?.length) {
      loadClusters();
    }
  }, [canAccess, data?.actives, loadClusters]);

  if (!canAccess) {
    return (
      <div style={{
        padding: 48,
        textAlign: "center",
        fontFamily: "var(--font-mono)",
        color: "var(--text-muted)",
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>
          Day Trading Activity Monitor
        </div>
        <div style={{ fontSize: 13, marginBottom: 16 }}>
          Upgrade to Starter or above to access real-time market activity, insider cluster detection, and FINRA short interest data.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        flexWrap: "wrap",
        gap: 8,
      }}>
        <div>
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: 20,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}>
            Day Trading Activity
          </div>
          <div style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--text-muted)",
            marginTop: 4,
          }}>
            Real-time volume leaders, insider clusters, and short interest
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            padding: "6px 14px",
            background: "var(--surface-secondary)",
            border: "1px solid var(--border-primary)",
            borderRadius: 6,
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div style={{
          padding: "10px 14px",
          marginBottom: 16,
          background: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          borderRadius: 6,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--signal-bearish, #ef4444)",
        }}>
          {error}
        </div>
      )}

      {/* Volume Leaders — full width */}
      <div style={{ marginBottom: 16 }}>
        <VolumeLeaders
          actives={data?.actives ?? []}
          gainers={data?.gainers ?? []}
          losers={data?.losers ?? []}
        />
      </div>

      {/* Two-column row: Insider Clusters + Short Interest */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
      }}>
        <InsiderClusterPanel clusters={clusters} loading={clustersLoading} />
        <ShortInterestMonitor data={data?.shortVolume ?? []} loading={loading} />
      </div>
    </div>
  );
}
