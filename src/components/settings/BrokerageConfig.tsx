import { useState } from "react";
import { Badge } from "../shared/Badge";

export function BrokerageConfig() {
  const [wsUrl, setWsUrl] = useState("ws://localhost:8765");
  const [apiUrl, setApiUrl] = useState("http://localhost:8321");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem("sibt_ws_url", wsUrl);
    localStorage.setItem("sibt_api_url", apiUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Brokerage Connection
      </div>

      <div style={{ padding: 16, background: "var(--bg-panel-raised)", borderRadius: 4, border: "1px solid var(--border-dim)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500 }}>Interactive Brokers Gateway</span>
          <Badge label="SELF-HOSTED" variant="info" />
        </div>

        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.6 }}>
          SIBT connects to your locally-running IB Gateway and WebSocket relay.
          You maintain full control of your brokerage connection — nothing is hosted by us.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>WebSocket Relay URL</label>
            <input value={wsUrl} onChange={(e) => setWsUrl(e.target.value)} style={inputStyle} placeholder="ws://localhost:8765" />
            <div style={hintStyle}>Real-time price streaming from IB via the WS relay</div>
          </div>

          <div>
            <label style={labelStyle}>API Server URL</label>
            <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} style={inputStyle} placeholder="http://localhost:8321" />
            <div style={hintStyle}>FastAPI backend for portfolio sync, orders, and scanning</div>
          </div>

          <button onClick={handleSave} style={{
            padding: "8px 16px",
            background: "var(--accent-bg)",
            border: "none",
            borderRadius: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--accent-text)",
            cursor: "pointer",
            alignSelf: "flex-start",
          }}>
            {saved ? "SAVED" : "SAVE CONNECTION"}
          </button>
        </div>
      </div>

      <div style={{ padding: 16, background: "var(--bg-panel-raised)", borderRadius: 4, border: "1px solid var(--border-dim)" }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Setup Guide</div>
        <ol style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 2, paddingLeft: 20 }}>
          <li>Install IB Gateway from <a href="https://www.interactivebrokers.com/en/trading/ibgateway-stable.php" target="_blank" rel="noopener noreferrer" style={{ color: "var(--signal-core)" }}>interactivebrokers.com</a></li>
          <li>Configure IB Gateway for API access on port 4001 (live) or 4002 (paper)</li>
          <li>Start the WebSocket relay server (included in the Radon package)</li>
          <li>Start the FastAPI backend server</li>
          <li>Enter the URLs above and save</li>
        </ol>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "var(--bg-panel)",
  border: "1px solid var(--border-dim)",
  borderRadius: 4,
  fontFamily: "var(--font-mono)",
  fontSize: 14,
  color: "var(--text-primary)",
  outline: "none",
};

const hintStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  color: "var(--text-muted)",
  marginTop: 2,
};
