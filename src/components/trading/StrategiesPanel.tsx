import { useMemo, useState, lazy, Suspense } from "react";
import { useBrokerStore } from "../../stores/brokerStore";
import { detectWashSales } from "../../lib/strategy/washSaleDetector";
import type { BrokerPosition, BrokerOrder } from "../../lib/brokers/types";
import type { SimulatorLeg } from "../../lib/strategy/payoff";
import type { StrategySuggestion } from "../../lib/portfolio/strategyAnalyzer";

const StrategySuggester = lazy(() => import("./StrategySuggester"));
const StrategyAnalysisPanel = lazy(() => import("../portfolio/StrategyAnalysisPanel"));
const WashSalePanel = lazy(() => import("../portfolio/WashSalePanel"));

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

const monoStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
};

export function StrategiesPanel({ positions, orders, onSimulate, onExecute }: {
  positions: BrokerPosition[];
  orders: BrokerOrder[];
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
        <Suspense fallback={<div style={{ textAlign: "center", padding: 32, color: "var(--text-secondary)" }}>Loading...</div>}>
          <WashSalePanel violations={washSaleViolations} />
        </Suspense>
      )}
    </div>
  );
}
