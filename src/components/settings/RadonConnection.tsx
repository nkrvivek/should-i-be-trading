import { useState, useEffect } from "react";
import { useAuthStore } from "../../stores/authStore";

export function RadonConnection() {
  const { profile } = useAuthStore();
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem("sibt_api_url") || "http://localhost:8321");
  const [wsUrl, setWsUrl] = useState(() => localStorage.getItem("sibt_ws_url") || "ws://localhost:8765");
  const [status, setStatus] = useState<"idle" | "checking" | "connected" | "failed">("idle");
  const [healthData, setHealthData] = useState<Record<string, unknown> | null>(null);

  const checkHealth = async () => {
    setStatus("checking");
    try {
      const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
        setStatus("connected");
      } else {
        setStatus("failed");
        setHealthData(null);
      }
    } catch {
      setStatus("failed");
      setHealthData(null);
    }
  };

  const handleSave = () => {
    localStorage.setItem("sibt_api_url", apiUrl);
    localStorage.setItem("sibt_ws_url", wsUrl);
    checkHealth();
  };

  const handleReset = () => {
    localStorage.removeItem("sibt_api_url");
    localStorage.removeItem("sibt_ws_url");
    setApiUrl("http://localhost:8321");
    setWsUrl("ws://localhost:8765");
    setStatus("idle");
    setHealthData(null);
  };

  useEffect(() => {
    checkHealth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isEnterprise = profile?.tier === "enterprise";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{
        padding: 20,
        background: "var(--bg-panel-raised)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Radon Connection
          </span>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: status === "connected" ? "var(--positive)" : status === "failed" ? "var(--negative)" : "var(--neutral)",
          }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
            {status === "connected" ? "CONNECTED" : status === "failed" ? "UNREACHABLE" : status === "checking" ? "CHECKING..." : "NOT TESTED"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              FastAPI URL
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:8321"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              WebSocket Relay URL
            </label>
            <input
              type="text"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              placeholder="ws://localhost:8765"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSave} style={btnPrimary}>
              SAVE + TEST
            </button>
            <button onClick={handleReset} style={btnSecondary}>
              RESET DEFAULTS
            </button>
          </div>
        </div>

        {/* Health details */}
        {healthData && (
          <div style={{
            marginTop: 12,
            padding: 12,
            background: "var(--bg-panel)",
            border: "1px solid var(--border-dim)",
            borderRadius: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-secondary)",
          }}>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(healthData, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Cloud Radon (Enterprise) */}
      {isEnterprise && (
        <div style={{
          padding: 20,
          background: "var(--bg-panel)",
          border: "1px solid var(--border-dim)",
          borderRadius: 4,
        }}>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Cloud Radon (Enterprise)
          </div>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 12px" }}>
            Your Enterprise subscription includes a managed Radon instance. No local setup required.
            Provide your IBKR credentials and we handle the rest.
          </p>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--signal-core)" }}>
            Cloud Radon provisioning coming soon. Use self-hosted for now.
          </div>
        </div>
      )}

      {/* Setup guide */}
      <div style={{
        padding: 20,
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
      }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          Self-Hosted Setup Guide
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 2 }}>
          <p>1. Clone Radon: <code>git clone https://github.com/joemccann/radon.git</code></p>
          <p>2. Install Python deps: <code>pip install -r requirements.txt</code></p>
          <p>3. Install IB Gateway via IBC</p>
          <p>4. Configure .env with your API keys</p>
          <p>5. Start: <code>cd web && npm run dev</code></p>
          <p>6. Enter URLs above and click SAVE + TEST</p>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "var(--bg-panel)",
  border: "1px solid var(--border-dim)",
  borderRadius: 4,
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  color: "var(--text-primary)",
  outline: "none",
  boxSizing: "border-box",
};

const btnPrimary: React.CSSProperties = {
  padding: "8px 16px",
  background: "var(--signal-core)",
  border: "none",
  borderRadius: 4,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--bg-base)",
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  padding: "8px 16px",
  background: "var(--bg-panel)",
  border: "1px solid var(--border-dim)",
  borderRadius: 4,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--text-secondary)",
  cursor: "pointer",
};
