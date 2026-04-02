const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

const progressNoteStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

export function ProgressNote({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div style={progressNoteStyle}>
      <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{value}</div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{detail}</div>
    </div>
  );
}
