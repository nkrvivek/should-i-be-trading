import type { OpenOrder } from "../../api/types";
import { fmtUsdExact } from "../../lib/format";
import { Th } from "../shared/TableHeader";
import { SkeletonRows } from "../shared/SkeletonRows";

type Props = {
  orders: OpenOrder[];
  loading?: boolean;
};

export function OrdersPanel({ orders, loading }: Props) {
  if (loading && orders.length === 0) {
    return <SkeletonRows rows={3} columns={[{ width: 40 }, { width: 60 }, { width: "flex" }]} />;
  }

  if (orders.length === 0) {
    return (
      <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
        No open orders
      </div>
    );
  }

  return (
    <div style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
            <Th>ID</Th>
            <Th>Symbol</Th>
            <Th>Side</Th>
            <Th>Type</Th>
            <Th align="right">Qty</Th>
            <Th align="right">Limit</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.orderId} style={{ borderBottom: "1px solid var(--border-dim)", height: 28 }}>
              <td style={{ padding: "0 8px", color: "var(--text-muted)" }}>{o.orderId}</td>
              <td style={{ padding: "0 8px", fontWeight: 500 }}>{o.symbol}</td>
              <td style={{ padding: "0 8px", color: o.action === "BUY" ? "var(--positive)" : "var(--negative)" }}>
                {o.action}
              </td>
              <td style={{ padding: "0 8px", color: "var(--text-secondary)" }}>{o.orderType}</td>
              <td style={{ padding: "0 8px", textAlign: "right" }}>{o.totalQuantity}</td>
              <td style={{ padding: "0 8px", textAlign: "right" }}>{o.limitPrice != null ? fmtUsdExact(o.limitPrice) : "MKT"}</td>
              <td style={{ padding: "0 8px" }}>
                <span style={{ color: o.status === "Filled" ? "var(--positive)" : o.status === "Cancelled" ? "var(--negative)" : "var(--warning)" }}>
                  {o.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}