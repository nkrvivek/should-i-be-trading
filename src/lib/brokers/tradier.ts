import type { BrokerConnection, BrokerAccount, BrokerPosition, BrokerOrder, OrderRequest, OptionChainEntry } from "./types";
import { getEdgeHeaders } from "../../api/edgeHeaders";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";

export class TradierBroker implements BrokerConnection {
  name = "Tradier";
  slug = "tradier";
  icon = "📈";
  isConnected = false;
  isPaperAvailable = true;

  private apiToken = "";
  private mode: "paper" | "live" = "paper";
  private accountId = "";

  private async request(
    endpoint: string,
    params?: Record<string, string>,
    method = "GET",
    orderParams?: Record<string, string>,
  ) {
    const headers = await getEdgeHeaders();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/broker-tradier`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint,
        accountId: this.accountId,
        apiToken: this.apiToken,
        mode: this.mode,
        params,
        method,
        orderParams,
      }),
    });
    if (!res.ok) throw new Error(`Tradier ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async connect(credentials: Record<string, string>): Promise<void> {
    this.apiToken = credentials.apiToken || "";
    this.mode = credentials.mode === "live" ? "live" : "paper";

    // Fetch profile to get account number
    const data = await this.request("user/profile");
    const profile = data.profile;
    if (!profile?.account) throw new Error("Could not retrieve Tradier account");

    // Tradier returns object if single account, array if multiple
    const accounts = Array.isArray(profile.account) ? profile.account : [profile.account];
    if (accounts.length === 0) throw new Error("No Tradier accounts found");

    this.accountId = accounts[0].account_number;
    this.isConnected = true;
  }

  disconnect(): void {
    this.apiToken = "";
    this.accountId = "";
    this.isConnected = false;
  }

  async getAccount(): Promise<BrokerAccount> {
    const data = await this.request("accounts/{id}/balances");
    const b = data.balances;
    if (!b) throw new Error("Could not retrieve Tradier balances");

    return {
      id: this.accountId,
      broker: "tradier",
      equity: b.total_equity ?? b.equity ?? 0,
      buyingPower: b.buying_power ?? b.option_buying_power ?? 0,
      cash: b.total_cash ?? b.cash?.cash_available ?? 0,
      portfolioValue: b.market_value ?? b.total_equity ?? 0,
      isPaperTrading: this.mode === "paper",
    };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    const data = await this.request("accounts/{id}/positions");

    // Tradier returns "null" string or { position: [...] } or { position: {...} }
    if (!data.positions || data.positions === "null") return [];
    const raw = data.positions.position;
    if (!raw) return [];

    const positions = Array.isArray(raw) ? raw : [raw];

    return positions.map((p: {
      symbol: string;
      quantity: number;
      cost_basis: number;
      date_acquired?: string;
    }) => {
      const qty = Math.abs(p.quantity);
      const costBasis = Math.abs(p.cost_basis);
      const avgEntry = qty > 0 ? costBasis / qty : 0;
      // Tradier positions don't include current price; set to 0 until a quote refresh
      const isOption = p.symbol.length > 6; // OCC option symbols are longer

      return {
        symbol: p.symbol,
        qty,
        side: (p.quantity >= 0 ? "long" : "short") as "long" | "short",
        avgEntryPrice: avgEntry,
        currentPrice: 0,
        marketValue: costBasis,
        unrealizedPL: 0,
        unrealizedPLPercent: 0,
        assetType: (isOption ? "option" : "stock") as BrokerPosition["assetType"],
      };
    });
  }

  async getOrders(status?: string): Promise<BrokerOrder[]> {
    const data = await this.request("accounts/{id}/orders");

    if (!data.orders || data.orders === "null") return [];
    const raw = data.orders.order;
    if (!raw) return [];

    const orders = Array.isArray(raw) ? raw : [raw];

    return orders
      .filter((o: { status: string }) => !status || o.status.toLowerCase() === status)
      .map((o: {
        id: number;
        symbol: string;
        side: string;
        type: string;
        quantity: number;
        price?: number;
        stop_price?: number;
        status: string;
        exec_quantity?: number;
        avg_fill_price?: number;
        create_date: string;
        option_symbol?: string;
        class?: string;
      }) => ({
        id: String(o.id),
        symbol: o.option_symbol ?? o.symbol,
        side: mapTradierSide(o.side),
        type: mapTradierOrderType(o.type),
        qty: o.quantity,
        limitPrice: o.price ?? undefined,
        stopPrice: o.stop_price ?? undefined,
        status: mapTradierStatus(o.status),
        filledQty: o.exec_quantity,
        filledAvgPrice: o.avg_fill_price ?? undefined,
        createdAt: o.create_date,
      }));
  }

  async placeOrder(order: OrderRequest): Promise<BrokerOrder> {
    const orderParams: Record<string, string> = {
      class: "equity",
      symbol: order.symbol,
      side: order.side === "buy" ? "buy" : "sell",
      quantity: order.qty.toString(),
      type: order.type,
      duration: order.timeInForce === "gtc" ? "gtc" : "day",
    };
    if (order.limitPrice) orderParams.price = order.limitPrice.toString();
    if (order.stopPrice) orderParams.stop = order.stopPrice.toString();

    const data = await this.request("accounts/{id}/orders", undefined, "POST", orderParams);
    const o = data.order;

    return {
      id: String(o?.id ?? ""),
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      qty: order.qty,
      limitPrice: order.limitPrice,
      stopPrice: order.stopPrice,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.request(`accounts/{id}/orders/${orderId}`, undefined, "DELETE");
  }

  async getOptionChain(symbol: string, expiration?: string): Promise<OptionChainEntry[]> {
    const params: Record<string, string> = { symbol, greeks: "true" };
    if (expiration) params.expiration = expiration;

    const data = await this.request("markets/options/chains", params);

    if (!data.options || data.options === "null") return [];
    const raw = data.options.option;
    if (!raw) return [];

    const options = Array.isArray(raw) ? raw : [raw];

    return options.map((o: {
      symbol: string;
      strike: number;
      expiration_date: string;
      option_type: string;
      bid: number;
      ask: number;
      last: number;
      volume: number;
      open_interest: number;
      greeks?: {
        delta: number;
        gamma: number;
        theta: number;
        vega: number;
        mid_iv: number;
      };
    }) => ({
      symbol: o.symbol,
      underlying: symbol,
      strike: o.strike,
      expiration: o.expiration_date,
      optionType: (o.option_type === "call" ? "call" : "put") as "call" | "put",
      bid: o.bid ?? 0,
      ask: o.ask ?? 0,
      last: o.last ?? 0,
      volume: o.volume ?? 0,
      openInterest: o.open_interest ?? 0,
      impliedVol: o.greeks?.mid_iv ?? 0,
      delta: o.greeks?.delta ?? 0,
      gamma: o.greeks?.gamma ?? 0,
      theta: o.greeks?.theta ?? 0,
      vega: o.greeks?.vega ?? 0,
    }));
  }
}

function mapTradierSide(side: string): "buy" | "sell" {
  return side.toLowerCase().includes("buy") ? "buy" : "sell";
}

function mapTradierOrderType(type: string): BrokerOrder["type"] {
  switch (type.toLowerCase()) {
    case "market": return "market";
    case "limit": return "limit";
    case "stop": return "stop";
    case "stop_limit": return "stop_limit";
    default: return "market";
  }
}

function mapTradierStatus(status: string): BrokerOrder["status"] {
  switch (status.toLowerCase()) {
    case "pending":
    case "open":
    case "partially_filled":
      return status.toLowerCase() === "partially_filled" ? "partial" : "pending";
    case "filled": return "filled";
    case "expired":
    case "canceled": return "cancelled";
    case "rejected": return "rejected";
    default: return "pending";
  }
}
