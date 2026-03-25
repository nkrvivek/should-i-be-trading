import type { FredObservation } from "../../api/freeDataClient";
import { MonoValue } from "../shared/MonoValue";

type SeriesData = {
  label: string;
  seriesId: string;
  unit: string;
  observations: FredObservation[];
};

type Props = {
  series: SeriesData[];
};

export function MacroIndicators({ series }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
      {series.map((s) => {
        const latest = s.observations[0];
        const previous = s.observations[1];
        const value = latest ? parseFloat(latest.value) : null;
        const prevValue = previous ? parseFloat(previous.value) : null;
        const change = value != null && prevValue != null ? value - prevValue : null;

        return (
          <div
            key={s.seriesId}
            style={{
              padding: 12,
              background: "var(--bg-panel-raised)",
              border: "1px solid var(--border-dim)",
              borderRadius: 4,
            }}
          >
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 }}>
              {s.label}
            </div>
            <MonoValue
              value={value != null ? `${value.toFixed(1)}${s.unit}` : "---"}
              size="lg"
            />
            {change != null && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: change > 0 ? "var(--positive)" : change < 0 ? "var(--negative)" : "var(--neutral)", marginTop: 4 }}>
                {change >= 0 ? "+" : ""}{change.toFixed(2)}{s.unit} vs prior
              </div>
            )}
            {latest && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                {latest.date}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
