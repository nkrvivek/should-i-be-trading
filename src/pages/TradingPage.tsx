import { useEffect, useState, useCallback, useMemo, lazy, Suspense, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TerminalShell } from "../components/layout/TerminalShell";
import { useBrokerStore } from "../stores/brokerStore";
import { useTradeJournal } from "../hooks/useTradeJournal";
import { useMarketScore } from "../hooks/useMarketScore";
import { useRegimeMonitor } from "../hooks/useRegimeMonitor";
import { TradeVerdictBadgeWithScore } from "../components/trading/TradeVerdictBadge";
import { WorkflowHandoffCard } from "../components/shared/WorkflowHandoffCard";
import { detectWashSales } from "../lib/strategy/washSaleDetector";
import type { OrderRequest } from "../lib/brokers/types";
import type { SimulatorLeg } from "../lib/strategy/payoff";
import type { StrategySuggestion } from "../lib/portfolio/strategyAnalyzer";

const CsvUploadPanel = lazy(() => import("../components/portfolio/CsvUploadPanel"));
const ManualPortfolioTable = lazy(() => import("../components/portfolio/ManualPortfolioTable"));
const FlowAnalysisPanel = lazy(() => import("../components/trading/FlowAnalysisPanel"));
const StrategySuggester = lazy(() => import("../components/trading/StrategySuggester"));
const StrategyAnalysisPanel = lazy(() => import("../components/portfolio/StrategyAnalysisPanel"));
const WashSalePanel = lazy(() => import("../components/portfolio/WashSalePanel"));
const PortfolioRiskWidget = lazy(() => import("../components/portfolio/PortfolioRiskWidget").then((m) => ({ default: m.PortfolioRiskWidget })));
const OrderReviewModal = lazy(() => import("../components/trading/OrderReviewModal"));

const panelStyle: React.CSSProperties = {
  background: "var(--bg-panel, #fff)",
  border: "1px solid var(--border-dim, #e2e8f0)",
  borderRadius: 4,
  padding: 16,
  marginBottom: 16,
};

const headerStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase" as const,
  color: "var(--text-secondary, #64748b)",
  marginBottom: 12,
};

const tabLoader = (
  <div style={{ textAlign: "center", padding: 32, color: "var(--text-secondary)" }}>
    Loading...
  </div>
);

const monoStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
};

type TabId = "import" | "strategies" | "portfolio" | "orders" | "flow" | "journal";
type StageId = "setup" | "review" | "execute" | "reflect";

const BROKER_TABS: TabId[] = ["portfolio", "orders", "flow", "journal"];
const STAGE_ORDER: StageId[] = ["setup", "review", "execute", "reflect"];

const STAGE_CONFIG: Record<StageId, { label: string; blurb: string; tabs: TabId[] }> = {
  setup: {
    label: "Setup",
    blurb: "Bring in holdings, inspect positions, and decide which symbols deserve deeper work.",
    tabs: ["import", "portfolio"],
  },
  review: {
    label: "Review",
    blurb: "Pressure-test the idea with strategy analysis, flow, and account context before sending anything live.",
    tabs: ["strategies", "flow"],
  },
  execute: {
    label: "Execute",
    blurb: "Handle live orders and broker-side activity only after the setup and review are already clear.",
    tabs: ["orders"],
  },
  reflect: {
    label: "Reflect",
    blurb: "Close the loop with journaling, exits, and trade review discipline.",
    tabs: ["journal"],
  },
};

const TAB_LABELS: Record<TabId, string> = {
  import: "Import Portfolio",
  portfolio: "Portfolio",
  strategies: "Strategy Review",
  flow: "Flow Analysis",
  orders: "Orders",
  journal: "Journal",
};

function getStageForTab(tab: TabId): StageId {
  if (tab === "import" || tab === "portfolio") return "setup";
  if (tab === "strategies" || tab === "flow") return "review";
  if (tab === "orders") return "execute";
  return "reflect";
}

export default function TradingPage() {
  const [searchParams] = useSearchParams();
  useMarketScore();
  useRegimeMonitor();

  const {
    connections,
    accounts,
    loading: loadingMap,
    errors: errorsMap,
    allPositions,
    allOrders,
    allAccounts,
    refresh,
    reconnectAll,
    cancelOrder,
    placeOrder,
  } = useBrokerStore();

  const navigate = useNavigate();
  const selectedSymbol = (searchParams.get("symbol") || "").trim().toUpperCase();
  const hasConnections = connections.length > 0;
  const hasAnyAccount = Object.keys(accounts).length > 0;
  const brokerReady = hasConnections && hasAnyAccount;

  const [tab, setTab] = useState<TabId>(() => brokerReady ? "portfolio" : "import");
  const brokerSyncAttemptedRef = useRef(false);
  const [executionModal, setExecutionModal] = useState<{
    open: boolean;
    symbol: string;
    price: number;
    suggestion: StrategySuggestion;
  } | null>(null);

  const handleOpenExecutionModal = useCallback(
    (symbol: string, price: number, suggestion: StrategySuggestion) => {
      setExecutionModal({ open: true, symbol, price, suggestion });
    },
    [],
  );

  const handleCloseExecutionModal = useCallback(() => {
    setExecutionModal(null);
  }, []);

  const handleExecutionComplete = useCallback(() => {
    // Auto-refresh broker data after execution
    refresh();
  }, [refresh]);

  const handleViewOrdersAfterExecution = useCallback(() => {
    setExecutionModal(null);
    setTab("orders");
  }, []);

  const isAnyLoading = Object.values(loadingMap).some(Boolean);
  const firstError = Object.values(errorsMap).find((e) => e != null) ?? null;

  const positions = allPositions();
  const orders = allOrders();
  const combinedAccounts = allAccounts();

  useEffect(() => {
    if (!hasConnections) {
      brokerSyncAttemptedRef.current = false;
      return;
    }
    if (!BROKER_TABS.includes(tab) || brokerReady || isAnyLoading || brokerSyncAttemptedRef.current) {
      return;
    }
    brokerSyncAttemptedRef.current = true;
    void reconnectAll();
  }, [brokerReady, hasConnections, isAnyLoading, reconnectAll, tab]);

  // If user is on a broker tab and broker disconnects, reset to import
  // This is an event-driven transition, not a render-time derivation
  useEffect(() => {
    if (!hasConnections && BROKER_TABS.includes(tab)) {
      setTab("import"); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [hasConnections, tab]);

  const visibleTabs: TabId[] = hasConnections
    ? [...BROKER_TABS, "strategies", "import"]
    : ["import", "strategies"];

  const activeTab = tab;
  const visibleStages = STAGE_ORDER.filter((stage) =>
    STAGE_CONFIG[stage].tabs.some((stageTab) => visibleTabs.includes(stageTab)),
  );
  const activeStage = getStageForTab(activeTab);
  const visibleStageTabs = STAGE_CONFIG[activeStage].tabs.filter((stageTab) => visibleTabs.includes(stageTab));

  // Wrap placeOrder/cancelOrder for legacy OrdersPanel (uses first connection)
  const handlePlaceOrder = async (order: OrderRequest) => {
    if (connections.length === 0) throw new Error("No broker connected");
    return placeOrder(connections[0].id, order);
  };
  const handleCancelOrder = async (orderId: string) => {
    // Find which connection owns this order
    const allOrd = allOrders();
    const match = allOrd.find((o) => o.id === orderId);
    const connId = match?.brokerId ?? connections[0]?.id;
    if (!connId) throw new Error("No broker connected");
    return cancelOrder(connId, orderId);
  };

  return (
    <TerminalShell>
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ ...monoStyle, fontSize: 24, fontWeight: 700 }}>TRADING</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {brokerReady ? (
            <>
              {connections.map((conn) => {
                const connAccount = accounts[conn.id];
                const connLoading = loadingMap[conn.id];
                const connError = errorsMap[conn.id];
                return (
                  <span
                    key={conn.id}
                    style={{
                      ...monoStyle,
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: connError
                        ? "rgba(234, 179, 8, 0.12)"
                        : "rgba(5, 173, 152, 0.12)",
                      color: connError
                        ? "var(--warning, #f59e0b)"
                        : "var(--signal-core, #05AD98)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {conn.displayName.toUpperCase()}
                    {connAccount?.isPaperTrading ? " (PAPER)" : ""}
                    {connLoading && " ..."}
                    {connError && " OFFLINE"}
                  </span>
                );
              })}
              <button
                onClick={() => {
                  brokerSyncAttemptedRef.current = true;
                  void refresh();
                }}
                style={{
                  ...monoStyle,
                  fontSize: 13,
                  padding: "4px 12px",
                  border: "1px solid var(--border-dim)",
                  borderRadius: 4,
                  background: "none",
                  cursor: "pointer",
                }}
              >
                REFRESH
              </button>
              <button
                onClick={() => navigate("/settings?tab=brokerage")}
                style={{
                  ...monoStyle,
                  fontSize: 13,
                  padding: "4px 12px",
                  border: "1px solid var(--signal-core)",
                  borderRadius: 4,
                  background: "none",
                  color: "var(--signal-core)",
                  cursor: "pointer",
                }}
              >
                + BROKER
              </button>
            </>
          ) : hasConnections && isAnyLoading ? (
            <span style={{ ...monoStyle, fontSize: 13, color: "var(--warning, #f59e0b)", animation: "pulse 1.4s ease-in-out infinite" }}>
              CONNECTING...
            </span>
          ) : hasConnections && firstError ? (
            <span style={{ ...monoStyle, fontSize: 13, color: "var(--text-muted, #94a3b8)" }}>
              BROKER OFFLINE
            </span>
          ) : (
            <button
              onClick={() => navigate("/settings?tab=brokerage")}
              style={{
                ...monoStyle,
                fontSize: 13,
                padding: "4px 12px",
                border: "1px solid var(--signal-core)",
                borderRadius: 4,
                background: "none",
                color: "var(--signal-core)",
                cursor: "pointer",
              }}
            >
              + BROKER
            </button>
          )}
        </div>
      </div>

      {/* Account Summary (when broker connected) */}
      {brokerReady && combinedAccounts.length > 0 && (
        <AccountSummary accounts={combinedAccounts} connections={connections} />
      )}
      {hasConnections && firstError && !brokerReady && (
        <div style={{ ...panelStyle, background: "var(--bg-panel-raised, #f8fafc)", color: "var(--text-secondary)", border: "1px solid var(--border-dim)", display: "flex", alignItems: "center", gap: 12, fontSize: 13, fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)" }}>
          <span style={{ fontSize: 18 }}>⚠</span>
          <div>
            <strong>Broker connection unavailable</strong> — {firstError.includes("502") || firstError.includes("Gateway") ? "IB Gateway is not running or still starting up. Start it and approve 2FA, then refresh." : firstError}
            <div style={{ marginTop: 4 }}>
              <button onClick={() => refresh()} style={{ ...monoStyle, fontSize: 12, padding: "2px 10px", border: "1px solid var(--border-dim)", borderRadius: 4, background: "none", cursor: "pointer", marginRight: 8 }}>RETRY</button>
              <span style={{ color: "var(--text-muted)" }}>Portfolio import and strategy analysis are available below without a broker.</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        {selectedSymbol && (
          <div style={{
            padding: 14,
            borderRadius: 8,
            border: "1px solid rgba(5, 173, 152, 0.25)",
            background: "linear-gradient(180deg, rgba(5, 173, 152, 0.08), rgba(5, 173, 152, 0.02))",
          }}>
            <div style={{ ...monoStyle, fontSize: 11, color: "var(--signal-core)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>
              ACTIVE TICKER
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ ...monoStyle, fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                  {selectedSymbol}
                </div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  Keep this symbol as the main thread while you move through setup, review, execution, and reflection.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <TradeVerdictBadgeWithScore symbol={selectedSymbol} showScore={false} />
                <button type="button" onClick={() => navigate(`/research?tab=ticker&view=research&symbol=${selectedSymbol}`)} style={{ ...monoStyle, fontSize: 12, fontWeight: 700, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border-dim)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}>
                  BACK TO RESEARCH
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {visibleStages.map((stage) => {
            const isActive = stage === activeStage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => {
                  const fallbackTab = STAGE_CONFIG[stage].tabs.find((stageTab) => visibleTabs.includes(stageTab));
                  if (fallbackTab) setTab(fallbackTab);
                }}
                style={{
                  ...monoStyle,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: `1px solid ${isActive ? "var(--signal-core)" : "var(--border-dim)"}`,
                  background: isActive ? "rgba(5, 173, 152, 0.12)" : "transparent",
                  color: isActive ? "var(--signal-core)" : "var(--text-secondary)",
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                {STAGE_CONFIG[stage].label}
              </button>
            );
          })}
        </div>

        <div style={{
          padding: 14,
          borderRadius: 8,
          border: "1px solid var(--border-dim)",
          background: "var(--bg-panel-raised)",
        }}>
          <div style={{ ...monoStyle, fontSize: 11, color: "var(--signal-core)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>
            CURRENT STAGE
          </div>
          <div style={{ ...monoStyle, fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            {STAGE_CONFIG[activeStage].label}
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)" }}>
            {STAGE_CONFIG[activeStage].blurb}
          </div>
        </div>

        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border-dim)" }}>
          {visibleStageTabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...monoStyle,
                fontSize: 14,
                padding: "8px 20px",
                border: "none",
                borderBottom: activeTab === t ? "2px solid var(--signal-core)" : "2px solid transparent",
                background: "none",
                color: activeTab === t ? "var(--signal-core)" : "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: activeTab === t ? 600 : 400,
                textTransform: "uppercase",
              }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <WorkflowHandoffCard
          eyebrow="Next Step"
          title={activeStage === "setup"
            ? "Move into review before you commit."
            : activeStage === "review"
              ? "If the setup survives review, execute with discipline."
              : activeStage === "execute"
                ? "After execution, close the loop."
                : "Use reflection to improve the next decision."}
          body={activeStage === "setup"
            ? "Importing and positions are just the starting point. Pressure-test the ticker with strategy review, flow, or order analysis before any live order."
            : activeStage === "review"
              ? "A clean review should hand you either a better order plan or a clear reason to skip the trade."
              : activeStage === "execute"
                ? "Execution is not the end of the process. Journal the trade and compare the result to the original setup."
                : "Reflection should feed the next watchlist, next lesson, or next setup review instead of sitting in isolation."}
          actions={[
            {
              label: activeStage === "setup"
                ? "Open Signals"
                : activeStage === "review"
                  ? "Open Orders"
                  : activeStage === "execute"
                    ? "Open Journal"
                    : "Open Progress",
              onClick: () => {
                if (activeStage === "setup") navigate("/signals");
                else if (activeStage === "review") setTab("orders");
                else if (activeStage === "execute") setTab("journal");
                else navigate("/progress");
              },
            },
            {
              label: "Open Research",
              onClick: () => navigate("/research"),
              tone: "secondary",
            },
          ]}
        />
      </div>

      {/* Tab content */}
      {(brokerReady || BROKER_TABS.includes(activeTab)) && isAnyLoading && (
        <div style={{ textAlign: "center", padding: 32, color: "var(--text-secondary)" }}>Loading...</div>
      )}

      {!brokerReady && hasConnections && BROKER_TABS.includes(activeTab) && !isAnyLoading && (
        <div style={{ ...panelStyle, textAlign: "center", padding: 28 }}>
          <div style={{ ...headerStyle, marginBottom: 10 }}>Live Broker Sync Required</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, maxWidth: 720, margin: "0 auto 12px" }}>
            This section pulls live balances, positions, and orders from your connected broker only when you open a broker workflow. That keeps the Trading menu fast, but it means you need to sync before viewing live account data.
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                brokerSyncAttemptedRef.current = true;
                void reconnectAll();
              }}
              style={{
                ...monoStyle,
                fontSize: 13,
                padding: "6px 12px",
                border: "1px solid var(--signal-core)",
                borderRadius: 4,
                background: "none",
                color: "var(--signal-core)",
                cursor: "pointer",
              }}
            >
              SYNC BROKER NOW
            </button>
            <button
              onClick={() => navigate("/learn")}
              style={{
                ...monoStyle,
                fontSize: 13,
                padding: "6px 12px",
                border: "1px solid var(--border-dim)",
                borderRadius: 4,
                background: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              REVIEW ACADEMY FIRST
            </button>
          </div>
        </div>
      )}

      {brokerReady && activeTab === "portfolio" && (
        <>
          <div style={{ marginBottom: 16 }}>
            <Suspense fallback={tabLoader}>
              <PortfolioRiskWidget />
            </Suspense>
          </div>
          <PositionsTable positions={positions} onViewStrategies={() => setTab("strategies")} />
        </>
      )}
      {brokerReady && activeTab === "orders" && <OrdersPanel orders={orders} onCancel={handleCancelOrder} onPlace={handlePlaceOrder} />}
      {brokerReady && activeTab === "flow" && (
        <Suspense fallback={tabLoader}>
          <FlowAnalysisPanel />
        </Suspense>
      )}
      {brokerReady && activeTab === "journal" && <JournalPanel />}
      {activeTab === "strategies" && (
        <Suspense fallback={tabLoader}>
          <StrategiesPanel
            positions={positions}
            orders={orders}
            onSimulate={(symbol, price, legs) => {
              // Navigate to Simulator tab on Signals page with pre-filled legs
              navigate("/signals?tab=simulator", { state: { initialLegs: legs, initialPrice: price, initialTicker: symbol } });
            }}
            onExecute={handleOpenExecutionModal}
          />
        </Suspense>
      )}

      {activeTab === "import" && (
        <Suspense fallback={<div style={{ textAlign: "center", padding: 32, color: "var(--text-secondary)" }}>Loading...</div>}>
          <CsvUploadPanel />
          <ManualPortfolioTable />
          {!brokerReady && (
            <div style={{ ...panelStyle, textAlign: "center", padding: 24, marginTop: 8 }}>
              <span style={{ ...monoStyle, fontSize: 13, color: "var(--text-muted)" }}>
                Want live portfolio sync? <a href="/settings" style={{ color: "var(--signal-core)", textDecoration: "none" }}>
                  {connections.length > 0 ? "Add Another Broker" : "Connect a Broker"} in Settings →
                </a>
              </span>
            </div>
          )}
        </Suspense>
      )}

      {/* Execution Modal */}
      {executionModal && (
        <Suspense fallback={null}>
          <OrderReviewModal
            symbol={executionModal.symbol}
            currentPrice={executionModal.price}
            suggestion={executionModal.suggestion}
            onClose={handleCloseExecutionModal}
            onComplete={handleExecutionComplete}
            onViewOrders={handleViewOrdersAfterExecution}
          />
        </Suspense>
      )}
    </div>
    </TerminalShell>
  );
}


function AccountSummary({ accounts, connections }: {
  accounts: import("../lib/brokers/types").BrokerAccount[];
  connections: import("../stores/brokerStore").BrokerConnection[];
}) {
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  // Combined totals
  const totals = accounts.reduce(
    (acc, a) => ({
      equity: acc.equity + a.equity,
      buyingPower: acc.buyingPower + a.buyingPower,
      cash: acc.cash + a.cash,
      portfolioValue: acc.portfolioValue + a.portfolioValue,
    }),
    { equity: 0, buyingPower: 0, cash: 0, portfolioValue: 0 },
  );

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: accounts.length > 1 ? 8 : 0 }}>
        {[
          { label: accounts.length > 1 ? "COMBINED EQUITY" : "EQUITY", value: fmt(totals.equity) },
          { label: "BUYING POWER", value: fmt(totals.buyingPower) },
          { label: "CASH", value: fmt(totals.cash) },
          { label: "PORTFOLIO VALUE", value: fmt(totals.portfolioValue) },
        ].map((m) => (
          <div key={m.label} style={panelStyle}>
            <div style={headerStyle}>{m.label}</div>
            <div style={{ ...monoStyle, fontSize: 20, fontWeight: 700 }}>{m.value}</div>
          </div>
        ))}
      </div>
      {accounts.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {accounts.map((a) => {
            const conn = connections.find((c) => c.id === a.brokerId);
            return (
              <div
                key={a.brokerId ?? a.id}
                style={{
                  ...monoStyle,
                  fontSize: 12,
                  padding: "6px 12px",
                  background: "var(--bg-panel-raised, #f8fafc)",
                  border: "1px solid var(--border-dim)",
                  borderRadius: 4,
                  color: "var(--text-secondary)",
                }}
              >
                {conn?.displayName ?? a.broker}: {fmt(a.equity)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PositionsTable({ positions, onViewStrategies }: { positions: import("../lib/brokers/types").BrokerPosition[]; onViewStrategies?: () => void }) {
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

  if (!positions.length) {
    return <div style={{ ...panelStyle, textAlign: "center", color: "var(--text-secondary)", padding: 32 }}>No open positions</div>;
  }

  const showBrokerCol = positions.some((p) => p.brokerName);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", ...monoStyle, fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
            {[...(showBrokerCol ? ["Broker"] : []), "Symbol", "Side", "Qty", "Avg Entry", "Current", "Mkt Value", "P&L", "P&L %"].map((h) => (
              <th key={h} style={{ ...headerStyle, padding: "8px 12px", textAlign: "right", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map((p, i) => (
            <tr key={`${p.brokerId}-${p.symbol}-${i}`} style={{ borderBottom: "1px solid var(--border-dim)" }}>
              {showBrokerCol && (
                <td style={{ padding: "8px 12px", textAlign: "right" }}>
                  <span style={{
                    fontSize: 11,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "var(--bg-panel-raised, #f1f5f9)",
                    color: "var(--text-muted, #94a3b8)",
                    whiteSpace: "nowrap",
                  }}>
                    {p.brokerName}
                  </span>
                </td>
              )}
              <td style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                  <span>{p.symbol}</span>
                  <TradeVerdictBadgeWithScore symbol={p.symbol} />
                </div>
              </td>
              <td style={{ padding: "8px 12px", textAlign: "right", color: p.side === "long" ? "var(--signal-core)" : "var(--fault, #E85D6C)" }}>{p.side.toUpperCase()}</td>
              <td style={{ padding: "8px 12px", textAlign: "right" }}>{p.qty}</td>
              <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmt(p.avgEntryPrice)}</td>
              <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmt(p.currentPrice)}</td>
              <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmt(p.marketValue)}</td>
              <td style={{ padding: "8px 12px", textAlign: "right", color: p.unrealizedPL >= 0 ? "var(--signal-core)" : "var(--fault)" }}>{fmt(p.unrealizedPL)}</td>
              <td style={{ padding: "8px 12px", textAlign: "right", color: p.unrealizedPLPercent >= 0 ? "var(--signal-core)" : "var(--fault)" }}>{pct(p.unrealizedPLPercent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {positions.length > 0 && onViewStrategies && (
        <div style={{ textAlign: "center", padding: "12px 0", ...monoStyle, fontSize: 12 }}>
          <span style={{ color: "var(--text-muted)" }}>
            {positions.length} positions analyzed.{" "}
          </span>
          <button
            onClick={onViewStrategies}
            style={{
              color: "var(--signal-core)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              ...monoStyle,
              fontSize: 12,
            }}
          >
            View strategy suggestions →
          </button>
        </div>
      )}
    </div>
  );
}

function OrdersPanel({ orders, onCancel, onPlace }: {
  orders: import("../lib/brokers/types").BrokerOrder[];
  onCancel: (id: string) => Promise<void>;
  onPlace: (order: OrderRequest) => Promise<import("../lib/brokers/types").BrokerOrder>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<OrderRequest["type"]>("market");
  const [qty, setQty] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [tif, setTif] = useState<OrderRequest["timeInForce"]>("day");
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState("");

  const handlePlace = async () => {
    if (!symbol || !qty) return;
    setPlacing(true);
    setOrderError("");
    try {
      await onPlace({
        symbol: symbol.toUpperCase(),
        side,
        type: orderType,
        qty: parseInt(qty),
        limitPrice: limitPrice ? parseFloat(limitPrice) : undefined,
        timeInForce: tif,
      });
      setSymbol("");
      setQty("");
      setLimitPrice("");
      setShowForm(false);
    } catch (e) {
      setOrderError(e instanceof Error ? e.message : "Order failed");
    }
    setPlacing(false);
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const inputStyle: React.CSSProperties = { ...monoStyle, fontSize: 14, padding: "6px 10px", border: "1px solid var(--border-dim)", borderRadius: 4, background: "var(--bg-panel-raised, #f8fafc)", width: "100%" };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
  const showBrokerCol = orders.some((o) => o.brokerName);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={headerStyle}>Recent Orders</span>
        <button onClick={() => setShowForm(!showForm)} style={{ ...monoStyle, fontSize: 13, padding: "4px 14px", background: "var(--signal-core)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
          {showForm ? "CANCEL" : "NEW ORDER"}
        </button>
      </div>

      {showForm && (
        <div style={{ ...panelStyle, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
          <div><label style={{ ...headerStyle, fontSize: 12 }}>Symbol</label><input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="AAPL" style={inputStyle} /></div>
          <div><label style={{ ...headerStyle, fontSize: 12 }}>Side</label><select value={side} onChange={(e) => setSide(e.target.value as "buy" | "sell")} style={selectStyle}><option value="buy">BUY</option><option value="sell">SELL</option></select></div>
          <div><label style={{ ...headerStyle, fontSize: 12 }}>Type</label><select value={orderType} onChange={(e) => setOrderType(e.target.value as OrderRequest["type"])} style={selectStyle}><option value="market">Market</option><option value="limit">Limit</option><option value="stop">Stop</option></select></div>
          <div><label style={{ ...headerStyle, fontSize: 12 }}>Qty</label><input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="100" type="number" style={inputStyle} /></div>
          {orderType !== "market" && (
            <div><label style={{ ...headerStyle, fontSize: 12 }}>Price</label><input value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} placeholder="150.00" type="number" step="0.01" style={inputStyle} /></div>
          )}
          <div><label style={{ ...headerStyle, fontSize: 12 }}>TIF</label><select value={tif} onChange={(e) => setTif(e.target.value as OrderRequest["timeInForce"])} style={selectStyle}><option value="day">DAY</option><option value="gtc">GTC</option></select></div>
          <button onClick={handlePlace} disabled={placing} style={{ ...monoStyle, fontSize: 13, padding: "6px 20px", background: side === "buy" ? "var(--signal-core)" : "var(--fault)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", height: 32 }}>
            {placing ? "..." : "SUBMIT"}
          </button>
          {orderError && <div style={{ gridColumn: "1/-1", color: "var(--fault)", fontSize: 13 }}>{orderError}</div>}
        </div>
      )}

      {!orders.length ? (
        <div style={{ ...panelStyle, textAlign: "center", color: "var(--text-secondary)", padding: 32 }}>No orders</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", ...monoStyle, fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
              {[...(showBrokerCol ? ["Broker"] : []), "Symbol", "Side", "Type", "Qty", "Price", "Status", "Filled", ""].map((h) => (
                <th key={h} style={{ ...headerStyle, padding: "8px 12px", textAlign: "right" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 20).map((o) => (
              <tr key={`${o.brokerId}-${o.id}`} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                {showBrokerCol && (
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>
                    <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--bg-panel-raised, #f1f5f9)", color: "var(--text-muted)" }}>
                      {o.brokerName}
                    </span>
                  </td>
                )}
                <td style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right" }}>{o.symbol}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", color: o.side === "buy" ? "var(--signal-core)" : "var(--fault)" }}>{o.side.toUpperCase()}</td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>{o.type}</td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>{o.qty}</td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>{o.limitPrice ? fmt(o.limitPrice) : "MKT"}</td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, background: o.status === "filled" ? "#dcfce7" : o.status === "rejected" ? "#fef2f2" : "#f1f5f9", color: o.status === "filled" ? "#16a34a" : o.status === "rejected" ? "#dc2626" : "#64748b" }}>
                    {o.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>{o.filledQty ?? 0}/{o.qty}</td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>
                  {o.status === "pending" && (
                    <button onClick={() => onCancel(o.id)} style={{ ...monoStyle, fontSize: 12, padding: "2px 8px", border: "1px solid var(--fault)", color: "var(--fault)", borderRadius: 4, background: "none", cursor: "pointer" }}>CANCEL</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function JournalPanel() {
  const { entries, stats, closeTrade, deleteTrade, updateTrade } = useTradeJournal();
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [exitPriceInput, setExitPriceInput] = useState("");
  const [executionQuality, setExecutionQuality] = useState<"A" | "B" | "C">("B");
  const [thesisOutcome, setThesisOutcome] = useState<"worked" | "mixed" | "failed">("mixed");
  const [nextAction, setNextAction] = useState("Keep on watchlist");
  const [reviewNotes, setReviewNotes] = useState("");

  const startReview = (entry: import("../lib/strategy/types").TradeJournalEntry) => {
    setReviewingId(entry.id);
    setExitPriceInput(entry.exit?.price?.toString() ?? "");
    setExecutionQuality(entry.review?.executionQuality ?? "B");
    setThesisOutcome(entry.review?.thesisOutcome ?? "mixed");
    setNextAction(entry.review?.nextAction ?? "Keep on watchlist");
    setReviewNotes(entry.review?.notes ?? "");
  };

  const saveReview = () => {
    if (!reviewingId) return;
    const trimmedExit = exitPriceInput.trim();
    if (trimmedExit) {
      const parsed = Number(trimmedExit);
      if (Number.isFinite(parsed) && parsed > 0) {
        closeTrade(reviewingId, parsed);
      }
    }
    updateTrade(reviewingId, {
      review: {
        executionQuality,
        thesisOutcome,
        nextAction,
        notes: reviewNotes.trim(),
        reviewedAt: new Date().toISOString(),
      },
    });
    setReviewingId(null);
    setExitPriceInput("");
    setReviewNotes("");
  };

  const activeReviewEntry = reviewingId ? entries.find((entry) => entry.id === reviewingId) ?? null : null;

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { label: "TOTAL TRADES", value: String(stats.totalTrades) },
          { label: "WIN RATE", value: `${stats.winRate.toFixed(0)}%`, color: stats.winRate >= 50 ? "var(--signal-core)" : "var(--fault)" },
          { label: "AVG P&L", value: fmt(stats.avgPnl), color: stats.avgPnl >= 0 ? "var(--signal-core)" : "var(--fault)" },
          { label: "TOTAL P&L", value: fmt(stats.totalPnl), color: stats.totalPnl >= 0 ? "var(--signal-core)" : "var(--fault)" },
        ].map((m) => (
          <div key={m.label} style={panelStyle}>
            <div style={headerStyle}>{m.label}</div>
            <div style={{ ...monoStyle, fontSize: 18, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...panelStyle, marginBottom: 16 }}>
        <div style={headerStyle}>Post-Trade Review</div>
        {activeReviewEntry ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Close the loop on <strong style={{ color: "var(--text-primary)" }}>{activeReviewEntry.ticker}</strong>. Record how the trade actually played out so the next setup benefits from it.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <label style={reviewFieldStyle}>
                <span style={reviewLabelStyle}>Exit Price</span>
                <input value={exitPriceInput} onChange={(e) => setExitPriceInput(e.target.value)} placeholder="Optional if already closed" style={reviewInputStyle} />
              </label>
              <label style={reviewFieldStyle}>
                <span style={reviewLabelStyle}>Execution</span>
                <select value={executionQuality} onChange={(e) => setExecutionQuality(e.target.value as "A" | "B" | "C")} style={reviewInputStyle}>
                  <option value="A">A - matched the plan</option>
                  <option value="B">B - acceptable</option>
                  <option value="C">C - sloppy</option>
                </select>
              </label>
              <label style={reviewFieldStyle}>
                <span style={reviewLabelStyle}>Thesis Outcome</span>
                <select value={thesisOutcome} onChange={(e) => setThesisOutcome(e.target.value as "worked" | "mixed" | "failed")} style={reviewInputStyle}>
                  <option value="worked">Worked</option>
                  <option value="mixed">Mixed</option>
                  <option value="failed">Failed</option>
                </select>
              </label>
              <label style={reviewFieldStyle}>
                <span style={reviewLabelStyle}>Next Action</span>
                <select value={nextAction} onChange={(e) => setNextAction(e.target.value)} style={reviewInputStyle}>
                  <option>Keep on watchlist</option>
                  <option>Trade smaller next time</option>
                  <option>Only simulate next time</option>
                  <option>Retire this setup for now</option>
                </select>
              </label>
            </div>
            <label style={reviewFieldStyle}>
              <span style={reviewLabelStyle}>Review Notes</span>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                placeholder="What confirmed the trade, what invalidated it, and what you would change next time."
                style={{ ...reviewInputStyle, resize: "vertical" }}
              />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={saveReview} style={{ ...monoStyle, fontSize: 12, fontWeight: 700, padding: "8px 12px", border: "1px solid var(--signal-core)", borderRadius: 6, background: "rgba(5, 173, 152, 0.12)", color: "var(--signal-core)", cursor: "pointer" }}>
                SAVE REVIEW
              </button>
              <button onClick={() => setReviewingId(null)} style={{ ...monoStyle, fontSize: 12, fontWeight: 700, padding: "8px 12px", border: "1px solid var(--border-dim)", borderRadius: 6, background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}>
                CANCEL
              </button>
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Pick any open or recently closed trade below to log execution quality, thesis outcome, and the next action. This is meant to be fast enough that you actually do it.
          </div>
        )}
      </div>

      {!entries.length ? (
        <div style={{ ...panelStyle, textAlign: "center", color: "var(--text-secondary)", padding: 32 }}>
          No trades logged yet. Trades will be recorded automatically when you execute through a connected brokerage, or add them manually.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", ...monoStyle, fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
              {["Date", "Ticker", "Strategy", "Dir", "Entry", "Exit", "P&L", "Score", "Status", ""].map((h) => (
                <th key={h} style={{ ...headerStyle, padding: "8px 10px", textAlign: "right" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{new Date(e.date).toLocaleDateString()}</td>
                <td style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>{e.ticker}</td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{e.strategy}</td>
                <td style={{ padding: "8px 10px", textAlign: "right", color: e.direction === "bullish" ? "var(--signal-core)" : "var(--fault)" }}>{e.direction}</td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmt(e.entry.price)}</td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{e.exit ? fmt(e.exit.price) : "---"}</td>
                <td style={{ padding: "8px 10px", textAlign: "right", color: (e.pnl ?? 0) >= 0 ? "var(--signal-core)" : "var(--fault)" }}>
                  {e.pnl != null ? `${fmt(e.pnl)} (${pct(e.pnlPercent ?? 0)})` : "---"}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{e.marketScoreAtEntry}/100</td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, background: e.status === "open" ? "#dbeafe" : e.status === "closed" ? "#dcfce7" : "#f1f5f9", color: e.status === "open" ? "#2563eb" : e.status === "closed" ? "#16a34a" : "#64748b" }}>
                    {e.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right", display: "flex", gap: 4 }}>
                  <button onClick={() => startReview(e)} style={{ ...monoStyle, fontSize: 12, padding: "2px 8px", border: "1px solid var(--signal-core)", color: "var(--signal-core)", borderRadius: 4, background: "none", cursor: "pointer" }}>
                    {e.status === "open" ? "REVIEW" : "EDIT"}
                  </button>
                  <button onClick={() => deleteTrade(e.id)} style={{ ...monoStyle, fontSize: 12, padding: "2px 8px", border: "1px solid var(--fault)", color: "var(--fault)", borderRadius: 4, background: "none", cursor: "pointer" }}>DEL</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const reviewFieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const reviewLabelStyle: React.CSSProperties = {
  ...monoStyle,
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-muted)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const reviewInputStyle: React.CSSProperties = {
  ...monoStyle,
  fontSize: 13,
  padding: "8px 10px",
  border: "1px solid var(--border-dim)",
  borderRadius: 6,
  background: "var(--bg-panel-raised, #f8fafc)",
  color: "var(--text-primary)",
};

function StrategiesPanel({ positions, orders, onSimulate, onExecute }: {
  positions: import("../lib/brokers/types").BrokerPosition[];
  orders: import("../lib/brokers/types").BrokerOrder[];
  onSimulate: (symbol: string, price: number, legs: SimulatorLeg[]) => void;
  onExecute?: (symbol: string, price: number, suggestion: StrategySuggestion) => void;
}) {
  const connections = useBrokerStore((s) => s.connections);
  const canExecute = connections.length > 0;
  const [stratTab, setStratTab] = useState<"analysis" | "suggester" | "covered" | "csp" | "washsale">("analysis");
  const ccEligible = positions.filter((p) => p.side === "long" && p.qty >= 100 && p.assetType === "stock");
  const washSaleViolations = useMemo(() => detectWashSales(orders), [orders]);

  const stratTabs: { key: typeof stratTab; label: string; badge?: string }[] = [
    { key: "analysis", label: "STRATEGY ANALYSIS" },
    { key: "suggester", label: "STRATEGY SUGGESTER" },
    { key: "covered", label: "COVERED CALLS", badge: ccEligible.length ? `${ccEligible.length}` : undefined },
    { key: "csp", label: "CASH-SECURED PUTS" },
    { key: "washsale", label: "WASH SALE", badge: washSaleViolations.length ? `${washSaleViolations.length}` : undefined },
  ];

  return (
    <div>
      {/* Sub-tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border-dim)", marginBottom: 16 }}>
        {stratTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setStratTab(t.key)}
            style={{
              ...monoStyle,
              fontSize: 12,
              fontWeight: stratTab === t.key ? 700 : 400,
              padding: "10px 16px",
              background: "none",
              border: "none",
              borderBottom: stratTab === t.key ? "2px solid var(--signal-core)" : "2px solid transparent",
              color: stratTab === t.key ? "var(--text-primary)" : "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {t.label}
            {t.badge && (
              <span style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 8,
                background: t.key === "washsale" ? "var(--negative, #ef4444)" : "var(--signal-core, #05AD98)",
                color: "#fff",
                fontWeight: 600,
              }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {stratTab === "analysis" && (
        <StrategyAnalysisPanel onSimulate={onSimulate} onExecute={onExecute} />
      )}

      {stratTab === "suggester" && (
        <StrategySuggester
          context={{ positions: positions.map((p) => ({ symbol: p.symbol, qty: p.qty, side: p.side, currentPrice: p.currentPrice, unrealizedPL: p.unrealizedPL })) }}
          onSimulate={onSimulate}
          onExecute={onExecute}
          canExecute={canExecute}
        />
      )}

      {stratTab === "covered" && (
        <div style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={headerStyle}>Covered Call Opportunities</span>
            <span style={{ ...monoStyle, fontSize: 12, color: "var(--text-secondary)" }}>{ccEligible.length} eligible positions (100+ shares)</span>
          </div>
          {!ccEligible.length ? (
            <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 24, fontSize: 13 }}>
              No positions with 100+ shares. Buy stock first to sell covered calls.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", ...monoStyle, fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  {["Symbol", "Shares", "Current", "Suggested Strike", "Est. Premium", "Yield", "DTE"].map((h) => (
                    <th key={h} style={{ ...headerStyle, padding: "8px 10px", textAlign: "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ccEligible.map((p, i) => {
                  const strike = Math.ceil(p.currentPrice * 1.05);
                  const estPremium = p.currentPrice * 0.015;
                  const contracts = Math.floor(p.qty / 100);
                  return (
                    <tr key={`${p.brokerId}-${p.symbol}-${i}`} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>{p.symbol}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{p.qty} ({contracts}x)</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>${p.currentPrice.toFixed(2)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>${strike}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--signal-core)" }}>${(estPremium * contracts * 100).toFixed(0)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{((estPremium / p.currentPrice) * 100).toFixed(1)}%</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>30</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {stratTab === "csp" && (
        <div style={panelStyle}>
          <div style={headerStyle}>Cash-Secured Put Opportunities</div>
          <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 24, fontSize: 13 }}>
            CSP recommendations appear here based on your watchlist, insider signals, and available buying power. Connect a brokerage and add tickers to your watchlist to get started.
          </div>
        </div>
      )}

      {stratTab === "washsale" && (
        <WashSalePanel violations={washSaleViolations} />
      )}
    </div>
  );
}
