import { useState, useMemo, useCallback } from "react";
import type { SimulatorLeg } from "../../lib/strategy/payoff";
import { computePayoffCurve, computeKeyMetrics } from "../../lib/strategy/payoff";
import { computePositionGreeks } from "../../lib/strategy/greeks";
import { PayoffChart } from "./PayoffChart";
import { GreeksPanel } from "./GreeksPanel";
import { OptionsChainLoader } from "./OptionsChainLoader";
import type { StrategySuggestion } from "../../lib/portfolio/strategyAnalyzer";

interface Props {
  initialLegs?: SimulatorLeg[];
  initialPrice?: number;
  initialTicker?: string;
  onExecute?: (symbol: string, price: number, suggestion: StrategySuggestion) => void;
  canExecute?: boolean;
}

const inputStyle: React.CSSProperties = {
  padding: "6px 8px",
  background: "var(--bg-panel-raised)",
  border: "1px solid var(--border-dim)",
  borderRadius: 4,
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  color: "var(--text-primary)",
  outline: "none",
  width: "100%",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "auto" as const,
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  fontWeight: 500,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const btnStyle: React.CSSProperties = {
  padding: "6px 12px",
  background: "var(--accent-bg)",
  border: "none",
  borderRadius: 4,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--accent-text)",
  cursor: "pointer",
};

const defaultLeg = (): SimulatorLeg => ({
  action: "buy",
  type: "call",
  qty: 1,
  strike: 0,
  premium: 0,
});

export function SimulatorPanel({
  initialLegs,
  initialPrice = 500,
  initialTicker = "SPY",
  onExecute,
  canExecute,
}: Props) {
  const [ticker, setTicker] = useState(initialTicker);
  const [currentPrice, setCurrentPrice] = useState(initialPrice);
  const [legs, setLegs] = useState<SimulatorLeg[]>(initialLegs ?? []);
  const [highlightPrice, setHighlightPrice] = useState<number | null>(null);
  const [showChain, setShowChain] = useState(false);
  const [ivByLeg, setIvByLeg] = useState<number[]>([]);
  const [dte, setDte] = useState(30);

  const updateLeg = useCallback(
    (idx: number, field: keyof SimulatorLeg, value: string | number) => {
      setLegs((prev) =>
        prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
      );
    },
    [],
  );

  const addLeg = useCallback(() => {
    const leg = defaultLeg();
    leg.strike = Math.round(currentPrice);
    setLegs((prev) => [...prev, leg]);
  }, [currentPrice]);

  const removeLeg = useCallback((idx: number) => {
    setLegs((prev) => prev.filter((_, i) => i !== idx));
    setIvByLeg((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleChainAddLeg = useCallback((leg: SimulatorLeg, iv: number) => {
    setLegs((prev) => [...prev, leg]);
    setIvByLeg((prev) => [...prev, iv]);
  }, []);

  const handleChainPriceUpdate = useCallback((price: number) => {
    setCurrentPrice(price);
  }, []);


  const curve = useMemo(
    () => computePayoffCurve(legs, currentPrice),
    [legs, currentPrice],
  );
  const metrics = useMemo(
    () => computeKeyMetrics(legs, currentPrice),
    [legs, currentPrice],
  );
  const allStrikes = legs.filter((l) => l.type !== "stock").map((l) => l.strike);

  // Greeks computation
  const positionGreeks = useMemo(() => {
    if (legs.length === 0 || currentPrice <= 0) return null;
    // Use IVs from chain data, or default 0.30 for manually-entered legs
    const ivs = legs.map((_, i) => ivByLeg[i] ?? 0.30);
    return computePositionGreeks(legs, currentPrice, ivs, dte);
  }, [legs, currentPrice, ivByLeg, dte]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Underlying input */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
        <div style={{ flex: "0 0 100px" }}>
          <div style={labelStyle}>Ticker</div>
          <input
            style={inputStyle}
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="SPY"
          />
        </div>
        <div style={{ flex: "0 0 140px" }}>
          <div style={labelStyle}>Current Price ($)</div>
          <input
            style={inputStyle}
            type="number"
            value={currentPrice || ""}
            onChange={(e) => setCurrentPrice(Number(e.target.value))}
            step={1}
            min={1}
          />
        </div>
        <div style={{ flex: "0 0 80px" }}>
          <div style={labelStyle}>DTE</div>
          <input
            style={inputStyle}
            type="number"
            value={dte}
            onChange={(e) => setDte(Math.max(0, Number(e.target.value)))}
            min={0}
            max={730}
          />
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 12 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {ticker || "---"} ${currentPrice > 0 ? currentPrice.toFixed(2) : "---"}
          </span>
          <button
            onClick={() => setShowChain(!showChain)}
            style={{
              padding: "4px 10px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              color: showChain ? "#000" : "var(--info)",
              background: showChain ? "var(--info)" : "transparent",
              border: `1px solid var(--info)`,
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {showChain ? "HIDE CHAIN" : "LIVE CHAIN"}
          </button>
        </div>
      </div>

      {/* Live Options Chain */}
      {showChain && (
        <OptionsChainLoader
          ticker={ticker}
          onPriceUpdate={handleChainPriceUpdate}
          onAddLeg={handleChainAddLeg}
        />
      )}

      {/* Legs editor */}
      <div
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border-dim)",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 12px",
            background: "var(--bg-panel-raised)",
            borderBottom: "1px solid var(--border-dim)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Strategy Legs
          </span>
          <button style={btnStyle} onClick={addLeg}>
            + ADD LEG
          </button>
        </div>

        {legs.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "var(--text-muted)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
            }}
          >
            No legs yet. Click "+ ADD LEG" or select a strategy from the Library.
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                {["Action", "Type", "Qty", "Strike", "Premium", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "6px 8px",
                      textAlign: "left",
                      fontWeight: 500,
                      fontSize: 11,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {legs.map((leg, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: "1px solid var(--border-dim)" }}
                >
                  <td style={{ padding: "4px 8px", width: 90 }}>
                    <select
                      style={selectStyle}
                      value={leg.action}
                      onChange={(e) => updateLeg(i, "action", e.target.value)}
                    >
                      <option value="buy">BUY</option>
                      <option value="sell">SELL</option>
                    </select>
                  </td>
                  <td style={{ padding: "4px 8px", width: 100 }}>
                    <select
                      style={selectStyle}
                      value={leg.type}
                      onChange={(e) => updateLeg(i, "type", e.target.value)}
                    >
                      <option value="call">CALL</option>
                      <option value="put">PUT</option>
                      <option value="stock">STOCK</option>
                    </select>
                  </td>
                  <td style={{ padding: "4px 8px", width: 80 }}>
                    <input
                      style={inputStyle}
                      type="number"
                      value={leg.qty}
                      onChange={(e) => updateLeg(i, "qty", Number(e.target.value))}
                      min={1}
                    />
                  </td>
                  <td style={{ padding: "4px 8px", width: 110 }}>
                    <input
                      style={{
                        ...inputStyle,
                        opacity: leg.type === "stock" ? 0.4 : 1,
                      }}
                      type="number"
                      value={leg.strike}
                      onChange={(e) => updateLeg(i, "strike", Number(e.target.value))}
                      disabled={leg.type === "stock"}
                      step={1}
                    />
                  </td>
                  <td style={{ padding: "4px 8px", width: 100 }}>
                    <input
                      style={{
                        ...inputStyle,
                        opacity: leg.type === "stock" ? 0.4 : 1,
                      }}
                      type="number"
                      value={leg.premium}
                      onChange={(e) => updateLeg(i, "premium", Number(e.target.value))}
                      disabled={leg.type === "stock"}
                      step={0.1}
                    />
                  </td>
                  <td style={{ padding: "4px 8px", width: 40 }}>
                    <button
                      onClick={() => removeLeg(i)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--negative)",
                        cursor: "pointer",
                        fontFamily: "var(--font-mono)",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                      title="Remove leg"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Metrics bar */}
      {legs.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 16,
            padding: "8px 12px",
            background: "var(--bg-panel-raised)",
            borderRadius: 6,
            border: "1px solid var(--border-dim)",
            flexWrap: "wrap",
          }}
        >
          <MetricCell
            label="Max Profit"
            value={`$${formatNum(metrics.maxProfit)}`}
            color="var(--signal-core)"
          />
          <MetricCell
            label="Max Loss"
            value={`$${formatNum(metrics.maxLoss)}`}
            color="var(--negative)"
          />
          <MetricCell
            label="Breakeven"
            value={
              metrics.breakevens.length
                ? metrics.breakevens.map((b) => `$${b.toFixed(1)}`).join(", ")
                : "---"
            }
            color="var(--warning)"
          />
          <MetricCell
            label="Risk/Reward"
            value={`${metrics.riskReward.toFixed(1)}x`}
            color="var(--text-primary)"
          />
          {canExecute && onExecute && legs.length > 0 && (
            <button
              onClick={() => {
                const suggestion: StrategySuggestion = {
                  strategyName: detectStrategyName(legs),
                  riskLevel: "moderate",
                  riskScore: 5,
                  description: `Custom strategy on ${ticker}`,
                  rationale: "User-built strategy from simulator",
                  legs,
                  estimatedMaxProfit: metrics.maxProfit === Infinity ? "Unlimited" : `$${formatNum(metrics.maxProfit)}`,
                  estimatedMaxLoss: metrics.maxLoss === -Infinity ? "Unlimited" : `$${formatNum(metrics.maxLoss)}`,
                  maxLossCoverage: "N/A",
                };
                onExecute(ticker, currentPrice, suggestion);
              }}
              style={{
                background: "var(--signal-core)",
                color: "#fff",
                padding: "6px 16px",
                border: "none",
                borderRadius: 4,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                marginLeft: "auto",
              }}
            >
              EXECUTE
            </button>
          )}
        </div>
      )}

      {/* Greeks Panel */}
      <GreeksPanel greeks={positionGreeks} legs={legs} daysToExpiry={dte} />

      {/* Payoff Chart */}
      <div
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border-dim)",
          borderRadius: 6,
          padding: 8,
        }}
      >
        <PayoffChart
          data={curve}
          currentPrice={currentPrice}
          breakevens={metrics.breakevens}
          maxProfit={metrics.maxProfit}
          maxLoss={metrics.maxLoss}
          highlightPrice={highlightPrice}
          strikes={allStrikes}
        />
      </div>

      {/* Price slider */}
      {legs.length > 0 && currentPrice > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ ...labelStyle, whiteSpace: "nowrap" }}>
            Price at Expiry
          </span>
          <input
            type="range"
            min={currentPrice * 0.7}
            max={currentPrice * 1.3}
            step={currentPrice * 0.002}
            value={highlightPrice ?? currentPrice}
            onChange={(e) => setHighlightPrice(Number(e.target.value))}
            style={{ flex: 1, accentColor: "var(--info)" }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--info)",
              minWidth: 70,
              textAlign: "right",
            }}
          >
            ${(highlightPrice ?? currentPrice).toFixed(1)}
          </span>
        </div>
      )}
    </div>
  );
}

function MetricCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div style={{ minWidth: 100 }}>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : n > 0 ? "+" : "";
  if (abs >= 1000) return sign + (abs / 1000).toFixed(1) + "K";
  return sign + abs.toFixed(0);
}

function detectStrategyName(legs: SimulatorLeg[]): string {
  if (legs.length === 1) {
    const l = legs[0];
    if (l.action === "buy" && l.type === "call") return "Long Call";
    if (l.action === "buy" && l.type === "put") return "Long Put";
    if (l.action === "sell" && l.type === "call") return "Short Call";
    if (l.action === "sell" && l.type === "put") return "Short Put";
  }
  if (legs.length === 2) {
    const hasBC = legs.some((l) => l.action === "buy" && l.type === "call");
    const hasSC = legs.some((l) => l.action === "sell" && l.type === "call");
    const hasBP = legs.some((l) => l.action === "buy" && l.type === "put");
    const hasSP = legs.some((l) => l.action === "sell" && l.type === "put");
    const hasStock = legs.some((l) => l.type === "stock");
    if (hasBC && hasSC) return "Call Spread";
    if (hasBP && hasSP) return "Put Spread";
    if (hasSC && hasStock) return "Covered Call";
  }
  if (legs.length === 4) {
    const hasBP = legs.some((l) => l.action === "buy" && l.type === "put");
    const hasSP = legs.some((l) => l.action === "sell" && l.type === "put");
    const hasBC = legs.some((l) => l.action === "buy" && l.type === "call");
    const hasSC = legs.some((l) => l.action === "sell" && l.type === "call");
    if (hasBP && hasSP && hasBC && hasSC) return "Iron Condor";
  }
  return "Custom Strategy";
}
