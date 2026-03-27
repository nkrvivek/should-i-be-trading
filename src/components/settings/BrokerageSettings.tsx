import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BROKER_REGISTRY } from "../../lib/brokers/registry";
import { createBrokerInstance } from "../../lib/brokers/registry";
import { useBrokerStore } from "../../stores/brokerStore";
import { useAuthStore } from "../../stores/authStore";
import { hasFeature } from "../../lib/featureGates";
import type { SnapTradeBroker } from "../../lib/brokers/snaptrade";

const monoStyle: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
const headerStyle: React.CSSProperties = { ...monoStyle, fontSize: 14, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: "var(--text-secondary, #64748b)" };
const inputStyle: React.CSSProperties = { ...monoStyle, fontSize: 14, padding: "8px 12px", border: "1px solid var(--border-dim, #e2e8f0)", borderRadius: 4, background: "var(--bg-panel-raised, #f8fafc)", width: "100%" };

export default function BrokerageSettings() {
  const {
    connections,
    accounts,
    errors: errorsMap,
    loading: loadingMap,
    addConnection,
    removeConnection,
    refresh,
  } = useBrokerStore();

  const { effectiveTier } = useAuthStore();
  const navigate = useNavigate();
  const userTier = effectiveTier();
  const canUseSnapTrade = hasFeature(userTier, "snaptrade");
  const [expandedBroker, setExpandedBroker] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [connectError, setConnectError] = useState("");
  const [snapTradeLoading, setSnapTradeLoading] = useState(false);

  const isAnyLoading = Object.values(loadingMap).some(Boolean);
  const firstError = Object.values(errorsMap).find((e) => e != null) ?? null;

  // Which broker slugs are currently connected
  const connectedSlugs = new Set(connections.map((c) => c.slug));

  const handleConnect = async (slug: string) => {
    setConnectError("");
    try {
      await addConnection(slug, credentials);
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
      // Create a fresh instance for the portal flow
      const instance = createBrokerInstance("snaptrade") as SnapTradeBroker | null;
      if (!instance) throw new Error("SnapTrade broker not available");

      // Connect/register the user
      await instance.connect({});

      const portalUrl = await instance.getConnectionPortalUrl();
      if (!portalUrl) throw new Error("Could not get Connection Portal URL");

      // Open in a popup window
      const popup = window.open(
        portalUrl,
        "snaptrade_connect",
        "width=800,height=700,scrollbars=yes,resizable=yes",
      );

      // Poll for popup close, then add connection
      if (popup) {
        const pollTimer = setInterval(async () => {
          if (popup.closed) {
            clearInterval(pollTimer);
            try {
              // Add as a new connection entry
              await addConnection("snaptrade", {}, `SnapTrade (${connections.filter((c) => c.slug === "snaptrade").length + 1})`);
            } catch {
              // User may not have completed the flow
            }
            setSnapTradeLoading(false);
            setExpandedBroker(null);
          }
        }, 1000);
        // Safety: clear after 5 minutes
        setTimeout(() => {
          clearInterval(pollTimer);
          setSnapTradeLoading(false);
        }, 5 * 60 * 1000);
      } else {
        window.location.href = portalUrl;
      }
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : "Connection failed");
      setSnapTradeLoading(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    await removeConnection(connectionId);
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <div>
      <div style={headerStyle}>Brokerage Connections</div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "8px 0 16px" }}>
        Connect one or more brokerages for a combined portfolio view, cross-broker wash sale detection, and unified strategy analysis.
      </p>

      {firstError && (
        <div style={{ padding: 12, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 4, color: "#dc2626", ...monoStyle, fontSize: 14, marginBottom: 16 }}>
          {firstError}
        </div>
      )}

      {/* Connected brokers list */}
      {connections.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ ...headerStyle, fontSize: 12, marginBottom: 8 }}>
            Active Connections ({connections.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {connections.map((conn) => {
              const connAccount = accounts[conn.id];
              const connError = errorsMap[conn.id];
              const connLoading = loadingMap[conn.id];
              const info = BROKER_REGISTRY.find((b) => b.slug === conn.slug);
              const posCount = useBrokerStore.getState().positions[conn.id]?.length ?? 0;

              return (
                <div
                  key={conn.id}
                  style={{
                    border: "1px solid var(--signal-core)",
                    borderRadius: 4,
                    padding: 12,
                    background: "rgba(5, 173, 152, 0.05)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{info?.icon ?? "📊"}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{conn.displayName}</div>
                      {connAccount && (
                        <div style={{ ...monoStyle, fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                          Equity: {fmt(connAccount.equity)} | Positions: {posCount} | Cash: {fmt(connAccount.cash)}
                          {connAccount.isPaperTrading && " (Paper)"}
                        </div>
                      )}
                      {connError && (
                        <div style={{ ...monoStyle, fontSize: 12, color: "var(--warning, #f59e0b)", marginTop: 2 }}>
                          {connError}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{
                      ...monoStyle,
                      fontSize: 11,
                      padding: "3px 8px",
                      borderRadius: 999,
                      background: connError ? "rgba(234, 179, 8, 0.15)" : "rgba(5, 173, 152, 0.15)",
                      color: connError ? "var(--warning, #f59e0b)" : "var(--signal-core)",
                      fontWeight: 600,
                    }}>
                      {connLoading ? "LOADING" : connError ? "OFFLINE" : "CONNECTED"}
                    </span>
                    <button
                      onClick={() => refresh(conn.id)}
                      style={{ ...monoStyle, fontSize: 12, padding: "4px 10px", border: "1px solid var(--border-dim)", borderRadius: 4, background: "none", cursor: "pointer" }}
                    >
                      REFRESH
                    </button>
                    <button
                      onClick={() => handleDisconnect(conn.id)}
                      style={{ ...monoStyle, fontSize: 12, padding: "4px 10px", border: "1px solid var(--fault)", color: "var(--fault)", borderRadius: 4, background: "none", cursor: "pointer" }}
                    >
                      DISCONNECT
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available brokers to connect */}
      <div style={{ ...headerStyle, fontSize: 12, marginBottom: 8 }}>
        {connections.length > 0 ? "Add Another Broker" : "Available Brokers"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {BROKER_REGISTRY.map((broker) => {
          const isExpanded = expandedBroker === broker.slug;
          const isComingSoon = broker.status === "coming_soon";
          const isSnapTrade = broker.slug === "snaptrade";

          return (
            <div
              key={broker.slug}
              style={{
                border: "1px solid var(--border-dim)",
                borderRadius: 4,
                padding: 16,
                background: "var(--bg-panel, #fff)",
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
                  {broker.isPaperAvailable && !isComingSoon && (
                    <span style={{ ...monoStyle, fontSize: 12, padding: "4px 10px", border: "1px solid var(--border-dim)", borderRadius: 999, color: "var(--text-secondary)" }}>
                      PAPER
                    </span>
                  )}
                  {isComingSoon ? (
                    <span style={{ ...monoStyle, fontSize: 12, padding: "4px 10px", background: "#f1f5f9", borderRadius: 999, color: "#94a3b8" }}>COMING SOON</span>
                  ) : isSnapTrade && !canUseSnapTrade ? (
                    <button
                      onClick={() => navigate("/pricing")}
                      style={{ ...monoStyle, fontSize: 12, padding: "6px 14px", border: "1px solid var(--warning, #f59e0b)", color: "var(--warning, #f59e0b)", borderRadius: 4, background: "none", cursor: "pointer" }}
                    >
                      UPGRADE TO PRO
                    </button>
                  ) : (
                    <button
                      onClick={() => setExpandedBroker(isExpanded ? null : broker.slug)}
                      style={{ ...monoStyle, fontSize: 13, padding: "6px 14px", border: "1px solid var(--signal-core)", color: "var(--signal-core)", borderRadius: 4, background: "none", cursor: "pointer" }}
                    >
                      {isExpanded ? "CANCEL" : connections.length > 0 ? "ADD" : "CONNECT"}
                    </button>
                  )}
                </div>
              </div>

              {/* SnapTrade — Connection Portal flow (no credential fields) */}
              {isExpanded && isSnapTrade && !isComingSoon && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-dim)", textAlign: "center" }}>
                  <button
                    onClick={handleSnapTradeConnect}
                    disabled={snapTradeLoading || isAnyLoading}
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
                    {snapTradeLoading ? "OPENING PORTAL..." : connectedSlugs.has("snaptrade") ? "ADD ANOTHER ACCOUNT" : "CONNECT YOUR BROKER"}
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
                    disabled={isAnyLoading}
                    style={{ marginTop: 12, ...monoStyle, fontSize: 13, padding: "8px 24px", background: "var(--signal-core)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                  >
                    {isAnyLoading ? "CONNECTING..." : "TEST & CONNECT"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
