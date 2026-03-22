import { useState } from "react";
import { TerminalShell } from "../components/layout/TerminalShell";
import { ProfileForm } from "../components/settings/ProfileForm";
import { ApiKeyForm } from "../components/settings/ApiKeyForm";
import { BrokerageConfig } from "../components/settings/BrokerageConfig";

type Tab = "profile" | "api_keys" | "brokerage";

const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "api_keys", label: "API Keys" },
  { id: "brokerage", label: "Brokerage" },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("api_keys");

  return (
    <TerminalShell cri={null}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border-dim)", paddingBottom: 8 }}>
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

        {/* Tab content */}
        {activeTab === "profile" && <ProfileForm />}
        {activeTab === "api_keys" && <ApiKeyForm />}
        {activeTab === "brokerage" && <BrokerageConfig />}
      </div>
    </TerminalShell>
  );
}
