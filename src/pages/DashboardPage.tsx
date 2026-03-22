import { useEffect, useMemo } from "react";
import { useRegime } from "../hooks/useRegime";
import { usePrices } from "../hooks/usePrices";
import { useMarketHours } from "../hooks/useMarketHours";
import { useSignalHistory } from "../hooks/useSignalHistory";
import { computeVerdict } from "../lib/trafficLight";
import { TerminalShell } from "../components/layout/TerminalShell";
import { TrafficLight } from "../components/regime/TrafficLight";
import { RegimeGauge } from "../components/regime/RegimeGauge";
import { RegimeStrip } from "../components/regime/RegimeStrip";
import { ComponentBars } from "../components/regime/ComponentBars";
import { CrashTrigger } from "../components/regime/CrashTrigger";
import { RegimeHistory } from "../components/regime/RegimeHistory";
import { SignalTimeline } from "../components/regime/SignalTimeline";
import { DailyBriefing } from "../components/regime/DailyBriefing";
import { Panel } from "../components/layout/Panel";
import type { IndexContract } from "../api/types";

const REGIME_INDEXES: IndexContract[] = [
  { symbol: "VIX", exchange: "CBOE" },
  { symbol: "VVIX", exchange: "CBOE" },
];

export function DashboardPage() {
  const { data: cri, loading, scanning, error } = useRegime(true);
  const { status } = useMarketHours();
  const { history, recordVerdict } = useSignalHistory();

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

  // Record verdict changes to signal history
  useEffect(() => {
    if (cri && verdict) {
      recordVerdict(verdict, cri.cri?.score ?? null, cri.vix ?? null);
    }
  }, [verdict.signal, cri?.cri?.score]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TerminalShell cri={cri}>
      {/* Scanning indicator — shown as a banner, doesn't block content */}
      {scanning && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            background: "rgba(5, 173, 152, 0.08)",
            border: "1px solid rgba(5, 173, 152, 0.2)",
            borderRadius: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--signal-core)",
            marginBottom: 12,
          }}
        >
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--signal-core)", animation: "pulse 1.5s infinite" }} />
          {cri ? "Refreshing regime data..." : "Running initial CRI scan — this may take up to 2 minutes..."}
        </div>
      )}

      {error && !cri && (
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

      {/* Show loading skeleton only when no data at all */}
      {loading && !cri && !scanning && (
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
          Connecting to Radon...
        </div>
      )}

      {/* Dashboard content — renders as soon as we have ANY data (cached or fresh) */}
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

          {/* Full-width: Daily Briefing */}
          <div style={{ gridColumn: "1 / -1" }}>
            <DailyBriefing cri={cri} verdict={verdict} />
          </div>

          {/* Full-width: Signal Timeline */}
          <div style={{ gridColumn: "1 / -1" }}>
            <Panel title={`Signal History (${history.length})`}>
              <SignalTimeline history={history} />
            </Panel>
          </div>
        </div>
      )}

      {!loading && !scanning && !cri && !error && (
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
