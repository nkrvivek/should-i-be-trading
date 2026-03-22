import type { ScannerSignal } from "../../api/types";

type Props = {
  signals: ScannerSignal[];
};

function directionColor(dir: string): string {
  if (dir === "BULLISH" || dir === "ACCUMULATION") return "var(--positive)";
  if (dir === "BEARISH" || dir === "DISTRIBUTION") return "var(--negative)";
  return "var(--neutral)";
}

export function DarkPoolFeed({ signals }: Props) {
  if (signals.length === 0) {
    return (
      <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
        No dark pool signals detected
      </div>
    );
  }

  return (
    <div style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
            <Th>Ticker</Th>
            <Th align="right">Score</Th>
            <Th>Direction</Th>
            <Th align="right">Strength</Th>
            <Th align="right">Prints</Th>
            <Th align="right">Days</Th>
            <Th>Sector</Th>
          </tr>
        </thead>
        <tbody>
          {signals.map((s) => (
            <tr key={s.ticker} style={{ borderBottom: "1px solid var(--border-dim)", height: 28 }}>
              <td style={{ padding: "0 8px", fontWeight: 500 }}>{s.ticker}</td>
              <td style={{ padding: "0 8px", textAlign: "right", color: s.score >= 60 ? "var(--positive)" : "var(--text-secondary)" }}>
                {s.score}
              </td>
              <td style={{ padding: "0 8px", color: directionColor(s.direction) }}>{s.direction}</td>
              <td style={{ padding: "0 8px", textAlign: "right" }}>{(s.strength * 100).toFixed(0)}%</td>
              <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>{s.num_prints}</td>
              <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>{s.sustained_days}</td>
              <td style={{ padding: "0 8px", color: "var(--text-muted)", fontSize: 10 }}>{s.sector}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th style={{ padding: "4px 8px", textAlign: align, fontWeight: 500, fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {children}
    </th>
  );
}
