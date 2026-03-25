import { useState } from "react";
import { TerminalShell } from "../components/layout/TerminalShell";
import { ProfileForm } from "../components/settings/ProfileForm";
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
  const [activeTab, setActiveTab] = useState<Tab>("plan");
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
                  fontSize: 11,
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
                fontSize: 9,
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
        {activeTab === "profile" && <ProfileForm />}
        {activeTab === "api_keys" && <ApiKeyForm />}
        {activeTab === "brokerage" && <BrokerageSettings />}
        {activeTab === "notifications" && <NotificationSettings />}
      </div>
    </TerminalShell>
  );
}
