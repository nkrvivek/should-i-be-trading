import { useManualPortfolioStore } from "../../lib/portfolio/manualPortfolioStore";

const panelStyle: React.CSSProperties = {
  background: "var(--bg-panel, #fff)",
  border: "1px solid var(--border-dim, #e2e8f0)",
  borderRadius: 4,
  padding: 16,
  marginBottom: 16,
};

const monoStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
};

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

export default function ManualPortfolioTable() {
  const { positions, source, importedAt, removePosition, clearAll } = useManualPortfolioStore();

  if (positions.length === 0) {
    return (
      <div style={{ ...panelStyle, textAlign: "center", color: "var(--text-muted, #94a3b8)", padding: 32 }}>
        <div style={{ ...monoStyle, fontSize: 14 }}>No imported positions. Upload a CSV above.</div>
      </div>
    );
  }

  const importDate = importedAt ? new Date(importedAt).toLocaleDateString() : "";

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ ...monoStyle, fontSize: 13, color: "var(--text-secondary, #64748b)" }}>
          Imported from <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{source || "CSV"}</span>
          {" "}&mdash; {positions.length} position{positions.length !== 1 ? "s" : ""}
          {importDate && <> &mdash; {importDate}</>}
        </div>
        <button
          onClick={clearAll}
          style={{
            ...monoStyle,
            fontSize: 12,
            padding: "4px 12px",
            border: "1px solid var(--negative, #dc2626)",
            color: "var(--negative, #dc2626)",
            borderRadius: 4,
            background: "none",
            cursor: "pointer",
          }}
        >
          CLEAR ALL
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", ...monoStyle, fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
              {["Symbol", "Type", "Qty", "Side", "Avg Cost", "Current", "Mkt Value", "P&L", "P&L%", ""].map((h) => (
                <th key={h} style={{
                  padding: "6px 10px",
                  textAlign: h === "Symbol" || h === "Type" || h === "Side" || h === "" ? "left" : "right",
                  fontWeight: 500,
                  fontSize: 11,
                  color: "var(--text-muted, #94a3b8)",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => {
              const plColor = p.unrealizedPL >= 0 ? "var(--positive, #16a34a)" : "var(--negative, #dc2626)";
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border-dim)", height: 32 }}>
                  <td style={{ padding: "4px 10px", fontWeight: 600 }}>{p.symbol}</td>
                  <td style={{ padding: "4px 10px", fontSize: 12, color: "var(--text-secondary)" }}>
                    {p.assetType.toUpperCase()}
                    {p.optionType && ` ${p.optionType.toUpperCase()}`}
                    {p.strike != null && ` $${p.strike}`}
                    {p.expiry && ` ${p.expiry}`}
                  </td>
                  <td style={{ padding: "4px 10px", textAlign: "right" }}>{p.qty}</td>
                  <td style={{ padding: "4px 10px", color: p.side === "long" ? "var(--positive, #16a34a)" : "var(--negative, #dc2626)" }}>
                    {p.side.toUpperCase()}
                  </td>
                  <td style={{ padding: "4px 10px", textAlign: "right" }}>{fmt(p.avgEntryPrice)}</td>
                  <td style={{ padding: "4px 10px", textAlign: "right" }}>{fmt(p.currentPrice)}</td>
                  <td style={{ padding: "4px 10px", textAlign: "right" }}>{fmt(p.marketValue)}</td>
                  <td style={{ padding: "4px 10px", textAlign: "right", color: plColor }}>{fmt(p.unrealizedPL)}</td>
                  <td style={{ padding: "4px 10px", textAlign: "right", color: plColor }}>{pct(p.unrealizedPLPercent)}</td>
                  <td style={{ padding: "4px 10px", textAlign: "center" }}>
                    <button
                      onClick={() => removePosition(p.id)}
                      title="Remove position"
                      style={{
                        ...monoStyle,
                        fontSize: 14,
                        padding: "2px 6px",
                        border: "none",
                        background: "none",
                        color: "var(--text-muted, #94a3b8)",
                        cursor: "pointer",
                        lineHeight: 1,
                      }}
                    >
                      &#10005;
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
