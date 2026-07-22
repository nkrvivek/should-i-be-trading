import { useEffect, useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { hasFeature } from "../../lib/featureGates";
import { UpgradePrompt } from "../shared/UpgradePrompt";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { useExecutionSettings } from "../../hooks/useExecutionSettings";

const sectionHeaderStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-secondary)",
  marginBottom: 4,
};

const subtextStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  color: "var(--text-muted)",
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: 6,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 0",
  borderBottom: "1px solid var(--border-dim)",
};

const numberInputStyle: React.CSSProperties = {
  padding: "6px 12px",
  background: "var(--bg-panel)",
  border: "1px solid var(--border-dim)",
  borderRadius: "var(--radius-sm)",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  color: "var(--text-primary)",
  outline: "none",
  width: 140,
};

const setupButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 32,
  padding: "0 16px",
  marginTop: 8,
  borderRadius: "var(--radius-sm)",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  border: "1px solid var(--accent-bg)",
  background: "rgba(0, 214, 79, 0.12)",
  color: "var(--positive)",
};

function toggleStyle(active: boolean, dangerWhenActive = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    height: 28,
    padding: "0 14px",
    borderRadius: "var(--radius-pill)",
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.03em",
    cursor: "pointer",
    border: `1px solid ${active ? (dangerWhenActive ? "var(--negative)" : "var(--accent-bg)") : "var(--border-dim)"}`,
    background: active ? (dangerWhenActive ? "rgba(232, 93, 108, 0.15)" : "rgba(0, 214, 79, 0.12)") : "transparent",
    color: active ? (dangerWhenActive ? "var(--negative)" : "var(--positive)") : "var(--text-secondary)",
  };
}

export function CopilotSettings() {
  const { effectiveTier } = useAuthStore();
  const tier = effectiveTier();
  const { settings, loading, provisioned, saving, error, update, provision } = useExecutionSettings();
  const [notional, setNotional] = useState("0");
  const [maxTrades, setMaxTrades] = useState("0");
  const [showAutoConfirm, setShowAutoConfirm] = useState(false);

  useEffect(() => {
    if (settings) {
      setNotional(String(settings.auto_max_notional_usd));
      setMaxTrades(String(settings.auto_max_trades_per_day));
    }
  }, [settings]);

  if (!hasFeature(tier, "auto_execute")) {
    return <UpgradePrompt feature="auto_execute" inline />;
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={sectionHeaderStyle}>Copilot — Auto-Execute</div>
      <div style={subtextStyle}>
        Opt-in only. When on, Copilot places trades from approved proposal caps without a
        per-trade tap — capped by the limits below, and stoppable anytime with the kill switch.
      </div>

      {loading && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading…</div>}

      {!loading && !provisioned && (
        <div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Auto-execute isn't set up for your account yet. Set it up now — it starts off, with
            zero caps, and stays that way until you turn it on below.
          </div>
          <button style={setupButtonStyle} onClick={() => provision()} disabled={saving}>
            {saving ? "Setting up…" : "Set up Copilot"}
          </button>
        </div>
      )}

      {!loading && provisioned && settings && (
        <>
          <div style={rowStyle}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Kill switch</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Halts all auto-execution immediately, overriding the toggle below.
              </div>
            </div>
            <button
              style={toggleStyle(settings.kill_switch, true)}
              onClick={() => update({ kill_switch: !settings.kill_switch })}
              disabled={saving}
            >
              {settings.kill_switch ? "ENGAGED" : "OFF"}
            </button>
          </div>

          <div style={rowStyle}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Auto-execute</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Places trades without per-trade approval, up to the caps below.
              </div>
            </div>
            <button
              style={toggleStyle(settings.auto_execute_enabled)}
              disabled={saving}
              onClick={() => {
                if (settings.auto_execute_enabled) {
                  update({ auto_execute_enabled: false });
                } else {
                  setShowAutoConfirm(true);
                }
              }}
            >
              {settings.auto_execute_enabled ? "ON" : "OFF"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 24, paddingTop: 12 }}>
            <div>
              <div style={labelStyle}>Max notional per trade</div>
              <input
                type="number"
                min={0}
                value={notional}
                onChange={(e) => setNotional(e.target.value)}
                onBlur={() => {
                  const parsed = Number(notional);
                  if (Number.isFinite(parsed) && parsed >= 0) update({ auto_max_notional_usd: parsed });
                }}
                style={numberInputStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>Max trades per day</div>
              <input
                type="number"
                min={0}
                step={1}
                value={maxTrades}
                onChange={(e) => setMaxTrades(e.target.value)}
                onBlur={() => {
                  const parsed = Number(maxTrades);
                  if (Number.isFinite(parsed) && parsed >= 0) update({ auto_max_trades_per_day: Math.floor(parsed) });
                }}
                style={numberInputStyle}
              />
            </div>
          </div>
        </>
      )}

      {error && <div style={{ marginTop: 12, fontSize: 12, color: "var(--negative)" }}>{error}</div>}

      {showAutoConfirm && settings && (
        <ConfirmDialog
          title="Turn on auto-execute?"
          confirmLabel="Enable auto-execute"
          danger
          onCancel={() => setShowAutoConfirm(false)}
          onConfirm={() => {
            setShowAutoConfirm(false);
            update({ auto_execute_enabled: true });
          }}
          body={
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                Trades will place WITHOUT per-trade approval, up to ${notional} per trade and{" "}
                {maxTrades} trades per day.
              </div>
              <div>Disable anytime with the kill switch above.</div>
            </div>
          }
        />
      )}
    </div>
  );
}
