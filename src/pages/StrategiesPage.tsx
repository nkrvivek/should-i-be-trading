import { useState, useMemo, useCallback } from "react";
import { Panel } from "../components/layout/Panel";
import { SimulatorPanel } from "../components/strategy/SimulatorPanel";
import {
  STRATEGY_CATALOG,
  type StrategyTemplate,
  type AssetClass,
  type MarketOutlook,
} from "../lib/strategy/catalog";
import type { SimulatorLeg } from "../lib/strategy/payoff";
import type { StrategySuggestion } from "../lib/portfolio/strategyAnalyzer";
import { useMarketScore } from "../hooks/useMarketScore";
import { useRiskPrefsStore } from "../stores/riskPrefsStore";
import { filterCatalog } from "../lib/portfolio/riskFilter";

type Tab = "library" | "simulator";
type AssetFilter = AssetClass | "all";
type OutlookFilter = MarketOutlook | "all";

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: "6px 14px",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: active ? 600 : 400,
  color: active ? "var(--accent-bg)" : "var(--text-muted)",
  background: "none",
  border: "none",
  borderBottom: `2px solid ${active ? "var(--accent-bg)" : "transparent"}`,
  cursor: "pointer",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
});

const chipStyle = (active: boolean, color?: string): React.CSSProperties => ({
  padding: "3px 10px",
  borderRadius: 999,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 500,
  color: active ? "var(--bg-panel)" : color ?? "var(--text-secondary)",
  background: active ? color ?? "var(--signal-core)" : "transparent",
  border: `1px solid ${color ?? "var(--signal-core)"}`,
  cursor: "pointer",
  opacity: active ? 1 : 0.7,
});

const ASSET_FILTERS: { value: AssetFilter; label: string }[] = [
  { value: "all", label: "ALL" },
  { value: "options", label: "OPTIONS" },
  { value: "stocks", label: "STOCKS" },
  { value: "etfs", label: "ETFs" },
  { value: "volatility", label: "VOLATILITY" },
];

const OUTLOOK_FILTERS: { value: OutlookFilter; label: string; color: string }[] = [
  { value: "all", label: "ALL", color: "var(--text-secondary)" },
  { value: "bullish", label: "BULLISH", color: "var(--signal-core)" },
  { value: "bearish", label: "BEARISH", color: "var(--negative)" },
  { value: "neutral", label: "NEUTRAL", color: "var(--warning)" },
  { value: "any", label: "ANY DIR", color: "var(--info)" },
];

const COMPLEXITY_COLORS: Record<string, string> = {
  beginner: "var(--signal-core)",
  intermediate: "var(--warning)",
  advanced: "var(--negative)",
};

interface Props {
  onExecute?: (symbol: string, price: number, suggestion: StrategySuggestion) => void;
  canExecute?: boolean;
  initialSimLegs?: SimulatorLeg[];
  initialSimPrice?: number;
  initialSimTicker?: string;
}

export default function StrategiesPage({ onExecute, canExecute, initialSimLegs, initialSimPrice, initialSimTicker }: Props = {}) {
  // If initial legs provided (e.g., from Trading > Simulate), start on simulator tab
  const [tab, setTab] = useState<Tab>(initialSimLegs ? "simulator" : "library");
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("all");
  const [outlookFilter, setOutlookFilter] = useState<OutlookFilter>("all");

  // Simulator state — set when user clicks "Simulate" from library or navigates with pre-filled legs
  const [simLegs, setSimLegs] = useState<SimulatorLeg[] | undefined>(initialSimLegs);
  const [simPrice, setSimPrice] = useState(initialSimPrice ?? 500);
  const [simTicker, setSimTicker] = useState(initialSimTicker ?? "SPY");

  const { score: marketScore } = useMarketScore();
  const riskTolerance = useRiskPrefsStore((s) => s.riskTolerance);
  const maxLossPercent = useRiskPrefsStore((s) => s.maxLossPercent);
  const targetProfitPercent = useRiskPrefsStore((s) => s.targetProfitPercent);
  const riskPrefs = useMemo(
    () => ({ riskTolerance, maxLossPercent, targetProfitPercent }),
    [riskTolerance, maxLossPercent, targetProfitPercent],
  );
  const currentSignal = marketScore?.signal ?? "CAUTION";
  const currentVix = marketScore?.categories?.find(
    (c: { name: string; score: number }) => c.name.toLowerCase().includes("volatil"),
  );

  // Filter and sort strategies
  const strategies = useMemo(() => {
    let list = [...STRATEGY_CATALOG];

    if (assetFilter !== "all") list = list.filter((s) => s.assetClass === assetFilter);
    if (outlookFilter !== "all") list = list.filter((s) => s.outlook === outlookFilter);

    list = filterCatalog(list, riskPrefs);

    // Sort: matching regime first
    list.sort((a, b) => {
      const aMatch = a.regimeSignals.includes(currentSignal) ? 0 : 1;
      const bMatch = b.regimeSignals.includes(currentSignal) ? 0 : 1;
      return aMatch - bMatch;
    });

    return list;
  }, [assetFilter, outlookFilter, currentSignal, riskPrefs]);

  const handleSimulate = useCallback(
    (template: StrategyTemplate) => {
      const price = simPrice > 0 ? simPrice : 500;
      const legs: SimulatorLeg[] = template.legs.map((tl) => {
        const strike =
          tl.type === "stock"
            ? price
            : Math.round(price * (1 + tl.strikeOffset));
        const premium = tl.type === "stock" ? 0 : Math.round(price * tl.premiumEstimatePct * 100) / 100;
        return {
          action: tl.action,
          type: tl.type,
          qty: tl.qty,
          strike,
          premium,
        };
      });
      setSimLegs(legs);
      setSimTicker(simTicker || "SPY");
      setTab("simulator");
    },
    [simPrice, simTicker],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <Panel title="Strategy Simulator">
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Browse trading strategies and visualize their payoff profiles. Strategies
          matching the current market regime are highlighted.
        </div>
      </Panel>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--border-dim)",
        }}
      >
        <button style={tabStyle(tab === "library")} onClick={() => setTab("library")}>
          Library
        </button>
        <button style={tabStyle(tab === "simulator")} onClick={() => setTab("simulator")}>
          Simulator
        </button>
      </div>

      {/* Library Tab */}
      {tab === "library" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Regime banner */}
          <div
            style={{
              padding: "8px 12px",
              background: "var(--bg-panel-raised)",
              borderRadius: 6,
              border: "1px solid var(--border-dim)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>CURRENT REGIME</span>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                fontWeight: 600,
                fontSize: 11,
                color:
                  currentSignal === "YES"
                    ? "var(--signal-core)"
                    : currentSignal === "CAUTION"
                      ? "var(--warning)"
                      : "var(--negative)",
                border: `1px solid ${currentSignal === "YES" ? "var(--signal-core)" : currentSignal === "CAUTION" ? "var(--warning)" : "var(--negative)"}`,
              }}
            >
              {currentSignal === "YES" ? "TRADE" : currentSignal}
            </span>
            {currentVix && (
              <span style={{ color: "var(--text-muted)" }}>
                VIX Score: {currentVix.score}/100
              </span>
            )}
            <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)", fontSize: 11 }}>
              — Highlighted strategies match current conditions
            </span>
            <span
              style={{
                marginLeft: "auto",
                padding: "2px 8px",
                borderRadius: 999,
                fontWeight: 500,
                fontSize: 11,
                color: "var(--text-secondary)",
                border: "1px solid var(--border-dim)",
              }}
            >
              RISK: {riskTolerance.toUpperCase()}
            </span>
          </div>

          {/* Underlying price for simulation defaults */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Simulate with:
            </span>
            <input
              style={{ ...inputCompact, width: 80 }}
              value={simTicker}
              onChange={(e) => setSimTicker(e.target.value.toUpperCase())}
              placeholder="SPY"
            />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)" }}>@</span>
            <input
              style={{ ...inputCompact, width: 90 }}
              type="number"
              value={simPrice || ""}
              onChange={(e) => setSimPrice(Number(e.target.value))}
              placeholder="Price"
              step={1}
            />
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {ASSET_FILTERS.map((f) => (
              <button
                key={f.value}
                style={chipStyle(assetFilter === f.value)}
                onClick={() => setAssetFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
            <span style={{ width: 1, height: 16, background: "var(--border-dim)", margin: "0 4px" }} />
            {OUTLOOK_FILTERS.map((f) => (
              <button
                key={f.value}
                style={chipStyle(outlookFilter === f.value, f.color)}
                onClick={() => setOutlookFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Strategy cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 10,
            }}
          >
            {strategies.map((s) => {
              const matches = s.regimeSignals.includes(currentSignal);
              return (
                <div
                  key={s.id}
                  style={{
                    padding: 12,
                    background: "var(--bg-panel)",
                    border: `1px solid ${matches ? "var(--signal-core)" : "var(--border-dim)"}`,
                    borderRadius: 6,
                    opacity: matches ? 1 : 0.7,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {/* Name + badges */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      {s.name}
                    </span>
                    {matches && (
                      <span
                        style={{
                          padding: "1px 6px",
                          borderRadius: 999,
                          fontSize: 9,
                          fontFamily: "var(--font-mono)",
                          fontWeight: 600,
                          color: "var(--signal-core)",
                          border: "1px solid var(--signal-core)",
                        }}
                      >
                        MATCHES
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <Tag label={s.assetClass.toUpperCase()} color="var(--info)" />
                    <Tag
                      label={s.outlook.toUpperCase()}
                      color={
                        s.outlook === "bullish"
                          ? "var(--signal-core)"
                          : s.outlook === "bearish"
                            ? "var(--negative)"
                            : s.outlook === "neutral"
                              ? "var(--warning)"
                              : "var(--text-muted)"
                      }
                    />
                    <Tag
                      label={s.complexity.toUpperCase()}
                      color={COMPLEXITY_COLORS[s.complexity]}
                    />
                    <Tag label={s.riskProfile.toUpperCase()} color="var(--text-muted)" />
                  </div>

                  {/* Description */}
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      lineHeight: 1.4,
                    }}
                  >
                    {s.description}
                  </div>

                  {/* When to use */}
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      color: "var(--text-muted)",
                      lineHeight: 1.4,
                      fontStyle: "italic",
                    }}
                  >
                    {s.whenToUse}
                  </div>

                  {/* Max profit/loss */}
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                    }}
                  >
                    <span>
                      <span style={{ color: "var(--text-muted)" }}>MAX↑ </span>
                      <span style={{ color: "var(--signal-core)" }}>{s.maxProfitDesc}</span>
                    </span>
                    <span>
                      <span style={{ color: "var(--text-muted)" }}>MAX↓ </span>
                      <span style={{ color: "var(--negative)" }}>{s.maxLossDesc}</span>
                    </span>
                  </div>

                  {/* Simulate button */}
                  <button
                    onClick={() => handleSimulate(s)}
                    style={{
                      marginTop: "auto",
                      padding: "6px 12px",
                      background: "var(--accent-bg)",
                      border: "none",
                      borderRadius: 4,
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--accent-text)",
                      cursor: "pointer",
                      alignSelf: "flex-start",
                    }}
                  >
                    SIMULATE →
                  </button>
                </div>
              );
            })}
          </div>

          {strategies.length === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--text-muted)",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
              }}
            >
              No strategies match the current filters.
            </div>
          )}
        </div>
      )}

      {/* Simulator Tab */}
      {tab === "simulator" && (
        <SimulatorPanel
          key={JSON.stringify(simLegs)}
          initialLegs={simLegs}
          initialPrice={simPrice > 0 ? simPrice : 500}
          initialTicker={simTicker || "SPY"}
          onExecute={onExecute}
          canExecute={canExecute}
        />
      )}
    </div>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        padding: "1px 6px",
        borderRadius: 999,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 500,
        color,
        border: `1px solid ${color}`,
        opacity: 0.8,
      }}
    >
      {label}
    </span>
  );
}

const inputCompact: React.CSSProperties = {
  padding: "4px 8px",
  background: "var(--bg-panel-raised)",
  border: "1px solid var(--border-dim)",
  borderRadius: 4,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--text-primary)",
  outline: "none",
};
