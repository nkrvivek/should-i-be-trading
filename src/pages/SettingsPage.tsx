import { useState } from "react";
import { TerminalShell } from "../components/layout/TerminalShell";
import { ProfileForm } from "../components/settings/ProfileForm";
import { RiskPreferencesForm } from "../components/settings/RiskPreferencesForm";
import { WorkflowProfileForm } from "../components/settings/WorkflowProfileForm";
import { ApiKeyForm } from "../components/settings/ApiKeyForm";
import BrokerageSettings from "../components/settings/BrokerageSettings";
import { TierManager } from "../components/settings/TierManager";
import { NotificationSettings } from "../components/settings/NotificationSettings";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";

type Tab = "profile" | "api_keys" | "brokerage" | "plan" | "notifications";

const TABS: { id: Tab; label: string }[] = [
  { id: "plan", label: "Plan" },
  { id: "api_keys", label: "API Keys" },
  { id: "brokerage", label: "Brokerage" },
  { id: "notifications", label: "Notifications" },
  { id: "profile", label: "Profile" },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") as Tab | null;
    const valid: Tab[] = ["plan", "api_keys", "brokerage", "notifications", "profile"];
    return tab && valid.includes(tab) ? tab : "plan";
  });
  const { user } = useAuthStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <TerminalShell cri={null}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border-dim)", paddingBottom: 8, justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "6px 16px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: "0.03em",
                  color: activeTab === tab.id ? "var(--signal-core)" : "var(--text-muted)",
                  background: activeTab === tab.id ? "rgba(5,173,152,0.1)" : "transparent",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {user && (
            <button
              onClick={handleLogout}
              style={{
                padding: "4px 12px",
                background: "none",
                border: "1px solid var(--border-dim)",
                borderRadius: 4,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              SIGN OUT
            </button>
          )}
        </div>

        {/* Tab content */}
        {activeTab === "plan" && <TierManager />}
        {activeTab === "profile" && (
          <>
            <ProfileForm />
            <div style={{ height: 1, background: "var(--border-dim)", margin: "24px 0" }} />
            <WorkflowProfileForm />
            <div style={{ height: 1, background: "var(--border-dim)", margin: "24px 0" }} />
            <RiskPreferencesForm />
          </>
        )}
        {activeTab === "api_keys" && <ApiKeyForm />}
        {activeTab === "brokerage" && <BrokerageSettings />}
        {activeTab === "notifications" && <NotificationSettings />}
      </div>
    </TerminalShell>
  );
}
