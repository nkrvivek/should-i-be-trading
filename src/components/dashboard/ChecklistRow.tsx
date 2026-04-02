const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

const checklistRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const secondaryBtnStyle: React.CSSProperties = {
  ...mono,
  fontSize: 12,
  fontWeight: 700,
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid var(--border-dim)",
  background: "transparent",
  color: "var(--text-secondary)",
  cursor: "pointer",
};

export function ChecklistRow({ title, body, cta, onClick }: { title: string; body: string; cta: string; onClick: () => void }) {
  return (
    <div style={checklistRowStyle}>
      <div>
        <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{title}</div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>{body}</div>
      </div>
      <button type="button" onClick={onClick} style={secondaryBtnStyle}>{cta}</button>
    </div>
  );
}
