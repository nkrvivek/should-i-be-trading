import { useMemo } from "react";
import { useRegime } from "../hooks/useRegime";
import { usePrices } from "../hooks/usePrices";
import { usePortfolio } from "../hooks/usePortfolio";
import { useMarketHours } from "../hooks/useMarketHours";
import { computeVerdict } from "../lib/trafficLight";
import { TerminalShell } from "../components/layout/TerminalShell";
import { Panel } from "../components/layout/Panel";
import { ChatPanel } from "../components/ai/ChatPanel";
import { ResearchPanel } from "../components/ai/ResearchPanel";
import type { IndexContract } from "../api/types";

const REGIME_INDEXES: IndexContract[] = [
  { symbol: "VIX", exchange: "CBOE" },
  { symbol: "VVIX", exchange: "CBOE" },
];

export function AnalysisPage() {
  const { data: cri } = useRegime(true);
  const { data: portfolio } = usePortfolio();
  const { status } = useMarketHours();

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

  return (
    <TerminalShell cri={cri}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          height: "100%",
        }}
      >
        <Panel title="Claude Analysis">
          <ChatPanel cri={cri} portfolio={portfolio} verdict={verdict} />
        </Panel>
        <Panel title="Research (Exa)">
          <ResearchPanel />
        </Panel>
      </div>
    </TerminalShell>
  );
}
