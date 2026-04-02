const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

const miniStatStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

export function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={miniStatStyle}>
      <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ ...mono, fontSize: 20, fontWeight: 700, color: tone }}>{value}</div>
    </div>
  );
}
