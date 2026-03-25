import type { DiscoverCandidate } from "../../api/types";
import { fmtUsd } from "../../lib/format";

type Props = {
  candidates: DiscoverCandidate[];
};

export function OptionsFlowFeed({ candidates }: Props) {
  if (candidates.length === 0) {
    return (
      <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
        No unusual options activity detected
      </div>
    );
  }

  return (
    <div style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
            <Th>Ticker</Th>
            <Th align="right">Score</Th>
            <Th>Bias</Th>
            <Th align="right">Premium</Th>
            <Th align="right">Sweeps</Th>
            <Th>DP Dir</Th>
            <Th align="right">DP Str</Th>
            <Th>Confluence</Th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => (
            <tr key={c.ticker} style={{ borderBottom: "1px solid var(--border-dim)", height: 28 }}>
              <td style={{ padding: "0 8px", fontWeight: 500 }}>{c.ticker}</td>
              <td style={{ padding: "0 8px", textAlign: "right", color: c.score >= 60 ? "var(--positive)" : "var(--text-secondary)" }}>
                {c.score}
              </td>
              <td style={{ padding: "0 8px", color: c.options_bias === "BULLISH" ? "var(--positive)" : c.options_bias === "BEARISH" ? "var(--negative)" : "var(--neutral)" }}>
                {c.options_bias}
              </td>
              <td style={{ padding: "0 8px", textAlign: "right" }}>{fmtUsd(c.total_premium)}</td>
              <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>{c.sweeps}</td>
              <td style={{ padding: "0 8px", color: c.dp_direction === "BULLISH" ? "var(--positive)" : c.dp_direction === "BEARISH" ? "var(--negative)" : "var(--neutral)" }}>
                {c.dp_direction}
              </td>
              <td style={{ padding: "0 8px", textAlign: "right" }}>{(c.dp_strength * 100).toFixed(0)}%</td>
              <td style={{ padding: "0 8px", textAlign: "center" }}>
                {c.confluence && <span style={{ color: "var(--signal-strong)" }}>&#x2713;</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th style={{ padding: "4px 8px", textAlign: align, fontWeight: 500, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {children}
    </th>
  );
}
