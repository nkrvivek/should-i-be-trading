import type { WashSaleViolation } from "../../lib/strategy/types";

interface Props {
  violations: WashSaleViolation[];
}

const panelStyle: React.CSSProperties = {
  background: "var(--bg-panel)",
  border: "1px solid var(--border-dim)",
  borderRadius: 6,
  marginBottom: 16,
  overflow: "hidden",
};

const headerBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 16px",
  background: "var(--bg-panel-raised)",
  borderBottom: "1px solid var(--border-dim)",
};

const headerTextStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--text-secondary)",
};

const thStyle: React.CSSProperties = {
  padding: "8px 10px",
  textAlign: "right",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 500,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 10px",
  textAlign: "right",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  color: "var(--text-primary)",
  whiteSpace: "nowrap",
};

const footerStyle: React.CSSProperties = {
  padding: "10px 16px",
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  color: "var(--text-muted)",
  borderTop: "1px solid var(--border-dim)",
  lineHeight: 1.5,
};

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "2-digit",
    });
  } catch {
    return d;
  }
}

function formatDollar(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function WashSalePanel({ violations }: Props) {
  return (
    <div style={panelStyle}>
      <div style={headerBarStyle}>
        <span style={headerTextStyle}>Wash Sale Monitor</span>
        {violations.length > 0 && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 999,
              background: "rgba(232, 93, 108, 0.15)",
              color: "var(--negative)",
            }}
          >
            {violations.length} violation{violations.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {violations.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          No wash sale violations detected.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                <th style={{ ...thStyle, textAlign: "left" }}>Symbol</th>
                <th style={thStyle}>Loss Date</th>
                <th style={thStyle}>Loss Amount</th>
                <th style={thStyle}>Repurchase Date</th>
                <th style={thStyle}>Repurchase Price</th>
                <th style={thStyle}>Days Apart</th>
                <th style={thStyle}>Disallowed Loss</th>
                <th style={thStyle}>Adjusted Basis</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((v, i) => (
                <tr
                  key={`${v.symbol}-${v.lossDate}-${i}`}
                  style={{ borderBottom: "1px solid var(--border-dim)" }}
                >
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "left",
                      fontWeight: 600,
                    }}
                  >
                    {v.symbol}
                  </td>
                  <td style={tdStyle}>{formatDate(v.lossDate)}</td>
                  <td style={{ ...tdStyle, color: "var(--negative)" }}>
                    {formatDollar(v.lossAmount)}
                  </td>
                  <td style={tdStyle}>{formatDate(v.repurchaseDate)}</td>
                  <td style={tdStyle}>{formatDollar(v.repurchasePrice)}</td>
                  <td style={tdStyle}>{v.daysApart}d</td>
                  <td style={{ ...tdStyle, color: "var(--negative)" }}>
                    {formatDollar(v.disallowedLoss)}
                  </td>
                  <td style={{ ...tdStyle, color: "var(--warning)" }}>
                    {formatDollar(v.adjustedBasis)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={footerStyle}>
        Wash sale rule: loss disallowed when substantially identical security
        repurchased within 30 days. Consult a tax professional for your specific
        situation.
      </div>
    </div>
  );
}
