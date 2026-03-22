type Props = {
  components: {
    vix: number;
    vvix: number;
    correlation: number;
    momentum: number;
  };
};

function barColor(score: number): string {
  if (score < 8) return "var(--positive)";
  if (score < 16) return "var(--warning)";
  return "var(--negative)";
}

export function ComponentBars({ components }: Props) {
  if (!components) return null;

  const safe = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

  const bars = [
    { label: "VIX", value: safe(components.vix) },
    { label: "VVIX", value: safe(components.vvix) },
    { label: "CORR", value: safe(components.correlation) },
    { label: "MOM", value: safe(components.momentum) },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 16,
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 10,
          fontWeight: 500,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 4,
        }}
      >
        CRI Components
      </div>
      {bars.map((bar) => (
        <div key={bar.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 40,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text-secondary)",
              textAlign: "right",
            }}
          >
            {bar.label}
          </span>
          <div
            style={{
              flex: 1,
              height: 8,
              background: "var(--border-dim)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(bar.value / 25) * 100}%`,
                height: "100%",
                background: barColor(bar.value),
                borderRadius: 2,
                transition: "width 0.3s var(--ease-out)",
              }}
            />
          </div>
          <span
            style={{
              width: 44,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: barColor(bar.value),
              textAlign: "right",
            }}
          >
            {bar.value.toFixed(1)}/25
          </span>
        </div>
      ))}
    </div>
  );
}
