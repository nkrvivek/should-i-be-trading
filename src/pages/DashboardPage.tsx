import { useEffect, useMemo } from "react";
import { useRegime } from "../hooks/useRegime";
import { usePrices } from "../hooks/usePrices";
import { useMarketHours } from "../hooks/useMarketHours";
import { useSignalHistory } from "../hooks/useSignalHistory";
import { useMarketScore } from "../hooks/useMarketScore";
import { computeVerdict } from "../lib/trafficLight";
import { TerminalShell } from "../components/layout/TerminalShell";
import { TrafficLight } from "../components/regime/TrafficLight";
import { RegimeGauge } from "../components/regime/RegimeGauge";
import { RegimeStrip } from "../components/regime/RegimeStrip";
import { ComponentBars } from "../components/regime/ComponentBars";
import { CrashTrigger } from "../components/regime/CrashTrigger";
import { RegimeHistory } from "../components/regime/RegimeHistory";
import { ScoreBreakdown } from "../components/regime/ScoreBreakdown";
import { SignalTimeline } from "../components/regime/SignalTimeline";
import { DailyBriefing } from "../components/regime/DailyBriefing";
import { InsiderActivityPanel } from "../components/insider/InsiderActivityPanel";
import { InsiderMarketOverview } from "../components/insider/InsiderMarketOverview";
import { CongressTradingPanel } from "../components/congress/CongressTradingPanel";
import { SectorHeatMap } from "../components/market/SectorHeatMap";
import { TickerChart } from "../components/market/TickerChart";
import { WatchlistManager } from "../components/watchlist/WatchlistManager";
import { Panel } from "../components/layout/Panel";
import type { IndexContract } from "../api/types";

const REGIME_INDEXES: IndexContract[] = [
  { symbol: "VIX", exchange: "CBOE" },
  { symbol: "VVIX", exchange: "CBOE" },
];

export function DashboardPage() {
  const { data: cri, scanning } = useRegime(true);
  const { status } = useMarketHours();
  const { history, recordVerdict } = useSignalHistory();
  const { score: marketScore, loading: scoreLoading, refresh: refreshScore } = useMarketScore();

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
        marketScore,
      }),
    [cri, status, prices, marketScore],
  );

  // Record verdict changes to signal history
  useEffect(() => {
    if (verdict && (cri || marketScore)) {
      recordVerdict(verdict, cri?.cri?.score ?? marketScore?.total ?? null, cri?.vix ?? null);
    }
  }, [verdict.signal, cri?.cri?.score, marketScore?.total]); // eslint-disable-line react-hooks/exhaustive-deps

  // Use market score total for gauge when no CRI
  const gaugeScore = cri?.cri?.score ?? marketScore?.total ?? 0;
  const gaugeLevel = cri?.cri?.level ?? (
    marketScore ? (
      marketScore.total >= 80 ? "LOW" :
      marketScore.total >= 60 ? "ELEVATED" :
      marketScore.total >= 40 ? "HIGH" : "CRITICAL"
    ) : "UNKNOWN"
  );

  return (
    <TerminalShell cri={cri}>
      {/* Loading indicator */}
      {(scanning || scoreLoading) && !cri && !marketScore && (
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
          Computing market quality score...
        </div>
      )}

      {/* Dashboard content — always renders */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gridTemplateRows: "auto auto auto",
          gap: 16,
          maxWidth: 1400,
          margin: "0 auto",
        }}
      >
        {/* Left column: Traffic Light + Gauge */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <TrafficLight verdict={verdict} />
          <RegimeGauge
            score={gaugeScore}
            level={gaugeLevel}
          />
          {cri?.crash_trigger && <CrashTrigger trigger={cri.crash_trigger} />}
        </div>

        {/* Right column: Score Breakdown + Regime Strip (if Radon connected) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Market Quality Score — always visible, primary scoring engine */}
          <ScoreBreakdown
            score={marketScore}
            loading={scoreLoading}
            onRefresh={refreshScore}
          />

          {/* Radon CRI strip — shown only when Radon is connected (enhanced data) */}
          {cri && (
            <>
              <Panel title="Radon CRI (Enhanced)">
                <div style={{
                  padding: "4px 8px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--signal-core)",
                  background: "rgba(5, 173, 152, 0.05)",
                  borderRadius: 4,
                  marginBottom: 8,
                }}>
                  Dark pool + institutional flow data via Radon
                </div>
              </Panel>
              <RegimeStrip cri={cri} prices={prices} connected={connected} />
              {cri.cri?.components && <ComponentBars components={cri.cri.components} />}
              <RegimeHistory history={cri.history ?? []} />
            </>
          )}
        </div>

        {/* Full-width: Sector Heat Map + Chart */}
        <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, minHeight: 700 }}>
          <div style={{ minHeight: 700 }}>
            <SectorHeatMap />
          </div>
          <div style={{ minHeight: 700 }}>
            <TickerChart />
          </div>
        </div>

        {/* Full-width: Watchlist Manager */}
        <div style={{ gridColumn: "1 / -1" }}>
          <WatchlistManager />
        </div>

        {/* Full-width: Insider Activity + Congress Trading */}
        <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <InsiderActivityPanel />
          <CongressTradingPanel />
        </div>

        {/* Full-width: Insider Market Overview */}
        <div style={{ gridColumn: "1 / -1" }}>
          <InsiderMarketOverview />
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
    </TerminalShell>
  );
}
