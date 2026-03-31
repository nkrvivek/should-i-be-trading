import { useMemo } from "react";
import { useRegime } from "../hooks/useRegime";
import { usePrices } from "../hooks/usePrices";
import { usePortfolio } from "../hooks/usePortfolio";
import { useOrders } from "../hooks/useOrders";
import { useScanner } from "../hooks/useScanner";
import { useDiscover } from "../hooks/useDiscover";
import { useMarketHours } from "../hooks/useMarketHours";
import { useMarketScore } from "../hooks/useMarketScore";
import { useRegimeMonitor } from "../hooks/useRegimeMonitor";
import { computeVerdict } from "../lib/trafficLight";
import { TerminalShell } from "../components/layout/TerminalShell";
import { Panel } from "../components/layout/Panel";
import { TrafficLight } from "../components/regime/TrafficLight";
import { RegimeStrip } from "../components/regime/RegimeStrip";
import { ComponentBars } from "../components/regime/ComponentBars";
import { ChatPanel } from "../components/ai/ChatPanel";
import { WatchlistPanel } from "../components/watchlist/WatchlistPanel";
import { DarkPoolFeed } from "../components/flow/DarkPoolFeed";
import { OptionsFlowFeed } from "../components/flow/OptionsFlowFeed";
import { PositionsPanel } from "../components/portfolio/PositionsPanel";
import { OrdersPanel } from "../components/portfolio/OrdersPanel";
import type { IndexContract } from "../api/types";

const WATCHLIST_SYMBOLS = ["SPY", "QQQ", "IWM", "DIA", "GLD", "TLT", "AAPL", "NVDA", "MSFT", "TSLA"];
const REGIME_INDEXES: IndexContract[] = [
  { symbol: "VIX", exchange: "CBOE" },
  { symbol: "VVIX", exchange: "CBOE" },
];

export function TerminalPage() {
  const { data: cri } = useRegime(true);
  const { data: portfolio, loading: portfolioLoading, refresh: refreshPortfolio } = usePortfolio();
  const { data: orders, loading: ordersLoading, refresh: refreshOrders } = useOrders();
  const { data: scanner, loading: scannerLoading, refresh: refreshScanner } = useScanner();
  const { data: discover, loading: discoverLoading, refresh: refreshDiscover } = useDiscover();
  const { status } = useMarketHours();
  const { score: marketScore } = useMarketScore();
  useRegimeMonitor();

  // Gather all symbols for WS subscription
  const portfolioSymbols = useMemo(
    () => (portfolio?.positions ?? []).map((p) => p.ticker),
    [portfolio],
  );
  const allSymbols = useMemo(
    () => [...new Set([...WATCHLIST_SYMBOLS, ...portfolioSymbols])],
    [portfolioSymbols],
  );

  const { prices, connected } = usePrices({
    symbols: allSymbols,
    indexes: REGIME_INDEXES,
    enabled: true,
  });

  const verdict = useMemo(
    () => computeVerdict({
      cri,
      marketStatus: status,
      liveVix: prices["VIX"]?.last,
      liveVvix: prices["VVIX"]?.last,
      marketScore,
    }),
    [cri, status, prices, marketScore],
  );

  return (
    <TerminalShell cri={cri}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr 1fr",
          gridTemplateRows: "auto 1fr 1fr",
          gap: 8,
          height: "100%",
        }}
      >
        {/* Left column: verdict + regime */}
        <div style={{ gridRow: "1 / -1", display: "flex", flexDirection: "column", gap: 8 }}>
          <TrafficLight verdict={verdict} />
          {cri?.cri?.components && <ComponentBars components={cri.cri.components} />}
        </div>

        {/* Top middle: regime strip */}
        <div style={{ gridColumn: "2 / 4" }}>
          {cri && <RegimeStrip cri={cri} prices={prices} connected={connected} />}
        </div>

        {/* Middle left: watchlist */}
        <Panel title="Watchlist">
          <WatchlistPanel prices={prices} symbols={WATCHLIST_SYMBOLS} />
        </Panel>

        {/* Middle right: portfolio */}
        <Panel title="Portfolio" onRefresh={refreshPortfolio} loading={portfolioLoading}>
          <PositionsPanel positions={portfolio?.positions ?? []} loading={portfolioLoading} />
        </Panel>

        {/* Bottom left: dark pool */}
        <Panel title="Dark Pool Flow" onRefresh={refreshScanner} loading={scannerLoading}>
          <DarkPoolFeed signals={scanner?.top_signals ?? []} loading={scannerLoading} />
        </Panel>

        {/* Bottom right: options flow */}
        <Panel title="Options Flow" onRefresh={refreshDiscover} loading={discoverLoading}>
          <OptionsFlowFeed candidates={discover?.candidates ?? []} loading={discoverLoading} />
        </Panel>
      </div>

      {/* Orders floating panel */}
      {orders && orders.open_count > 0 && (
        <div style={{ marginTop: 8 }}>
          <Panel title={`Open Orders (${orders.open_count})`} onRefresh={refreshOrders} loading={ordersLoading}>
            <OrdersPanel orders={orders.open_orders} />
          </Panel>
        </div>
      )}

      {/* AI Chat */}
      <div style={{ marginTop: 16 }}>
        <ChatPanel />
      </div>
    </TerminalShell>
  );
}
