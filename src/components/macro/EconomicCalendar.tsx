import type { EconomicEvent } from "../../api/freeDataClient";

type Props = {
  events: EconomicEvent[];
};

export function EconomicCalendar({ events }: Props) {
  if (events.length === 0) {
    return (
      <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
        No high-impact US events this week
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
            <Th align="right">Previous</Th>
            <Th align="right">Estimate</Th>
            <Th align="right">Actual</Th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--border-dim)", height: 28 }}>
              <td style={{ padding: "0 8px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {e.time ? new Date(e.time).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "---"}
              </td>
              <td style={{ padding: "0 8px", fontWeight: 500 }}>{e.event}</td>
              <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                {e.prev != null ? `${e.prev}${e.unit}` : "---"}
              </td>
              <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                {e.estimate != null ? `${e.estimate}${e.unit}` : "---"}
              </td>
              <td style={{ padding: "0 8px", textAlign: "right", fontWeight: 500, color: actualColor(e) }}>
                {e.actual != null ? `${e.actual}${e.unit}` : "---"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function actualColor(e: EconomicEvent): string {
  if (e.actual == null || e.estimate == null) return "var(--text-primary)";
  if (e.actual > e.estimate) return "var(--positive)";
  if (e.actual < e.estimate) return "var(--negative)";
  return "var(--neutral)";
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th style={{ padding: "4px 8px", textAlign: align, fontWeight: 500, fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {children}
    </th>
  );
}
