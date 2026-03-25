import { useMemo, useState } from "react";
import { useRegime } from "../hooks/useRegime";
import { usePrices } from "../hooks/usePrices";
import { usePortfolio } from "../hooks/usePortfolio";
import { useMarketHours } from "../hooks/useMarketHours";
import { computeVerdict } from "../lib/trafficLight";
import { TerminalShell } from "../components/layout/TerminalShell";
import { Panel } from "../components/layout/Panel";
import { ChatPanel } from "../components/ai/ChatPanel";
import { ResearchPanel } from "../components/ai/ResearchPanel";
import { ScreenerPanel } from "../components/ai/ScreenerPanel";
import type { IndexContract } from "../api/types";

const REGIME_INDEXES: IndexContract[] = [
  { symbol: "VIX", exchange: "CBOE" },
  { symbol: "VVIX", exchange: "CBOE" },
];

type RightTab = "research" | "screener";

export function AnalysisPage() {
  const { data: cri } = useRegime(true);
  const { data: portfolio } = usePortfolio();
  const { status } = useMarketHours();
  const [rightTab, setRightTab] = useState<RightTab>("research");

  const { prices } = usePrices({
    symbols: ["SPY"],
    indexes: REGIME_INDEXES,
    enabled: true,
  });

  const verdict = useMemo(
    () => computeVerdict({
      cri,
      marketStatus: status,
      liveVix: prices["VIX"]?.last,
      liveVvix: prices["VVIX"]?.last,
    }),
    [cri, status, prices],
  );

  const tabStyle = (active: boolean) => ({
    padding: "4px 12px",
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    fontWeight: active ? 700 : 400,
    color: active ? "var(--accent-bg)" : "var(--text-muted)",
    background: "none",
    border: "none",
    borderBottom: active ? "2px solid var(--accent-bg)" : "2px solid transparent",
    cursor: "pointer" as const,
  });

  return (
    <TerminalShell cri={cri}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          minHeight: 500,
        }}
      >
        <Panel title="Claude Analysis">
          <ChatPanel cri={cri} portfolio={portfolio} verdict={verdict} />
        </Panel>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{
            display: "flex",
            gap: 4,
            padding: "0 8px",
            borderBottom: "1px solid var(--border-dim)",
            background: "var(--bg-panel)",
          }}>
            <button style={tabStyle(rightTab === "research")} onClick={() => setRightTab("research")}>
              RESEARCH
            </button>
            <button style={tabStyle(rightTab === "screener")} onClick={() => setRightTab("screener")}>
              AI SCREENER
            </button>
          </div>
          <Panel title={rightTab === "research" ? "Research (Exa)" : "AI Stock Screener"}>
            {rightTab === "research" ? <ResearchPanel /> : <ScreenerPanel />}
          </Panel>
        </div>
      </div>
    </TerminalShell>
  );
}
