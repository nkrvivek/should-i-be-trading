const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

const actionCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const primaryBtnStyle: React.CSSProperties = {
  ...mono,
  fontSize: 12,
  fontWeight: 700,
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid var(--signal-core)",
  background: "rgba(5, 173, 152, 0.12)",
  color: "var(--signal-core)",
  cursor: "pointer",
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

export function ActionCard({
  eyebrow,
  title,
  body,
  cta,
  secondary,
  onClick,
  onSecondaryClick,
}: {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  secondary?: string;
  onClick: () => void;
  onSecondaryClick?: () => void;
}) {
  return (
    <div style={actionCardStyle}>
      <div>
        <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "var(--signal-core)", letterSpacing: "0.08em", marginBottom: 6 }}>
          {eyebrow}
        </div>
        <div style={{ ...mono, fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>
          {body}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={onClick} style={primaryBtnStyle}>{cta}</button>
        {secondary && onSecondaryClick && (
          <button type="button" onClick={onSecondaryClick} style={secondaryBtnStyle}>{secondary}</button>
        )}
      </div>
    </div>
  );
}
