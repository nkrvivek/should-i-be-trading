type HandoffAction = {
  label: string;
  onClick: () => void;
  tone?: "primary" | "secondary";
};

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

export function WorkflowHandoffCard({
  eyebrow,
  title,
  body,
  actions,
}: {
  eyebrow: string;
  title: string;
  body: string;
  actions: HandoffAction[];
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 8,
        border: "1px solid rgba(5, 173, 152, 0.25)",
        background: "linear-gradient(180deg, rgba(5, 173, 152, 0.08), rgba(5, 173, 152, 0.02))",
      }}
    >
      <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "var(--signal-core)", letterSpacing: "0.08em", marginBottom: 8 }}>
        {eyebrow}
      </div>
      <div style={{ ...mono, fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.65, color: "var(--text-secondary)", marginBottom: 12 }}>
        {body}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            style={action.tone === "secondary" ? secondaryBtnStyle : primaryBtnStyle}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

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
