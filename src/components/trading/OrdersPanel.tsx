import { useState } from "react";
import type { BrokerOrder, OrderRequest } from "../../lib/brokers/types";

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

export function OrdersPanel({ orders, onCancel, onPlace }: {
  orders: BrokerOrder[];
  onCancel: (id: string) => Promise<void>;
  onPlace: (order: OrderRequest) => Promise<BrokerOrder>;
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
  const showBrokerCol = orders.some((o) => o.brokerName);

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
              {[...(showBrokerCol ? ["Broker"] : []), "Symbol", "Side", "Type", "Qty", "Price", "Status", "Filled", ""].map((h) => (
                <th key={h} style={{ ...headerStyle, padding: "8px 12px", textAlign: "right" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 20).map((o) => (
              <tr key={`${o.brokerId}-${o.id}`} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                {showBrokerCol && (
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>
                    <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--bg-panel-raised, #f1f5f9)", color: "var(--text-muted)" }}>
                      {o.brokerName}
                    </span>
                  </td>
                )}
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
