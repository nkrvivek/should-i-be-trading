import type { SignalHistoryEntry } from "../../hooks/useSignalHistory";
import { fmt } from "../../lib/format";

type Props = {
  history: SignalHistoryEntry[];
};

function signalColor(signal: string): string {
  switch (signal) {
    case "TRADE": return "var(--positive)";
    case "CAUTION": return "var(--warning)";
    case "NO_TRADE": return "var(--negative)";
    default: return "var(--neutral)";
  }
}

export function SignalTimeline({ history }: Props) {
  if (history.length === 0) {
    return (
      <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
        No signal history yet. Verdicts will be recorded as they change.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 300, overflow: "auto" }}>
      {history.map((entry, i) => {
        const date = new Date(entry.timestamp);
        const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
        const isNew = i === 0;

        return (
          <div
            key={entry.timestamp}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "6px 8px",
              background: isNew ? "rgba(5, 173, 152, 0.05)" : "transparent",
              borderRadius: 4,
              borderLeft: `3px solid ${signalColor(entry.signal)}`,
            }}
          >
            {/* Timestamp */}
            <div style={{ flexShrink: 0, width: 80 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>{dateStr}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>{timeStr}</div>
            </div>

            {/* Signal */}
            <div style={{ flexShrink: 0, width: 80 }}>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 600,
                color: signalColor(entry.signal),
              }}>
                {entry.signal.replace("_", " ")}
              </span>
            </div>

            {/* Context */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)" }}>
                CRI {fmt(entry.criScore)} | VIX {fmt(entry.vix)} | {entry.vixRegime}
              </div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                {entry.reasons[0]}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
