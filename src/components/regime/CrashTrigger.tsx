import type { CriData } from "../../api/types";

type Props = {
  trigger: CriData["crash_trigger"];
};

export function CrashTrigger({ trigger }: Props) {
  if (!trigger) return null;

  const conds = trigger.conditions ?? {};
  const conditions = [
    { label: "SPX below 100d MA", met: conds.spx_below_100d_ma ?? false },
    { label: "Realized Vol > 25%", met: conds.realized_vol_gt_25 ?? false },
    { label: "COR1M > 60", met: conds.cor1m_gt_60 ?? false },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 16,
        background: "var(--bg-panel)",
        border: `1px solid ${trigger.triggered ? "var(--negative)" : "var(--border-dim)"}`,
        borderRadius: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            fontWeight: 500,
            color: trigger.triggered ? "var(--negative)" : "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Crash Trigger
        </span>
        {trigger.triggered && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              padding: "1px 6px",
              borderRadius: 999,
              background: "rgba(232, 93, 108, 0.2)",
              color: "var(--negative)",
            }}
          >
            ACTIVE
          </span>
        )}
      </div>
      {conditions.map((c) => (
        <div
          key={c.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
        >
          <span style={{ color: c.met ? "var(--negative)" : "var(--positive)", fontSize: 14 }}>
            {c.met ? "\u2717" : "\u2713"}
          </span>
          <span style={{ color: c.met ? "var(--text-primary)" : "var(--text-muted)" }}>
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}
