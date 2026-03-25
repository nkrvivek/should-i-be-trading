import { useState } from "react";
import { TerminalShell } from "../components/layout/TerminalShell";
import { Panel } from "../components/layout/Panel";
import { useAlerts, type AlertRule } from "../hooks/useAlerts";
import { Badge } from "../components/shared/Badge";

const TRIGGER_TYPES = [
  { value: "vix_crosses", label: "VIX Crosses Threshold" },
  { value: "cri_level_change", label: "CRI Level Change" },
  { value: "vix_regime_change", label: "VIX Regime Change" },
  { value: "price_crosses", label: "Price Crosses Level" },
  { value: "regime_change", label: "Market Regime Change" },
];

export function AlertsPage() {
  const { rules, history, loading, createRule, updateRule, deleteRule, requestNotificationPermission } = useAlerts();
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("vix_crosses");
  const [formThreshold, setFormThreshold] = useState("30");

  const handleCreate = async () => {
    await createRule({
      name: formName || `${formType} at ${formThreshold}`,
      trigger_type: formType,
      trigger_config: { threshold: parseFloat(formThreshold), direction: "above" },
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
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 8 }}>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Alert name" style={inputStyle} />
              <select value={formType} onChange={(e) => setFormType(e.target.value)} style={inputStyle}>
                {TRIGGER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input type="number" value={formThreshold} onChange={(e) => setFormThreshold(e.target.value)} placeholder="Threshold" style={inputStyle} />
              <button onClick={handleCreate} style={{ ...btnStyle("var(--positive)"), alignSelf: "flex-start" }}>CREATE</button>
            </div>
          </Panel>
        )}

        <Panel title={`Active Rules (${rules.length})`} loading={loading}>
          {rules.length === 0 ? (
            <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
              No alert rules configured
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
                <div key={h.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", borderBottom: "1px solid var(--border-dim)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                  <span>{h.message}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{new Date(h.created_at).toLocaleString()}</span>
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: "var(--bg-panel-raised)", borderRadius: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Badge label={rule.enabled ? "ON" : "OFF"} variant={rule.enabled ? "positive" : "default"} />
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 14 }}>{rule.name}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{rule.trigger_type}</span>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <button onClick={() => onToggle(!rule.enabled)} style={btnStyle("var(--text-muted)")}>{rule.enabled ? "DISABLE" : "ENABLE"}</button>
        <button onClick={onDelete} style={btnStyle("var(--negative)")}>DELETE</button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "6px 12px", background: "var(--bg-panel)", border: "1px solid var(--border-dim)",
  borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-primary)", outline: "none",
};

function btnStyle(color: string): React.CSSProperties {
  return { background: "none", border: `1px solid ${color}`, borderRadius: 4, padding: "4px 12px", fontFamily: "var(--font-mono)", fontSize: 11, color, cursor: "pointer" };
}
