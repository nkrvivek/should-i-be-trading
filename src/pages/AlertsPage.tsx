import { useState } from "react";
import { TerminalShell } from "../components/layout/TerminalShell";
import { Panel } from "../components/layout/Panel";
import { useAlerts, type AlertRule } from "../hooks/useAlerts";
import { Badge } from "../components/shared/Badge";

const TRIGGER_TYPES = [
  { value: "vix_crosses", label: "VIX Crosses Threshold", needsThreshold: true, needsDirection: true, defaultThreshold: "30" },
  { value: "regime_change", label: "Market Signal Change", needsThreshold: false, needsDirection: false },
  { value: "vix_regime_change", label: "VIX Regime Change", needsThreshold: false, needsDirection: false },
  { value: "cri_level_change", label: "CRI Level Change", needsThreshold: false, needsDirection: false },
  { value: "score_drop", label: "Score Drops By", needsThreshold: true, needsDirection: false, defaultThreshold: "15" },
];

function getTriggerMeta(type: string) {
  return TRIGGER_TYPES.find((t) => t.value === type) ?? TRIGGER_TYPES[0];
}

function formatTriggerDesc(rule: AlertRule): string {
  const meta = getTriggerMeta(rule.trigger_type);
  const config = rule.trigger_config;
  if (!meta.needsThreshold) return meta.label;
  const dir = config.direction ? ` ${config.direction}` : "";
  return `${meta.label}${dir} ${config.threshold ?? ""}`;
}

export function AlertsPage() {
  const { rules, history, loading, createRule, updateRule, deleteRule, requestNotificationPermission } = useAlerts();
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("vix_crosses");
  const [formThreshold, setFormThreshold] = useState("30");
  const [formDirection, setFormDirection] = useState<"above" | "below">("above");

  const currentMeta = getTriggerMeta(formType);

  const handleTypeChange = (type: string) => {
    setFormType(type);
    const meta = getTriggerMeta(type);
    if (meta.defaultThreshold) setFormThreshold(meta.defaultThreshold);
    setFormDirection("above");
  };

  const handleCreate = async () => {
    const config: Record<string, unknown> = {};
    if (currentMeta.needsThreshold) config.threshold = parseFloat(formThreshold);
    if (currentMeta.needsDirection) config.direction = formDirection;

    const autoName = currentMeta.needsThreshold
      ? `${currentMeta.label} ${currentMeta.needsDirection ? formDirection + " " : ""}${formThreshold}`
      : currentMeta.label;

    await createRule({
      name: formName || autoName,
      trigger_type: formType,
      trigger_config: config,
      delivery: ["browser"],
      enabled: true,
    });
    setShowForm(false);
    setFormName("");
  };

  return (
    <TerminalShell cri={null}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 500 }}>Alerts</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={requestNotificationPermission} style={btnStyle("var(--text-muted)")}>
              ENABLE NOTIFICATIONS
            </button>
            <button onClick={() => setShowForm(!showForm)} style={btnStyle("var(--signal-core)")}>
              {showForm ? "CANCEL" : "NEW ALERT"}
            </button>
          </div>
        </div>

        {showForm && (
          <Panel title="New Alert Rule">
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
              <div>
                <label style={labelStyle}>Alert Name (optional)</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. VIX Spike Warning" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Trigger Type</label>
                <select value={formType} onChange={(e) => handleTypeChange(e.target.value)} style={inputStyle}>
                  {TRIGGER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {currentMeta.needsDirection && (
                <div>
                  <label style={labelStyle}>Direction</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["above", "below"] as const).map((dir) => (
                      <button
                        key={dir}
                        onClick={() => setFormDirection(dir)}
                        style={{
                          padding: "4px 14px",
                          borderRadius: 4,
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          cursor: "pointer",
                          border: formDirection === dir ? "1px solid var(--signal-core)" : "1px solid var(--border-dim)",
                          background: formDirection === dir ? "rgba(5, 173, 152, 0.1)" : "transparent",
                          color: formDirection === dir ? "var(--signal-core)" : "var(--text-muted)",
                        }}
                      >
                        {dir.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentMeta.needsThreshold && (
                <div>
                  <label style={labelStyle}>
                    {formType === "score_drop" ? "Point Drop" : "Threshold"}
                  </label>
                  <input
                    type="number"
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(e.target.value)}
                    placeholder={currentMeta.defaultThreshold ?? "0"}
                    style={{ ...inputStyle, width: 120 }}
                  />
                </div>
              )}

              {!currentMeta.needsThreshold && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", padding: "4px 0" }}>
                  This alert triggers automatically when a {currentMeta.label.toLowerCase()} is detected.
                </div>
              )}

              <button onClick={handleCreate} style={{ ...btnStyle("var(--positive)"), alignSelf: "flex-start", padding: "6px 20px" }}>
                CREATE ALERT
              </button>
            </div>
          </Panel>
        )}

        <Panel title={`Active Rules (${rules.length})`} loading={loading}>
          {rules.length === 0 ? (
            <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
              No alert rules configured. Click "NEW ALERT" to create one.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {rules.map((rule) => (
                <RuleRow key={rule.id} rule={rule} onToggle={(enabled) => updateRule(rule.id, { enabled })} onDelete={() => deleteRule(rule.id)} />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Alert History">
          {history.length === 0 ? (
            <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>No alerts triggered yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {history.map((h) => (
                <div key={h.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", borderBottom: "1px solid var(--border-dim)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)", flex: 1 }}>{h.message}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 11, flexShrink: 0, marginLeft: 12 }}>
                    {new Date(h.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </TerminalShell>
  );
}

function RuleRow({ rule, onToggle, onDelete }: { rule: AlertRule; onToggle: (enabled: boolean) => void; onDelete: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "var(--bg-panel-raised)", borderRadius: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
        <Badge label={rule.enabled ? "ON" : "OFF"} variant={rule.enabled ? "positive" : "default"} />
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-primary)" }}>{rule.name}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
          {formatTriggerDesc(rule)}
        </span>
        {rule.last_triggered_at && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>
            Last: {new Date(rule.last_triggered_at).toLocaleDateString()}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button onClick={() => onToggle(!rule.enabled)} style={btnStyle("var(--text-muted)")}>{rule.enabled ? "DISABLE" : "ENABLE"}</button>
        <button onClick={onDelete} style={btnStyle("var(--negative)")}>DELETE</button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  padding: "6px 12px", background: "var(--bg-panel)", border: "1px solid var(--border-dim)",
  borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-primary)", outline: "none",
  width: "100%",
};

function btnStyle(color: string): React.CSSProperties {
  return { background: "none", border: `1px solid ${color}`, borderRadius: 4, padding: "4px 12px", fontFamily: "var(--font-mono)", fontSize: 11, color, cursor: "pointer" };
}
