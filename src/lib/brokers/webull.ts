import type {
  BrokerConnection, BrokerAccount, BrokerPosition, BrokerOrder,
  OrderRequest, OptionChainEntry,
} from "./types";
import { getEdgeHeaders } from "../../api/edgeHeaders";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export class WebullBroker implements BrokerConnection {
  name = "Webull";
  slug = "webull";
  icon = "🐂";
  isConnected = false;
  isPaperAvailable = true;

  private appKey = "";
  private accessToken = "";
  private mode: "live" | "paper" = "paper";
  private accountId = "";

  private async request<T>(
    endpoint: string,
    params?: Record<string, string>,
    method = "GET",
    body?: unknown,
  ): Promise<T> {
    const headers = await getEdgeHeaders();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/broker-webull`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint,
        appKey: this.appKey,
        accessToken: this.accessToken,
        mode: this.mode === "paper" ? "test" : undefined,
        params,
        method,
        body,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Webull ${res.status}: ${err}`);
    }
    return res.json();
  }

  async connect(credentials: Record<string, string>): Promise<void> {
    this.appKey = credentials.appKey || "";
    this.accessToken = credentials.accessToken || "";
    this.mode = credentials.mode === "live" ? "live" : "paper";

    // Validate by fetching account list
    const data = await this.request<{
      accounts?: Array<{ accountId: string; accountType?: string }>;
      data?: Array<{ accountId: string; accountType?: string }>;
    }>("trade/account/list");

    const accounts = data.accounts ?? data.data ?? [];
    if (accounts.length === 0) throw new Error("No Webull accounts found");

    this.accountId = accounts[0].accountId;
    this.isConnected = true;
  }

  disconnect(): void {
    this.appKey = "";
    this.accessToken = "";
    this.accountId = "";
    this.isConnected = false;
  }

  async getAccount(): Promise<BrokerAccount> {
    const data = await this.request<{
      accountId?: string;
      totalMarketValue?: number;
      netLiquidation?: number;
      buyingPower?: number;
      cashBalance?: number;
      totalCash?: number;
      equity?: number;
    }>(`trade/account/${this.accountId}`);

    return {
      id: data.accountId ?? this.accountId,
      broker: "webull",
      equity: data.netLiquidation ?? data.equity ?? 0,
      buyingPower: data.buyingPower ?? 0,
      cash: data.cashBalance ?? data.totalCash ?? 0,
      portfolioValue: data.totalMarketValue ?? data.netLiquidation ?? 0,
      isPaperTrading: this.mode === "paper",
    };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    const data = await this.request<{
      positions?: Array<{
        ticker?: { symbol?: string; tickerId?: string };
        symbol?: string;
        quantity?: number;
        position?: string;
        costPrice?: number;
        lastPrice?: number;
        marketValue?: number;
        unrealizedProfitLoss?: number;
        unrealizedProfitLossRate?: number;
        assetType?: string;
      }>;
      data?: Array<{
        ticker?: { symbol?: string; tickerId?: string };
        symbol?: string;
        quantity?: number;
        position?: string;
        costPrice?: number;
        lastPrice?: number;
        marketValue?: number;
        unrealizedProfitLoss?: number;
        unrealizedProfitLossRate?: number;
        assetType?: string;
      }>;
    }>(`trade/account/${this.accountId}/positions`);

    const positions = data.positions ?? data.data ?? [];
    return positions.map((p) => ({
      symbol: p.ticker?.symbol ?? p.symbol ?? "",
      qty: Math.abs(p.quantity ?? 0),
      side: (p.position === "SHORT" ? "short" : "long") as "long" | "short",
      avgEntryPrice: p.costPrice ?? 0,
      currentPrice: p.lastPrice ?? 0,
      marketValue: p.marketValue ?? 0,
      unrealizedPL: p.unrealizedProfitLoss ?? 0,
      unrealizedPLPercent: (p.unrealizedProfitLossRate ?? 0) * 100,
      assetType: mapWebullAssetType(p.assetType),
    }));
  }

  async getOrders(status?: string): Promise<BrokerOrder[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;

    const data = await this.request<{
      orders?: WebullOrderResponse[];
      data?: WebullOrderResponse[];
    }>("trade/orders", params);

    const orders = data.orders ?? data.data ?? [];
    return orders.map((o) => ({
      id: String(o.orderId ?? o.orders_id ?? ""),
      symbol: o.ticker?.symbol ?? o.symbol ?? "",
      side: (o.action === "BUY" ? "buy" : "sell") as "buy" | "sell",
      type: mapWebullOrderType(o.orderType ?? ""),
      qty: o.totalQuantity ?? o.quantity ?? 0,
      limitPrice: o.lmtPrice ?? undefined,
      stopPrice: o.auxPrice ?? undefined,
      status: mapWebullStatus(o.status ?? o.statusStr ?? ""),
      filledQty: o.filledQuantity ?? 0,
      filledAvgPrice: o.avgFilledPrice ?? undefined,
      createdAt: o.createTime ?? new Date().toISOString(),
    }));
  }

  async placeOrder(order: OrderRequest): Promise<BrokerOrder> {
    const body = {
      accountId: this.accountId,
      symbol: order.symbol,
      action: order.side.toUpperCase(),
      orderType: mapToWebullOrderType(order.type),
      quantity: order.qty,
      timeInForce: order.timeInForce.toUpperCase(),
      lmtPrice: order.limitPrice,
      auxPrice: order.stopPrice,
    };

    const data = await this.request<{
      orderId?: string;
      orders_id?: string;
    }>("trade/place_order", undefined, "POST", body);

    return {
      id: String(data.orderId ?? data.orders_id ?? ""),
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
    await this.request(
      "trade/cancel_order",
      undefined,
      "DELETE",
      { accountId: this.accountId, orderId },
    );
  }

  async getOptionChain(symbol: string): Promise<OptionChainEntry[]> {
    const data = await this.request<{
      data?: Array<{
        call?: WebullOptionLeg;
        put?: WebullOptionLeg;
        expireDate?: string;
      }>;
      chains?: Array<{
        call?: WebullOptionLeg;
        put?: WebullOptionLeg;
        expireDate?: string;
      }>;
    }>("market/options/chains", { symbol, type: "equity" });

    const chains = data.data ?? data.chains ?? [];
    const entries: OptionChainEntry[] = [];

    for (const pair of chains) {
      const expiration = pair.expireDate ?? "";
      if (pair.call) entries.push(mapWebullOptionLeg(pair.call, symbol, "call", expiration));
      if (pair.put) entries.push(mapWebullOptionLeg(pair.put, symbol, "put", expiration));
    }

    return entries;
  }
}

// ── Webull response types ───────────────────────────────────────
interface WebullOrderResponse {
  orderId?: string;
  orders_id?: string;
  ticker?: { symbol?: string };
  symbol?: string;
  action?: string;
  orderType?: string;
  totalQuantity?: number;
  quantity?: number;
  lmtPrice?: number;
  auxPrice?: number;
  status?: string;
  statusStr?: string;
  filledQuantity?: number;
  avgFilledPrice?: number;
  createTime?: string;
}

interface WebullOptionLeg {
  symbol?: string;
  strikePrice?: number;
  bid?: number;
  ask?: number;
  last?: number;
  volume?: number;
  openInterest?: number;
  impVol?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

function mapWebullOptionLeg(
  leg: WebullOptionLeg,
  underlying: string,
  optionType: "call" | "put",
  expiration: string,
): OptionChainEntry {
  return {
    symbol: leg.symbol ?? "",
    underlying,
    strike: leg.strikePrice ?? 0,
    expiration,
    optionType,
    bid: leg.bid ?? 0,
    ask: leg.ask ?? 0,
    last: leg.last ?? 0,
    volume: leg.volume ?? 0,
    openInterest: leg.openInterest ?? 0,
    impliedVol: leg.impVol ?? 0,
    delta: leg.delta ?? 0,
    gamma: leg.gamma ?? 0,
    theta: leg.theta ?? 0,
    vega: leg.vega ?? 0,
  };
}

// ── Status/type mappers ─────────────────────────────────────────
function mapWebullAssetType(t?: string): BrokerPosition["assetType"] {
  if (!t) return "stock";
  const lower = t.toLowerCase();
  if (lower.includes("option")) return "option";
  if (lower.includes("crypto")) return "crypto";
  return "stock";
}

function mapWebullOrderType(t: string): BrokerOrder["type"] {
  switch (t.toUpperCase()) {
    case "MKT": return "market";
    case "LMT": return "limit";
    case "STP": return "stop";
    case "STP LMT": return "stop_limit";
    default: return "market";
  }
}

function mapToWebullOrderType(t: string): string {
  switch (t) {
    case "market": return "MKT";
    case "limit": return "LMT";
    case "stop": return "STP";
    case "stop_limit": return "STP LMT";
    default: return "MKT";
  }
}

function mapWebullStatus(s: string): BrokerOrder["status"] {
  const upper = s.toUpperCase();
  switch (upper) {
    case "PENDING":
    case "WORKING":
    case "SUBMITTED":
      return "pending";
    case "FILLED":
      return "filled";
    case "PARTIALLY_FILLED":
    case "PARTIAL":
      return "partial";
    case "CANCELLED":
    case "CANCELED":
    case "EXPIRED":
      return "cancelled";
    case "REJECTED":
    case "FAILED":
      return "rejected";
    default:
      return "pending";
  }
}
