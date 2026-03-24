import { useEffect, useMemo } from "react";
import { useMarketHours } from "../hooks/useMarketHours";
import { useSignalHistory } from "../hooks/useSignalHistory";
import { useMarketScore } from "../hooks/useMarketScore";
import { computeVerdict } from "../lib/trafficLight";
import { TerminalShell } from "../components/layout/TerminalShell";
import { TrafficLight } from "../components/regime/TrafficLight";
import { ScoreBreakdown } from "../components/regime/ScoreBreakdown";
import { SignalTimeline } from "../components/regime/SignalTimeline";
import { SectorHeatMap } from "../components/market/SectorHeatMap";
import { TickerChart } from "../components/market/TickerChart";
import { WatchlistManager } from "../components/watchlist/WatchlistManager";
import { Panel } from "../components/layout/Panel";

export function DashboardPage() {
  const { status } = useMarketHours();
  const { history, recordVerdict } = useSignalHistory();
  const { score: marketScore, loading: scoreLoading, refresh: refreshScore } = useMarketScore();

  const verdict = useMemo(
    () =>
      computeVerdict({
        cri: null,
        marketStatus: status,
        marketScore,
      }),
    [status, marketScore],
  );

  // Record verdict changes to signal history
  useEffect(() => {
    if (verdict && marketScore) {
      recordVerdict(verdict, marketScore.total ?? null, null);
    }
  }, [verdict.signal, marketScore?.total]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TerminalShell>
      {/* Loading indicator */}
      {scoreLoading && !marketScore && (
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

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 1400,
          margin: "0 auto",
        }}
      >
        {/* Row 1: Traffic Light + Market Quality Score */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
          <TrafficLight verdict={verdict} />
          <ScoreBreakdown
            score={marketScore}
            loading={scoreLoading}
            onRefresh={refreshScore}
          />
        </div>

        {/* Row 2: Sector Heat Map + Chart — fills viewport */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          height: "calc(100vh - 200px)",
          minHeight: 600,
        }}>
          <div style={{ height: "100%", overflow: "auto" }}>
            <SectorHeatMap />
          </div>
          <TickerChart />
        </div>

        {/* Row 3: Watchlist */}
        <WatchlistManager />

        {/* Row 4: Signal Timeline */}
        <Panel title={`Signal History (${history.length})`}>
          <SignalTimeline history={history} />
        </Panel>
      </div>
    </TerminalShell>
  );
}
