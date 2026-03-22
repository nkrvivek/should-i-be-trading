import { useMemo } from "react";
import { useRegime } from "../hooks/useRegime";
import { usePrices } from "../hooks/usePrices";
import { useMarketHours } from "../hooks/useMarketHours";
import { computeVerdict } from "../lib/trafficLight";
import { TerminalShell } from "../components/layout/TerminalShell";
import { TrafficLight } from "../components/regime/TrafficLight";
import { RegimeGauge } from "../components/regime/RegimeGauge";
import { RegimeStrip } from "../components/regime/RegimeStrip";
import { ComponentBars } from "../components/regime/ComponentBars";
import { CrashTrigger } from "../components/regime/CrashTrigger";
import { RegimeHistory } from "../components/regime/RegimeHistory";
import type { IndexContract } from "../api/types";

const REGIME_INDEXES: IndexContract[] = [
  { symbol: "VIX", exchange: "CBOE" },
  { symbol: "VVIX", exchange: "CBOE" },
];

export function DashboardPage() {
  const { data: cri, loading, error } = useRegime(true);
  const { status } = useMarketHours();

  const { prices, connected } = usePrices({
    symbols: ["SPY"],
    indexes: REGIME_INDEXES,
    enabled: true,
  });

  const verdict = useMemo(
    () =>
      computeVerdict({
        cri,
        marketStatus: status,
        liveVix: prices["VIX"]?.last,
        liveVvix: prices["VVIX"]?.last,
      }),
    [cri, status, prices],
  );

  return (
    <TerminalShell cri={cri}>
      {error && (
        <div
          style={{
            padding: "8px 16px",
            background: "rgba(232, 93, 108, 0.1)",
            border: "1px solid var(--negative)",
            borderRadius: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--negative)",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {loading && !cri && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "60vh",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          Running CRI scan...
        </div>
      )}

      {cri && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            gridTemplateRows: "auto auto auto",
            gap: 16,
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          {/* Left column: Traffic Light + Gauge + Crash Trigger */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <TrafficLight verdict={verdict} />
            <RegimeGauge score={cri.cri?.score ?? 0} level={cri.cri?.level ?? "LOW"} />
            {cri.crash_trigger && <CrashTrigger trigger={cri.crash_trigger} />}
          </div>

          {/* Right column: Strip + Components + History */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <RegimeStrip cri={cri} prices={prices} connected={connected} />
            {cri.cri?.components && <ComponentBars components={cri.cri.components} />}
            <RegimeHistory history={cri.history ?? []} />
          </div>
        </div>
      )}

      {!loading && !cri && !error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "60vh",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          No regime data. Ensure Radon FastAPI is running on localhost:8321.
        </div>
      )}
    </TerminalShell>
  );
}
