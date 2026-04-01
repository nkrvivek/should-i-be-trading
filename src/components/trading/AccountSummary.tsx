import type { BrokerAccount } from "../../lib/brokers/types";
import type { BrokerConnection } from "../../stores/brokerStore";

const panelStyle: React.CSSProperties = {
  background: "var(--bg-panel, #fff)",
  border: "1px solid var(--border-dim, #e2e8f0)",
  borderRadius: 4,
  padding: 16,
  marginBottom: 16,
};

const headerStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase" as const,
  color: "var(--text-secondary, #64748b)",
  marginBottom: 12,
};

const monoStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
};

export function AccountSummary({ accounts, connections }: {
  accounts: BrokerAccount[];
  connections: BrokerConnection[];
}) {
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  const totals = accounts.reduce(
    (acc, a) => ({
      equity: acc.equity + a.equity,
      buyingPower: acc.buyingPower + a.buyingPower,
      cash: acc.cash + a.cash,
      portfolioValue: acc.portfolioValue + a.portfolioValue,
    }),
    { equity: 0, buyingPower: 0, cash: 0, portfolioValue: 0 },
  );

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: accounts.length > 1 ? 8 : 0 }}>
        {[
          { label: accounts.length > 1 ? "COMBINED EQUITY" : "EQUITY", value: fmt(totals.equity) },
          { label: "BUYING POWER", value: fmt(totals.buyingPower) },
          { label: "CASH", value: fmt(totals.cash) },
          { label: "PORTFOLIO VALUE", value: fmt(totals.portfolioValue) },
        ].map((m) => (
          <div key={m.label} style={panelStyle}>
            <div style={headerStyle}>{m.label}</div>
            <div style={{ ...monoStyle, fontSize: 20, fontWeight: 700 }}>{m.value}</div>
          </div>
        ))}
      </div>
      {accounts.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {accounts.map((a) => {
            const conn = connections.find((c) => c.id === a.brokerId);
            return (
              <div
                key={a.brokerId ?? a.id}
                style={{
                  ...monoStyle,
                  fontSize: 12,
                  padding: "6px 12px",
                  background: "var(--bg-panel-raised, #f8fafc)",
                  border: "1px solid var(--border-dim)",
                  borderRadius: 4,
                  color: "var(--text-secondary)",
                }}
              >
                {conn?.displayName ?? a.broker}: {fmt(a.equity)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
