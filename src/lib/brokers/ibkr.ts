import type { BrokerConnection, BrokerAccount, BrokerPosition, BrokerOrder, OrderRequest } from "./types";

/**
 * IBKR broker — delegates to Radon FastAPI backend.
 * Requires Radon running locally (localhost:8321 + ws://localhost:8765).
 */
export class IBKRBroker implements BrokerConnection {
  name = "Interactive Brokers";
  slug = "ibkr";
  icon = "🏦";
  isConnected = false;
  isPaperAvailable = true;

  private apiUrl = "http://localhost:8321";

  private async request<T>(path: string): Promise<T> {
    const res = await fetch(`${this.apiUrl}${path}`);
    if (!res.ok) throw new Error(`IBKR ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async connect(credentials: Record<string, string>): Promise<void> {
    if (credentials.apiUrl) this.apiUrl = credentials.apiUrl;
    const health = await this.request<{ ib_gateway?: { port_listening?: boolean } }>("/health");
    if (!health.ib_gateway?.port_listening) {
      throw new Error("IB Gateway not running. Start it and approve 2FA.");
    }
    this.isConnected = true;
  }

  disconnect(): void {
    this.isConnected = false;
  }

  async getAccount(): Promise<BrokerAccount> {
    const data = await this.request<{
      bankroll?: number;
      total_value?: number;
      cash?: number;
    }>("/portfolio/sync");
    return {
      id: "ibkr-local",
      broker: "ibkr",
      equity: data.total_value ?? 0,
      buyingPower: data.cash ?? 0,
      cash: data.cash ?? 0,
      portfolioValue: data.total_value ?? 0,
      isPaperTrading: false,
    };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    const data = await this.request<{
      positions?: Array<{
        ticker?: string;
        symbol?: string;
        quantity?: number;
        avg_cost?: number;
        market_price?: number;
        market_value?: number;
        unrealized_pnl?: number;
        asset_type?: string;
      }>;
    }>("/portfolio/sync");

    return (data.positions ?? []).map((p) => ({
      symbol: p.ticker ?? p.symbol ?? "",
      qty: Math.abs(p.quantity ?? 0),
      side: (p.quantity ?? 0) >= 0 ? "long" as const : "short" as const,
      avgEntryPrice: p.avg_cost ?? 0,
      currentPrice: p.market_price ?? 0,
      marketValue: p.market_value ?? 0,
      unrealizedPL: p.unrealized_pnl ?? 0,
      unrealizedPLPercent: p.avg_cost ? ((p.market_price ?? 0) - p.avg_cost) / p.avg_cost * 100 : 0,
      assetType: (p.asset_type === "OPT" ? "option" : "stock") as BrokerPosition["assetType"],
    }));
  }

  async getOrders(): Promise<BrokerOrder[]> {
    const data = await this.request<{
      orders?: Array<{
        orderId?: string;
        symbol?: string;
        action?: string;
        orderType?: string;
        totalQuantity?: number;
        lmtPrice?: number;
        status?: string;
        filledQuantity?: number;
        avgFillPrice?: number;
      }>;
    }>("/orders/refresh");

    return (data.orders ?? []).map((o) => ({
      id: String(o.orderId ?? ""),
      symbol: o.symbol ?? "",
      side: (o.action === "BUY" ? "buy" : "sell") as "buy" | "sell",
      type: mapIBOrderType(o.orderType ?? ""),
      qty: o.totalQuantity ?? 0,
      limitPrice: o.lmtPrice,
      status: mapIBStatus(o.status ?? ""),
      filledQty: o.filledQuantity,
      filledAvgPrice: o.avgFillPrice,
      createdAt: new Date().toISOString(),
    }));
  }

  async placeOrder(order: OrderRequest): Promise<BrokerOrder> {
    const res = await fetch(`${this.apiUrl}/orders/place`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: order.symbol,
        action: order.side.toUpperCase(),
        order_type: order.type.toUpperCase(),
        quantity: order.qty,
        limit_price: order.limitPrice,
        tif: order.timeInForce.toUpperCase(),
      }),
    });
    if (!res.ok) throw new Error(`IBKR order failed: ${await res.text()}`);
    const data = await res.json();
    return {
      id: String(data.orderId ?? ""),
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      qty: order.qty,
      limitPrice: order.limitPrice,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  }

  async cancelOrder(orderId: string): Promise<void> {
    await fetch(`${this.apiUrl}/orders/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId }),
    });
  }
}

function mapIBOrderType(t: string): BrokerOrder["type"] {
  switch (t.toUpperCase()) {
    case "MKT": return "market";
    case "LMT": return "limit";
    case "STP": return "stop";
    case "STP LMT": return "stop_limit";
    default: return "market";
  }
}

function mapIBStatus(s: string): BrokerOrder["status"] {
  switch (s) {
    case "Submitted":
    case "PreSubmitted": return "pending";
    case "Filled": return "filled";
    case "Cancelled": return "cancelled";
    case "Inactive": return "rejected";
    default: return "pending";
  }
}
