import type { BrokerConnection, BrokerAccount, BrokerPosition, BrokerOrder, OrderRequest } from "./types";

const PAPER_BASE = "https://paper-api.alpaca.markets";
const LIVE_BASE = "https://api.alpaca.markets";

export class AlpacaBroker implements BrokerConnection {
  name = "Alpaca";
  slug = "alpaca";
  icon = "🦙";
  isConnected = false;
  isPaperAvailable = true;

  private apiKey = "";
  private secretKey = "";
  private isPaper = true;

  private get baseUrl() {
    return this.isPaper ? PAPER_BASE : LIVE_BASE;
  }

  private get headers() {
    return {
      "APCA-API-KEY-ID": this.apiKey,
      "APCA-API-SECRET-KEY": this.secretKey,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: { ...this.headers, ...options?.headers },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Alpaca ${res.status}: ${err}`);
    }
    return res.json();
  }

  async connect(credentials: Record<string, string>): Promise<void> {
    this.apiKey = credentials.apiKey || "";
    this.secretKey = credentials.secretKey || "";
    this.isPaper = credentials.mode !== "live";

    // Validate by fetching account
    await this.getAccount();
    this.isConnected = true;
  }

  disconnect(): void {
    this.apiKey = "";
    this.secretKey = "";
    this.isConnected = false;
  }

  async getAccount(): Promise<BrokerAccount> {
    const data = await this.request<{
      id: string;
      equity: string;
      buying_power: string;
      cash: string;
      portfolio_value: string;
      daytrade_count: number;
    }>("/v2/account");

    return {
      id: data.id,
      broker: "alpaca",
      equity: parseFloat(data.equity),
      buyingPower: parseFloat(data.buying_power),
      cash: parseFloat(data.cash),
      portfolioValue: parseFloat(data.portfolio_value),
      dayTradeCount: data.daytrade_count,
      isPaperTrading: this.isPaper,
    };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    const data = await this.request<Array<{
      symbol: string;
      qty: string;
      side: string;
      avg_entry_price: string;
      current_price: string;
      market_value: string;
      unrealized_pl: string;
      unrealized_plpc: string;
      asset_class: string;
    }>>("/v2/positions");

    return data.map((p) => ({
      symbol: p.symbol,
      qty: Math.abs(parseFloat(p.qty)),
      side: p.side === "long" ? "long" as const : "short" as const,
      avgEntryPrice: parseFloat(p.avg_entry_price),
      currentPrice: parseFloat(p.current_price),
      marketValue: parseFloat(p.market_value),
      unrealizedPL: parseFloat(p.unrealized_pl),
      unrealizedPLPercent: parseFloat(p.unrealized_plpc) * 100,
      assetType: p.asset_class === "crypto" ? "crypto" as const : "stock" as const,
    }));
  }

  async getOrders(status?: string): Promise<BrokerOrder[]> {
    const params = status ? `?status=${status}` : "?status=all&limit=50";
    const data = await this.request<Array<{
      id: string;
      symbol: string;
      side: string;
      type: string;
      qty: string;
      limit_price: string | null;
      stop_price: string | null;
      status: string;
      filled_qty: string;
      filled_avg_price: string | null;
      created_at: string;
    }>>(`/v2/orders${params}`);

    return data.map((o) => ({
      id: o.id,
      symbol: o.symbol,
      side: o.side as "buy" | "sell",
      type: o.type as BrokerOrder["type"],
      qty: parseFloat(o.qty),
      limitPrice: o.limit_price ? parseFloat(o.limit_price) : undefined,
      stopPrice: o.stop_price ? parseFloat(o.stop_price) : undefined,
      status: mapAlpacaStatus(o.status),
      filledQty: parseFloat(o.filled_qty),
      filledAvgPrice: o.filled_avg_price ? parseFloat(o.filled_avg_price) : undefined,
      createdAt: o.created_at,
    }));
  }

  async placeOrder(order: OrderRequest): Promise<BrokerOrder> {
    const body: Record<string, unknown> = {
      symbol: order.symbol,
      qty: order.qty.toString(),
      side: order.side,
      type: order.type,
      time_in_force: order.timeInForce,
    };
    if (order.limitPrice) body.limit_price = order.limitPrice.toString();
    if (order.stopPrice) body.stop_price = order.stopPrice.toString();

    const data = await this.request<{
      id: string;
      symbol: string;
      side: string;
      type: string;
      qty: string;
      limit_price: string | null;
      stop_price: string | null;
      status: string;
      filled_qty: string;
      filled_avg_price: string | null;
      created_at: string;
    }>("/v2/orders", { method: "POST", body: JSON.stringify(body) });

    return {
      id: data.id,
      symbol: data.symbol,
      side: data.side as "buy" | "sell",
      type: data.type as BrokerOrder["type"],
      qty: parseFloat(data.qty),
      limitPrice: data.limit_price ? parseFloat(data.limit_price) : undefined,
      stopPrice: data.stop_price ? parseFloat(data.stop_price) : undefined,
      status: mapAlpacaStatus(data.status),
      filledQty: parseFloat(data.filled_qty),
      filledAvgPrice: data.filled_avg_price ? parseFloat(data.filled_avg_price) : undefined,
      createdAt: data.created_at,
    };
  }

  async cancelOrder(orderId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/v2/orders/${orderId}`, {
      method: "DELETE",
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`Cancel failed: ${res.status}`);
  }

  async getTradeHistory(startDate: string, endDate: string): Promise<BrokerOrder[]> {
    const params = new URLSearchParams({
      after: startDate,
      until: endDate,
      status: "filled",
      limit: "500",
      direction: "desc",
    });
    return this.getOrders(`filled&${params.toString()}`);
  }
}

function mapAlpacaStatus(s: string): BrokerOrder["status"] {
  switch (s) {
    case "new":
    case "accepted":
    case "pending_new":
      return "pending";
    case "filled":
      return "filled";
    case "partially_filled":
      return "partial";
    case "canceled":
    case "expired":
    case "replaced":
      return "cancelled";
    case "rejected":
      return "rejected";
    default:
      return "pending";
  }
}
