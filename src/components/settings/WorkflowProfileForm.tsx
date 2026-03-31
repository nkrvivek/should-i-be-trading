import { useAppStore, type WorkflowProfile } from "../../stores/appStore";

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

const OPTIONS: Array<{
  value: WorkflowProfile;
  label: string;
  body: string;
}> = [
  {
    value: "beginner",
    label: "Beginner",
    body: "Best if you want the product to slow you down, prioritize lessons and simulator steps, and guide you clearly into safer workflows.",
  },
  {
    value: "active_trader",
    label: "Active Trader",
    body: "Best if you already trade regularly and want faster triage, tighter validation, and a quicker route into review and execution.",
  },
  {
    value: "options_trader",
    label: "Options Trader",
    body: "Best if you want more emphasis on structure, defined risk, simulator reps, and order-review discipline before multi-leg execution.",
  },
];

export function WorkflowProfileForm() {
  const { workflowProfile, setWorkflowProfile } = useAppStore();

  return (
    <div style={panelStyle}>
      <div style={sectionHeaderStyle}>Workflow Profile</div>
      <p style={bodyStyle}>
        Choose the workflow lens that should shape your Home guidance and next-step prompts.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {OPTIONS.map((option) => {
          const active = option.value === workflowProfile;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setWorkflowProfile(option.value)}
              style={{
                ...optionStyle,
                borderColor: active ? "var(--signal-core)" : "var(--border-dim)",
                background: active ? "rgba(5, 173, 152, 0.08)" : "var(--bg-panel)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{option.label}</span>
                <span style={{
                  ...mono,
                  fontSize: 11,
                  color: active ? "var(--signal-core)" : "var(--text-muted)",
                }}>
                  {active ? "ACTIVE" : "SELECT"}
                </span>
              </div>
              <div style={optionBodyStyle}>{option.body}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const sectionHeaderStyle: React.CSSProperties = {
  ...mono,
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--text-primary)",
};

const bodyStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  lineHeight: 1.6,
  color: "var(--text-secondary)",
};

const optionStyle: React.CSSProperties = {
  textAlign: "left",
  padding: 14,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  cursor: "pointer",
};

const optionBodyStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  lineHeight: 1.55,
  color: "var(--text-secondary)",
};
