import { useEffect, useState, useCallback, useMemo, lazy, Suspense, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TerminalShell } from "../components/layout/TerminalShell";
import { useBrokerStore } from "../stores/brokerStore";
import { useMarketScore } from "../hooks/useMarketScore";
import { useRegimeMonitor } from "../hooks/useRegimeMonitor";
import { TradeVerdictBadgeWithScore } from "../components/trading/TradeVerdictBadge";
import { AccountSummary } from "../components/trading/AccountSummary";
import { PositionsTable } from "../components/trading/PositionsTable";
import { OrdersPanel } from "../components/trading/OrdersPanel";
import { JournalPanel } from "../components/trading/JournalPanel";
import { StrategiesPanel } from "../components/trading/StrategiesPanel";
import type { OrderRequest } from "../lib/brokers/types";
import type { StrategySuggestion } from "../lib/portfolio/strategyAnalyzer";

const CsvUploadPanel = lazy(() => import("../components/portfolio/CsvUploadPanel"));
const ManualPortfolioTable = lazy(() => import("../components/portfolio/ManualPortfolioTable"));
const PortfolioRiskWidget = lazy(() => import("../components/portfolio/PortfolioRiskWidget").then((m) => ({ default: m.PortfolioRiskWidget })));
const FlowAnalysisPanel = lazy(() => import("../components/trading/FlowAnalysisPanel"));
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

const stageActionStripStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  padding: "10px 12px",
  marginBottom: 16,
  borderRadius: 6,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const stripPrimaryButtonStyle: React.CSSProperties = {
  ...monoStyle,
  fontSize: 12,
  fontWeight: 700,
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid var(--signal-core)",
  background: "rgba(5, 173, 152, 0.12)",
  color: "var(--signal-core)",
  cursor: "pointer",
};

const stripSecondaryButtonStyle: React.CSSProperties = {
  ...monoStyle,
  fontSize: 12,
  fontWeight: 700,
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid var(--border-dim)",
  background: "transparent",
  color: "var(--text-secondary)",
  cursor: "pointer",
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

function getPrimaryStageActionLabel(stage: StageId, brokerReady: boolean): string {
  if (stage === "setup") return brokerReady ? "OPEN PORTFOLIO" : "IMPORT HOLDINGS";
  if (stage === "review") return "OPEN STRATEGY REVIEW";
  if (stage === "execute") return "OPEN ORDERS";
  return "OPEN JOURNAL";
}

function getSecondaryStageActionLabel(stage: StageId): string {
  if (stage === "setup") return "OPEN RESEARCH";
  if (stage === "review") return "OPEN BACKTEST";
  if (stage === "execute") return "START REVIEW";
  return "OPEN PROGRESS";
}

function getStageSupportNote(stage: StageId, symbol: string): string {
  if (stage === "setup") return symbol ? `${symbol} is your current focus symbol.` : "Choose one symbol before moving deeper.";
  if (stage === "review") return "Only move forward if the setup still survives review.";
  if (stage === "execute") return "Execution is only a stage, not the finish line.";
  return "The goal is a better next decision, not just a logged trade.";
}

function getStageStripSummary(stage: StageId): string {
  if (stage === "setup") return "Import or inspect positions, then move into validation or review only for names that still matter.";
  if (stage === "review") return "Use strategy analysis and flow to sharpen the trade or reject it quickly.";
  if (stage === "execute") return "Execution should only happen after the setup and review already make sense.";
  return "Use journal and review notes to improve the next trade, not just to archive the last one.";
}

function deriveInitialTab(brokerReady: boolean): TabId {
  if (brokerReady) return "portfolio";
  return "import";
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

  const [tab, setTab] = useState<TabId>(() => deriveInitialTab(brokerReady));
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
    refresh();
  }, [refresh]);

  const handleViewOrdersAfterExecution = useCallback(() => {
    setExecutionModal(null);
    setTab("orders");
  }, [setTab]);

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

  // Derive tab from broker state: if broker disconnects while on a broker tab, fall back to import.
  // Uses useMemo to compute the effective tab without setState-in-effect.
  const activeTab = useMemo<TabId>(() => {
    if (!hasConnections && BROKER_TABS.includes(tab)) {
      return "import";
    }
    return tab;
  }, [hasConnections, tab]);

  const visibleTabs: TabId[] = hasConnections
    ? [...BROKER_TABS, "strategies", "import"]
    : ["import", "strategies"];

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
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button
              type="button"
              onClick={() => {
                if (activeStage === "setup") setTab(brokerReady ? "portfolio" : "import");
                else if (activeStage === "review") setTab("strategies");
                else if (activeStage === "execute") setTab("orders");
                else setTab("journal");
              }}
              style={{
                ...monoStyle,
                fontSize: 12,
                fontWeight: 700,
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--signal-core)",
                background: "rgba(5, 173, 152, 0.12)",
                color: "var(--signal-core)",
                cursor: "pointer",
              }}
            >
              {getPrimaryStageActionLabel(activeStage, brokerReady)}
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeStage === "setup") navigate(selectedSymbol ? `/research?tab=ticker&view=research&symbol=${selectedSymbol}` : "/research");
                else if (activeStage === "review") navigate("/signals?tab=validation&view=backtest");
                else if (activeStage === "execute") setTab("journal");
                else navigate("/progress");
              }}
              style={{
                ...monoStyle,
                fontSize: 12,
                fontWeight: 700,
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--border-dim)",
                background: "transparent",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              {getSecondaryStageActionLabel(activeStage)}
            </button>
            <span style={{ ...monoStyle, fontSize: 11, color: "var(--text-muted)", display: "inline-flex", alignItems: "center" }}>
              {getStageSupportNote(activeStage, selectedSymbol)}
            </span>
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

      <div style={stageActionStripStyle}>
        <div style={{ ...monoStyle, fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em" }}>
          {activeStage.toUpperCase()}
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>
          {getStageStripSummary(activeStage)}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              if (activeStage === "setup") navigate("/signals?tab=validation&view=regime");
              else if (activeStage === "review") setTab("orders");
              else if (activeStage === "execute") setTab("journal");
              else navigate("/progress");
            }}
            style={stripPrimaryButtonStyle}
          >
            {activeStage === "setup" ? "OPEN SIGNALS" : activeStage === "review" ? "OPEN ORDERS" : activeStage === "execute" ? "OPEN JOURNAL" : "OPEN PROGRESS"}
          </button>
          <button
            type="button"
            onClick={() => navigate(selectedSymbol ? `/research?tab=ticker&view=research&symbol=${selectedSymbol}` : "/research")}
            style={stripSecondaryButtonStyle}
          >
            OPEN RESEARCH
          </button>
        </div>
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
