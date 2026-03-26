import { useState } from "react";
import { useUserCredentials, PROVIDER_CONFIG, type CredentialProvider } from "../../hooks/useUserCredentials";
import { useAuthStore } from "../../stores/authStore";
import { Badge } from "../shared/Badge";
import { saveLocalCredential, removeLocalCredential, getCredential } from "../../lib/credentials";

export function ApiKeyForm() {
  const { credentials } = useAuthStore();
  const { saveCredential, removeCredential } = useUserCredentials();
  const [editingProvider, setEditingProvider] = useState<CredentialProvider | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providers = Object.entries(PROVIDER_CONFIG) as [CredentialProvider, (typeof PROVIDER_CONFIG)[CredentialProvider]][];

  const handleSave = async (provider: CredentialProvider) => {
    if (!keyInput.trim()) return;
    setSaving(true);
    setError(null);
    try {
      // Always save to localStorage (works without Supabase)
      saveLocalCredential(provider, keyInput.trim());
      // Also save to Supabase if configured
      try { await saveCredential(provider, keyInput.trim()); } catch { /* Supabase optional */ }
      setEditingProvider(null);
      setKeyInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (provider: CredentialProvider) => {
    try {
      removeLocalCredential(provider);
      try { await removeCredential(provider); } catch { /* Supabase optional */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        API Keys & Integrations
      </div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
        Add your own API keys to unlock features. Keys are stored locally in your browser and sent securely over HTTPS.
      </div>

      {error && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--negative)", padding: 8, background: "rgba(232,93,108,0.1)", borderRadius: 4 }}>
          {error}
        </div>
      )}

      {providers.map(([provider, config]) => {
        const cred = credentials.find((c) => c.provider === provider);
        const hasLocal = !!getCredential(provider);
        const isConnected = cred?.is_valid || hasLocal;
        const isEditing = editingProvider === provider;

        return (
          <div
            key={provider}
            style={{
              padding: 12,
              background: "var(--bg-panel-raised)",
              border: `1px solid ${isConnected ? "var(--positive)" : "var(--border-dim)"}`,
              borderRadius: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500 }}>{config.label}</span>
                {isConnected && <Badge label="CONNECTED" variant="positive" />}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {cred && (
                  <button onClick={() => handleRemove(provider)} style={smallBtnStyle("var(--negative)")}>
                    REMOVE
                  </button>
                )}
                {!isEditing && (
                  <button onClick={() => { setEditingProvider(provider); setKeyInput(""); }} style={smallBtnStyle("var(--signal-core)")}>
                    {cred ? "UPDATE" : "ADD KEY"}
                  </button>
                )}
              </div>
            </div>

            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>
              {config.description}
            </div>

            {isEditing && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder={`Paste your ${config.label} API key`}
                  style={{
                    flex: 1,
                    padding: "6px 12px",
                    background: "var(--bg-panel)",
                    border: "1px solid var(--border-dim)",
                    borderRadius: 4,
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
                <button onClick={() => handleSave(provider)} disabled={saving || !keyInput.trim()} style={smallBtnStyle("var(--positive)")}>
                  {saving ? "..." : "SAVE"}
                </button>
                <button onClick={() => { setEditingProvider(null); setKeyInput(""); }} style={smallBtnStyle("var(--text-muted)")}>
                  CANCEL
                </button>
              </div>
            )}

            <a
              href={config.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--signal-deep)", textDecoration: "none" }}
            >
              Get API key &rarr;
            </a>
          </div>
        );
      })}
    </div>
  );
}

function smallBtnStyle(color: string): React.CSSProperties {
  return {
    background: "none",
    border: `1px solid ${color}`,
    borderRadius: 4,
    padding: "2px 8px",
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}
