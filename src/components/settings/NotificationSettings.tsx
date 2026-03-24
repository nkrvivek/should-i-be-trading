/**
 * Notification Settings — Toggle browser notifications per alert type.
 */

import { useState, useEffect } from "react";
import {
  getNotificationPrefs,
  setNotificationPrefs,
  requestPermission,
  sendTestNotification,
  type NotificationType,
} from "../../hooks/useNotifications";

const NOTIFICATION_TYPES: { type: NotificationType; label: string; description: string }[] = [
  { type: "regime_change", label: "Regime Changes", description: "Signal flips between TRADE / CAUTION / NO TRADE" },
  { type: "vix_spike", label: "VIX Spikes", description: "VIX crosses above 30 (defensive territory)" },
  { type: "score_drop", label: "Score Drops", description: "Market Quality Score drops from 60+ to below 40" },
  { type: "fsi_collapse", label: "FSI Collapse", description: "Financial Stress Indicator drops below critical level" },
];

export function NotificationSettings() {
  const [prefs, setPrefs] = useState(getNotificationPrefs());
  const [permission, setPermission] = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "denied",
  );

  useEffect(() => {
    setNotificationPrefs(prefs);
  }, [prefs]);

  const handleEnable = async () => {
    const granted = await requestPermission();
    setPermission(Notification.permission);
    if (granted) {
      setPrefs({ ...prefs, enabled: true });
    }
  };

  const toggleType = (type: NotificationType) => {
    setPrefs({
      ...prefs,
      types: { ...prefs.types, [type]: !prefs.types[type] },
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Enable/Disable */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        background: "var(--bg-panel-raised)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
      }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>
            Browser Notifications
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
            {permission === "denied"
              ? "Notifications blocked by browser. Enable in browser settings."
              : permission === "granted"
                ? prefs.enabled ? "Active — you'll be notified when signals change" : "Permission granted but notifications paused"
                : "Click to enable browser notifications"}
          </div>
        </div>
        <button
          onClick={prefs.enabled ? () => setPrefs({ ...prefs, enabled: false }) : handleEnable}
          disabled={permission === "denied"}
          style={{
            padding: "6px 16px",
            borderRadius: 4,
            border: "1px solid var(--border-dim)",
            background: prefs.enabled ? "var(--signal-core)" : "var(--bg-panel)",
            color: prefs.enabled ? "var(--bg-base)" : "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            cursor: permission === "denied" ? "not-allowed" : "pointer",
            opacity: permission === "denied" ? 0.5 : 1,
          }}
        >
          {prefs.enabled ? "ENABLED" : "ENABLE"}
        </button>
      </div>

      {/* Type toggles */}
      {prefs.enabled && NOTIFICATION_TYPES.map(({ type, label, description }) => (
        <div
          key={type}
          onClick={() => toggleType(type)}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            background: "var(--bg-panel)",
            border: "1px solid var(--border-dim)",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-primary)" }}>{label}</div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-muted)" }}>{description}</div>
          </div>
          <div
            style={{
              width: 32,
              height: 18,
              borderRadius: 9,
              background: prefs.types[type] ? "var(--signal-core)" : "var(--bg-hover)",
              position: "relative",
              transition: "background 0.2s",
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                background: "#fff",
                position: "absolute",
                top: 2,
                left: prefs.types[type] ? 16 : 2,
                transition: "left 0.2s",
              }}
            />
          </div>
        </div>
      ))}

      {/* Test button */}
      {prefs.enabled && permission === "granted" && (
        <button
          onClick={sendTestNotification}
          style={{
            padding: "6px 12px",
            background: "none",
            border: "1px solid var(--border-dim)",
            borderRadius: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-muted)",
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          SEND TEST NOTIFICATION
        </button>
      )}
    </div>
  );
}
