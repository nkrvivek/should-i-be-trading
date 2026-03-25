import { useEffect, useState } from "react";
import { TerminalShell } from "../components/layout/TerminalShell";
import { useBrokerStore } from "../stores/brokerStore";
import { useTradeJournal } from "../hooks/useTradeJournal";
import FlowAnalysisPanel from "../components/trading/FlowAnalysisPanel";
import StrategySuggester from "../components/trading/StrategySuggester";
import type { OrderRequest } from "../lib/brokers/types";

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

export default function TradingPage() {
  const { account, positions, orders, loading, error, activeBroker, placeOrder, cancelOrder, refresh, reconnect } = useBrokerStore();
  const [tab, setTab] = useState<"portfolio" | "orders" | "journal" | "strategies" | "flow">("portfolio");

  // Auto-reconnect when broker slug is saved but instance isn't connected yet (page reload)
  useEffect(() => {
    if (activeBroker && !account && !loading) {
      reconnect();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TerminalShell>
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ ...monoStyle, fontSize: 24, fontWeight: 700 }}>TRADING</h1>
        {activeBroker && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ ...monoStyle, fontSize: 13, color: "var(--signal-core, #05AD98)" }}>
              {activeBroker.toUpperCase()} CONNECTED
              {account?.isPaperTrading && " (PAPER)"}
            </span>
            <button onClick={refresh} style={{ ...monoStyle, fontSize: 13, padding: "4px 12px", border: "1px solid var(--border-dim)", borderRadius: 4, background: "none", cursor: "pointer" }}>
              REFRESH
            </button>
          </div>
        )}
      </div>

      {!activeBroker ? (
        <NoBrokerConnected />
      ) : (
        <>
          {/* Account Summary */}
          {account && <AccountSummary account={account} />}
          {error && <div style={{ ...panelStyle, background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" }}>{error}</div>}

          {/* Tab Navigation */}
          <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "1px solid var(--border-dim)" }}>
            {(["portfolio", "orders", "flow", "journal", "strategies"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  ...monoStyle,
                  fontSize: 14,
                  padding: "8px 20px",
                  border: "none",
                  borderBottom: tab === t ? "2px solid var(--signal-core)" : "2px solid transparent",
                  background: "none",
                  color: tab === t ? "var(--signal-core)" : "var(--text-secondary)",
                  cursor: "pointer",
                  fontWeight: tab === t ? 600 : 400,
                  textTransform: "uppercase",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {loading && <div style={{ textAlign: "center", padding: 32, color: "var(--text-secondary)" }}>Loading...</div>}

          {tab === "portfolio" && <PositionsTable positions={positions} />}
          {tab === "orders" && <OrdersPanel orders={orders} onCancel={cancelOrder} onPlace={placeOrder} />}
          {tab === "flow" && <FlowAnalysisPanel />}
          {tab === "journal" && <JournalPanel />}
          {tab === "strategies" && <StrategiesPanel positions={positions} />}
        </>
      )}
    </div>
    </TerminalShell>
  );
}

function NoBrokerConnected() {
  return (
    <div style={{ ...panelStyle, textAlign: "center", padding: 64 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
      <h2 style={{ ...headerStyle, fontSize: 16 }}>Connect a Brokerage</h2>
      <p style={{ color: "var(--text-secondary)", marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
        Connect your brokerage account in Settings to view your portfolio, place orders, and get personalized strategy recommendations.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        {["Alpaca", "Interactive Brokers", "Schwab", "Robinhood"].map((b) => (
          <span key={b} style={{ ...monoStyle, fontSize: 13, padding: "6px 14px", border: "1px solid var(--border-dim)", borderRadius: 999, color: "var(--text-secondary)" }}>
            {b}
          </span>
        ))}
      </div>
      <a href="/settings" style={{ display: "inline-block", marginTop: 24, ...monoStyle, fontSize: 14, color: "var(--signal-core)", textDecoration: "none" }}>
        Go to Settings →
      </a>
    </div>
  );
}

function AccountSummary({ account }: { account: import("../lib/brokers/types").BrokerAccount }) {
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
      {[
        { label: "EQUITY", value: fmt(account.equity) },
        { label: "BUYING POWER", value: fmt(account.buyingPower) },
        { label: "CASH", value: fmt(account.cash) },
        { label: "PORTFOLIO VALUE", value: fmt(account.portfolioValue) },
      ].map((m) => (
        <div key={m.label} style={panelStyle}>
          <div style={headerStyle}>{m.label}</div>
          <div style={{ ...monoStyle, fontSize: 20, fontWeight: 700 }}>{m.value}</div>
        </div>
      ))}
    </div>
  );
}

function PositionsTable({ positions }: { positions: import("../lib/brokers/types").BrokerPosition[] }) {
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

  if (!positions.length) {
    return <div style={{ ...panelStyle, textAlign: "center", color: "var(--text-secondary)", padding: 32 }}>No open positions</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", ...monoStyle, fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
            {["Symbol", "Side", "Qty", "Avg Entry", "Current", "Mkt Value", "P&L", "P&L %"].map((h) => (
              <th key={h} style={{ ...headerStyle, padding: "8px 12px", textAlign: "right", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => (
            <tr key={p.symbol} style={{ borderBottom: "1px solid var(--border-dim)" }}>
              <td style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right" }}>{p.symbol}</td>
              <td style={{ padding: "8px 12px", textAlign: "right", color: p.side === "long" ? "var(--signal-core)" : "var(--fault, #E85D6C)" }}>{p.side.toUpperCase()}</td>
              <td style={{ padding: "8px 12px", textAlign: "right" }}>{p.qty}</td>
              <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmt(p.avgEntryPrice)}</td>
              <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmt(p.currentPrice)}</td>
              <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmt(p.marketValue)}</td>
              <td style={{ padding: "8px 12px", textAlign: "right", color: p.unrealizedPL >= 0 ? "var(--signal-core)" : "var(--fault)" }}>{fmt(p.unrealizedPL)}</td>
              <td style={{ padding: "8px 12px", textAlign: "right", color: p.unrealizedPLPercent >= 0 ? "var(--signal-core)" : "var(--fault)" }}>{pct(p.unrealizedPLPercent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrdersPanel({ orders, onCancel, onPlace }: {
  orders: import("../lib/brokers/types").BrokerOrder[];
  onCancel: (id: string) => Promise<void>;
  onPlace: (order: OrderRequest) => Promise<import("../lib/brokers/types").BrokerOrder>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<OrderRequest["type"]>("market");
  const [qty, setQty] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [tif, setTif] = useState<OrderRequest["timeInForce"]>("day");
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState("");

  const handlePlace = async () => {
    if (!symbol || !qty) return;
    setPlacing(true);
    setOrderError("");
    try {
      await onPlace({
        symbol: symbol.toUpperCase(),
        side,
        type: orderType,
        qty: parseInt(qty),
        limitPrice: limitPrice ? parseFloat(limitPrice) : undefined,
        timeInForce: tif,
      });
      setSymbol("");
      setQty("");
      setLimitPrice("");
      setShowForm(false);
    } catch (e) {
      setOrderError(e instanceof Error ? e.message : "Order failed");
    }
    setPlacing(false);
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const inputStyle: React.CSSProperties = { ...monoStyle, fontSize: 14, padding: "6px 10px", border: "1px solid var(--border-dim)", borderRadius: 4, background: "var(--bg-panel-raised, #f8fafc)", width: "100%" };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={headerStyle}>Recent Orders</span>
        <button onClick={() => setShowForm(!showForm)} style={{ ...monoStyle, fontSize: 13, padding: "4px 14px", background: "var(--signal-core)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
          {showForm ? "CANCEL" : "NEW ORDER"}
        </button>
      </div>

      {showForm && (
        <div style={{ ...panelStyle, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
          <div><label style={{ ...headerStyle, fontSize: 12 }}>Symbol</label><input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="AAPL" style={inputStyle} /></div>
          <div><label style={{ ...headerStyle, fontSize: 12 }}>Side</label><select value={side} onChange={(e) => setSide(e.target.value as "buy" | "sell")} style={selectStyle}><option value="buy">BUY</option><option value="sell">SELL</option></select></div>
          <div><label style={{ ...headerStyle, fontSize: 12 }}>Type</label><select value={orderType} onChange={(e) => setOrderType(e.target.value as OrderRequest["type"])} style={selectStyle}><option value="market">Market</option><option value="limit">Limit</option><option value="stop">Stop</option></select></div>
          <div><label style={{ ...headerStyle, fontSize: 12 }}>Qty</label><input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="100" type="number" style={inputStyle} /></div>
          {orderType !== "market" && (
            <div><label style={{ ...headerStyle, fontSize: 12 }}>Price</label><input value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} placeholder="150.00" type="number" step="0.01" style={inputStyle} /></div>
          )}
          <div><label style={{ ...headerStyle, fontSize: 12 }}>TIF</label><select value={tif} onChange={(e) => setTif(e.target.value as OrderRequest["timeInForce"])} style={selectStyle}><option value="day">DAY</option><option value="gtc">GTC</option></select></div>
          <button onClick={handlePlace} disabled={placing} style={{ ...monoStyle, fontSize: 13, padding: "6px 20px", background: side === "buy" ? "var(--signal-core)" : "var(--fault)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", height: 32 }}>
            {placing ? "..." : "SUBMIT"}
          </button>
          {orderError && <div style={{ gridColumn: "1/-1", color: "var(--fault)", fontSize: 13 }}>{orderError}</div>}
        </div>
      )}

      {!orders.length ? (
        <div style={{ ...panelStyle, textAlign: "center", color: "var(--text-secondary)", padding: 32 }}>No orders</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", ...monoStyle, fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
              {["Symbol", "Side", "Type", "Qty", "Price", "Status", "Filled", ""].map((h) => (
                <th key={h} style={{ ...headerStyle, padding: "8px 12px", textAlign: "right" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 20).map((o) => (
              <tr key={o.id} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                <td style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right" }}>{o.symbol}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", color: o.side === "buy" ? "var(--signal-core)" : "var(--fault)" }}>{o.side.toUpperCase()}</td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>{o.type}</td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>{o.qty}</td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>{o.limitPrice ? fmt(o.limitPrice) : "MKT"}</td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, background: o.status === "filled" ? "#dcfce7" : o.status === "rejected" ? "#fef2f2" : "#f1f5f9", color: o.status === "filled" ? "#16a34a" : o.status === "rejected" ? "#dc2626" : "#64748b" }}>
                    {o.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>{o.filledQty ?? 0}/{o.qty}</td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>
                  {o.status === "pending" && (
                    <button onClick={() => onCancel(o.id)} style={{ ...monoStyle, fontSize: 12, padding: "2px 8px", border: "1px solid var(--fault)", color: "var(--fault)", borderRadius: 4, background: "none", cursor: "pointer" }}>CANCEL</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function JournalPanel() {
  const { entries, stats, closeTrade, deleteTrade } = useTradeJournal();
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { label: "TOTAL TRADES", value: String(stats.totalTrades) },
          { label: "WIN RATE", value: `${stats.winRate.toFixed(0)}%`, color: stats.winRate >= 50 ? "var(--signal-core)" : "var(--fault)" },
          { label: "AVG P&L", value: fmt(stats.avgPnl), color: stats.avgPnl >= 0 ? "var(--signal-core)" : "var(--fault)" },
          { label: "TOTAL P&L", value: fmt(stats.totalPnl), color: stats.totalPnl >= 0 ? "var(--signal-core)" : "var(--fault)" },
        ].map((m) => (
          <div key={m.label} style={panelStyle}>
            <div style={headerStyle}>{m.label}</div>
            <div style={{ ...monoStyle, fontSize: 18, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {!entries.length ? (
        <div style={{ ...panelStyle, textAlign: "center", color: "var(--text-secondary)", padding: 32 }}>
          No trades logged yet. Trades will be recorded automatically when you execute through a connected brokerage, or add them manually.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", ...monoStyle, fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
              {["Date", "Ticker", "Strategy", "Dir", "Entry", "Exit", "P&L", "Score", "Status", ""].map((h) => (
                <th key={h} style={{ ...headerStyle, padding: "8px 10px", textAlign: "right" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{new Date(e.date).toLocaleDateString()}</td>
                <td style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>{e.ticker}</td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{e.strategy}</td>
                <td style={{ padding: "8px 10px", textAlign: "right", color: e.direction === "bullish" ? "var(--signal-core)" : "var(--fault)" }}>{e.direction}</td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmt(e.entry.price)}</td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{e.exit ? fmt(e.exit.price) : "---"}</td>
                <td style={{ padding: "8px 10px", textAlign: "right", color: (e.pnl ?? 0) >= 0 ? "var(--signal-core)" : "var(--fault)" }}>
                  {e.pnl != null ? `${fmt(e.pnl)} (${pct(e.pnlPercent ?? 0)})` : "---"}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>{e.marketScoreAtEntry}/100</td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, background: e.status === "open" ? "#dbeafe" : e.status === "closed" ? "#dcfce7" : "#f1f5f9", color: e.status === "open" ? "#2563eb" : e.status === "closed" ? "#16a34a" : "#64748b" }}>
                    {e.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right", display: "flex", gap: 4 }}>
                  {e.status === "open" && (
                    <button onClick={() => { const p = prompt("Exit price?"); if (p) closeTrade(e.id, parseFloat(p)); }} style={{ ...monoStyle, fontSize: 12, padding: "2px 8px", border: "1px solid var(--signal-core)", color: "var(--signal-core)", borderRadius: 4, background: "none", cursor: "pointer" }}>CLOSE</button>
                  )}
                  <button onClick={() => deleteTrade(e.id)} style={{ ...monoStyle, fontSize: 12, padding: "2px 8px", border: "1px solid var(--fault)", color: "var(--fault)", borderRadius: 4, background: "none", cursor: "pointer" }}>DEL</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StrategiesPanel({ positions }: { positions: import("../lib/brokers/types").BrokerPosition[] }) {
  const ccEligible = positions.filter((p) => p.side === "long" && p.qty >= 100 && p.assetType === "stock");

  return (
    <div>
      {/* AI Strategy Suggester */}
      <StrategySuggester context={{ positions: positions.map((p) => ({ symbol: p.symbol, qty: p.qty, side: p.side, currentPrice: p.currentPrice, unrealizedPL: p.unrealizedPL })) }} />

      {/* Covered Call Opportunities */}
      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={headerStyle}>Covered Call Opportunities</span>
          <span style={{ ...monoStyle, fontSize: 12, color: "var(--text-secondary)" }}>{ccEligible.length} eligible positions (100+ shares)</span>
        </div>
        {!ccEligible.length ? (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 24, fontSize: 13 }}>
            No positions with 100+ shares. Buy stock first to sell covered calls.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", ...monoStyle, fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                {["Symbol", "Shares", "Current", "Suggested Strike", "Est. Premium", "Yield", "DTE"].map((h) => (
                  <th key={h} style={{ ...headerStyle, padding: "8px 10px", textAlign: "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ccEligible.map((p) => {
                const strike = Math.ceil(p.currentPrice * 1.05);
                const estPremium = p.currentPrice * 0.015;
                const contracts = Math.floor(p.qty / 100);
                return (
                  <tr key={p.symbol} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>{p.symbol}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{p.qty} ({contracts}x)</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>${p.currentPrice.toFixed(2)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>${strike}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--signal-core)" }}>${(estPremium * contracts * 100).toFixed(0)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{((estPremium / p.currentPrice) * 100).toFixed(1)}%</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>30</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Cash-Secured Put Opportunities */}
      <div style={panelStyle}>
        <div style={headerStyle}>Cash-Secured Put Opportunities</div>
        <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 24, fontSize: 13 }}>
          CSP recommendations appear here based on your watchlist, insider signals, and available buying power. Connect a brokerage and add tickers to your watchlist to get started.
        </div>
      </div>

      {/* Wash Sale Monitor */}
      <div style={panelStyle}>
        <div style={headerStyle}>Wash Sale Monitor</div>
        <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 24, fontSize: 13 }}>
          Scans your trade history for wash sale violations (30-day window). Connect a brokerage with trade history to activate.
        </div>
      </div>
    </div>
  );
}
