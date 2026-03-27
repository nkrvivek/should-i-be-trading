import { useState } from "react";
import { BROKER_REGISTRY } from "../../lib/brokers/registry";
import { getBrokerInstance } from "../../lib/brokers/registry";
import { useBrokerStore } from "../../stores/brokerStore";
import type { SnapTradeBroker } from "../../lib/brokers/snaptrade";

const monoStyle: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
const headerStyle: React.CSSProperties = { ...monoStyle, fontSize: 14, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: "var(--text-secondary, #64748b)" };
const inputStyle: React.CSSProperties = { ...monoStyle, fontSize: 14, padding: "8px 12px", border: "1px solid var(--border-dim, #e2e8f0)", borderRadius: 4, background: "var(--bg-panel-raised, #f8fafc)", width: "100%" };

export default function BrokerageSettings() {
  const { activeBroker, account, connect, disconnect, loading, error } = useBrokerStore();
  const [expandedBroker, setExpandedBroker] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [connectError, setConnectError] = useState("");
  const [snapTradeLoading, setSnapTradeLoading] = useState(false);

  const handleConnect = async (slug: string) => {
    setConnectError("");
    try {
      await connect(slug, credentials);
      setExpandedBroker(null);
      setCredentials({});
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : "Connection failed");
    }
  };

  const handleSnapTradeConnect = async () => {
    setConnectError("");
    setSnapTradeLoading(true);
    try {
      // First, connect/register the user with SnapTrade
      await connect("snaptrade", {});

      // Get the broker instance and open Connection Portal
      const broker = getBrokerInstance("snaptrade") as SnapTradeBroker | null;
      if (!broker) throw new Error("SnapTrade broker not available");

      const portalUrl = await broker.getConnectionPortalUrl();
      if (!portalUrl) throw new Error("Could not get Connection Portal URL");

      // Open in a popup window
      const popup = window.open(
        portalUrl,
        "snaptrade_connect",
        "width=800,height=700,scrollbars=yes,resizable=yes",
      );

      // Poll for popup close, then refresh accounts
      if (popup) {
        const pollTimer = setInterval(async () => {
          if (popup.closed) {
            clearInterval(pollTimer);
            // Refresh the connection to pick up newly linked accounts
            try {
              await connect("snaptrade", {});
            } catch {
              // Ignore — user may not have completed the flow
            }
            setSnapTradeLoading(false);
            setExpandedBroker(null);
          }
        }, 1000);
      } else {
        // Popup blocked — fall back to redirect
        window.location.href = portalUrl;
      }
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : "Connection failed");
      setSnapTradeLoading(false);
    }
  };

  return (
    <div>
      <div style={headerStyle}>Brokerage Connections</div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "8px 0 16px" }}>
        Connect your brokerage to view portfolio, place orders, and get strategy recommendations.
      </p>

      {error && (
        <div style={{ padding: 12, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 4, color: "#dc2626", ...monoStyle, fontSize: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {BROKER_REGISTRY.map((broker) => {
          const isActive = activeBroker === broker.slug;
          const isExpanded = expandedBroker === broker.slug;
          const isComingSoon = broker.status === "coming_soon";
          const isSnapTrade = broker.slug === "snaptrade";

          return (
            <div
              key={broker.slug}
              style={{
                border: `1px solid ${isActive ? "var(--signal-core)" : "var(--border-dim)"}`,
                borderRadius: 4,
                padding: 16,
                background: isActive ? "rgba(5, 173, 152, 0.05)" : "var(--bg-panel, #fff)",
                opacity: isComingSoon ? 0.6 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{broker.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{broker.name}</div>
                    <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>{broker.description}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {isActive && (
                    <span style={{ ...monoStyle, fontSize: 12, padding: "4px 10px", background: "var(--signal-core)", color: "#fff", borderRadius: 999 }}>
                      CONNECTED{account?.isPaperTrading ? " (PAPER)" : ""}
                    </span>
                  )}
                  {broker.isPaperAvailable && !isComingSoon && (
                    <span style={{ ...monoStyle, fontSize: 12, padding: "4px 10px", border: "1px solid var(--border-dim)", borderRadius: 999, color: "var(--text-secondary)" }}>
                      PAPER
                    </span>
                  )}
                  {isComingSoon ? (
                    <span style={{ ...monoStyle, fontSize: 12, padding: "4px 10px", background: "#f1f5f9", borderRadius: 999, color: "#94a3b8" }}>COMING SOON</span>
                  ) : isActive ? (
                    <button onClick={disconnect} style={{ ...monoStyle, fontSize: 13, padding: "6px 14px", border: "1px solid var(--fault)", color: "var(--fault)", borderRadius: 4, background: "none", cursor: "pointer" }}>
                      DISCONNECT
                    </button>
                  ) : (
                    <button
                      onClick={() => setExpandedBroker(isExpanded ? null : broker.slug)}
                      style={{ ...monoStyle, fontSize: 13, padding: "6px 14px", border: "1px solid var(--signal-core)", color: "var(--signal-core)", borderRadius: 4, background: "none", cursor: "pointer" }}
                    >
                      {isExpanded ? "CANCEL" : "CONNECT"}
                    </button>
                  )}
                </div>
              </div>

              {/* SnapTrade — Connection Portal flow (no credential fields) */}
              {isExpanded && isSnapTrade && !isComingSoon && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-dim)", textAlign: "center" }}>
                  <button
                    onClick={handleSnapTradeConnect}
                    disabled={snapTradeLoading || loading}
                    style={{
                      ...monoStyle,
                      fontSize: 15,
                      fontWeight: 600,
                      padding: "14px 40px",
                      background: "var(--signal-core)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      cursor: snapTradeLoading ? "wait" : "pointer",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {snapTradeLoading ? "OPENING PORTAL..." : "CONNECT YOUR BROKER"}
                  </button>
                  <p style={{ ...monoStyle, fontSize: 12, color: "var(--text-secondary)", marginTop: 12, lineHeight: 1.6 }}>
                    Supports Schwab, Fidelity, E*Trade, Robinhood, Webull, Interactive Brokers, and 20+ more
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                    A secure window will open to connect your brokerage. No API keys needed.
                  </p>
                  {connectError && (
                    <div style={{ marginTop: 8, color: "var(--fault)", ...monoStyle, fontSize: 13 }}>{connectError}</div>
                  )}
                </div>
              )}

              {/* Standard brokers — credential fields */}
              {isExpanded && !isSnapTrade && !isComingSoon && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-dim)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                    {broker.credentialFields.map((field) => (
                      <div key={field.key}>
                        <label style={{ ...headerStyle, fontSize: 12, display: "block", marginBottom: 4 }}>{field.label}</label>
                        {field.type === "select" ? (
                          <select
                            value={credentials[field.key] ?? "paper"}
                            onChange={(e) => setCredentials({ ...credentials, [field.key]: e.target.value })}
                            style={inputStyle}
                          >
                            <option value="paper">Paper Trading</option>
                            <option value="live">Live Trading</option>
                          </select>
                        ) : (
                          <input
                            type={field.type}
                            placeholder={field.placeholder}
                            value={credentials[field.key] ?? ""}
                            onChange={(e) => setCredentials({ ...credentials, [field.key]: e.target.value })}
                            style={inputStyle}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  {connectError && (
                    <div style={{ marginTop: 8, color: "var(--fault)", ...monoStyle, fontSize: 13 }}>{connectError}</div>
                  )}
                  <button
                    onClick={() => handleConnect(broker.slug)}
                    disabled={loading}
                    style={{ marginTop: 12, ...monoStyle, fontSize: 13, padding: "8px 24px", background: "var(--signal-core)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                  >
                    {loading ? "CONNECTING..." : "TEST & CONNECT"}
                  </button>
                </div>
              )}

              {isActive && account && (
                <div style={{ marginTop: 12, display: "flex", gap: 16, ...monoStyle, fontSize: 13, color: "var(--text-secondary)" }}>
                  <span>Equity: ${account.equity.toLocaleString()}</span>
                  <span>Cash: ${account.cash.toLocaleString()}</span>
                  <span>Buying Power: ${account.buyingPower.toLocaleString()}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
