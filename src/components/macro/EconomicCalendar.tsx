import type { EconomicEvent } from "../../hooks/useEconomicCalendar";

type Props = {
  events: EconomicEvent[];
};

const IMPACT_COLORS: Record<string, string> = {
  high: "var(--negative)",
  medium: "var(--warning)",
  low: "var(--text-muted)",
};

const SOURCE_LABELS: Record<string, string> = {
  fred: "FRED",
  finnhub_earnings: "Earnings",
  finnhub_economic: "Economic",
};

export function EconomicCalendar({ events }: Props) {
  if (events.length === 0) {
    return (
      <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
        Loading economic events...
      </div>
    );
  }

  return (
    <div style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
            <Th>Date</Th>
            <Th>Event</Th>
            <Th>Impact</Th>
            <Th>Source</Th>
            <Th align="right">Estimate</Th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--border-dim)", height: 28 }}>
              <td style={{ padding: "0 8px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {formatDate(e.date)}
              </td>
              <td style={{ padding: "0 8px", fontWeight: 500 }}>{e.event}</td>
              <td style={{ padding: "0 8px" }}>
                <span style={{
                  display: "inline-block",
                  padding: "1px 6px",
                  borderRadius: 999,
                  fontSize: 9,
                  fontWeight: 600,
                  color: IMPACT_COLORS[e.impact] ?? "var(--text-muted)",
                  border: `1px solid ${IMPACT_COLORS[e.impact] ?? "var(--border-dim)"}`,
                }}>
                  {e.impact.toUpperCase()}
                </span>
              </td>
              <td style={{ padding: "0 8px", color: "var(--text-muted)", fontSize: 9 }}>
                {SOURCE_LABELS[e.source] ?? e.source}
              </td>
              <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                {e.estimate ?? "---"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(d: string): string {
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th style={{ padding: "4px 8px", textAlign: align, fontWeight: 500, fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {children}
    </th>
  );
}
