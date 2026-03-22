import { useState, useRef, useEffect } from "react";
import type { MetricDefinition } from "../../lib/metricDefinitions";

type Props = {
  definition: MetricDefinition;
  currentValue?: number;
  children: React.ReactNode;
};

export function InfoTooltip({ definition, currentValue, children }: Props) {
  const [open, setOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 4 }}>
      {children}
      <span
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 14,
          height: 14,
          borderRadius: "50%",
          border: "1px solid var(--border-dim)",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 600,
          color: open ? "var(--signal-core)" : "var(--text-muted)",
          cursor: "pointer",
          flexShrink: 0,
          transition: "color 0.15s, border-color 0.15s",
          borderColor: open ? "var(--signal-core)" : undefined,
        }}
        title={definition.short}
      >
        ?
      </span>

      {open && (
        <div
          ref={tooltipRef}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            zIndex: 1000,
            width: 340,
            padding: 16,
            background: "var(--bg-panel)",
            border: "1px solid var(--border-dim)",
            borderRadius: 4,
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          {/* Header */}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--signal-core)", marginBottom: 4 }}>
            {definition.name}
          </div>

          {/* Description */}
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 10 }}>
            {definition.description}
          </div>

          {/* Why it matters */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
              Why it matters
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {definition.whyItMatters}
            </div>
          </div>

          {/* Current interpretation */}
          {currentValue != null && (
            <div style={{
              padding: "8px 10px",
              background: "var(--bg-panel-raised)",
              borderRadius: 4,
              border: "1px solid var(--border-dim)",
            }}>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
                Current reading
              </div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-primary)", lineHeight: 1.5 }}>
                {definition.interpret(currentValue)}
              </div>
            </div>
          )}

          {/* Range bar */}
          <div style={{ marginTop: 10 }}>
            <PercentileBar value={currentValue ?? 0} low={definition.range.low} high={definition.range.high} unit={definition.range.unit} />
          </div>
        </div>
      )}
    </span>
  );
}

function PercentileBar({ value, low, high, unit = "" }: { value: number; low: number; high: number; unit?: string }) {
  const pct = Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", marginBottom: 3 }}>
        <span>{low}{unit}</span>
        <span>{high}{unit}</span>
      </div>
      <div style={{ height: 6, background: "var(--border-dim)", borderRadius: 3, overflow: "hidden", position: "relative" }}>
        {/* Gradient bar */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: "100%",
          background: "linear-gradient(to right, var(--positive), var(--warning), var(--negative))",
          opacity: 0.4,
          borderRadius: 3,
        }} />
        {/* Current value marker */}
        <div style={{
          position: "absolute",
          top: -2,
          left: `${pct}%`,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "var(--text-primary)",
          border: "2px solid var(--bg-panel)",
          transform: "translateX(-50%)",
        }} />
      </div>
    </div>
  );
}
