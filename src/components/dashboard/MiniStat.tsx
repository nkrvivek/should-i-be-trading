const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

const miniStatStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: "var(--radius-lg)",
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
  boxShadow: "var(--shadow-card)",
};

export function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={miniStatStyle}>
      <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
      <div className="heading-tight" style={{ ...mono, fontVariantNumeric: "tabular-nums", fontSize: 26, fontWeight: 700, color: tone }}>{value}</div>
    </div>
  );
}
