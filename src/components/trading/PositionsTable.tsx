import type { BrokerPosition } from "../../lib/brokers/types";
import { TradeVerdictBadgeWithScore } from "./TradeVerdictBadge";

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

export function PositionsTable({ positions, onViewStrategies }: {
  positions: BrokerPosition[];
  onViewStrategies?: () => void;
}) {
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
