import type { BrokerConnection, BrokerAccount, BrokerPosition, BrokerOrder, OrderRequest } from "./types";
import { getEdgeHeaders } from "../../api/edgeHeaders";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const CREDS_STORAGE_KEY = "sibt_snaptrade_creds";

interface SnapTradeCreds {
  userId: string;
  userSecret: string;
}

function loadSnapCreds(): SnapTradeCreds | null {
  try {
    const raw = localStorage.getItem(CREDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSnapCreds(creds: SnapTradeCreds) {
  localStorage.setItem(CREDS_STORAGE_KEY, JSON.stringify(creds));
}

function clearSnapCreds() {
  localStorage.removeItem(CREDS_STORAGE_KEY);
}

export class SnapTradeBroker implements BrokerConnection {
  name = "SnapTrade";
  slug = "snaptrade";
  icon = "🔗";
  isConnected = false;
  isPaperAvailable = false;

  private snapUserId = "";
  private snapUserSecret = "";
  private accountId = "";
  private accountIds: string[] = [];

  private async edgeCall(action: string, extra: Record<string, unknown> = {}): Promise<unknown> {
    const headers = await getEdgeHeaders();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/broker-snaptrade`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        userId: this.snapUserId,
        userSecret: this.snapUserSecret,
        ...extra,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SnapTrade ${res.status}: ${text}`);
    }
    return res.json();
  }

  async connect(credentials: Record<string, string>): Promise<void> {
    // If credentials provided (returning user via reconnect), use them
    if (credentials.snapUserId && credentials.snapUserSecret) {
      this.snapUserId = credentials.snapUserId;
      this.snapUserSecret = credentials.snapUserSecret;
    } else {
      // Check localStorage for saved creds
      const saved = loadSnapCreds();
      if (saved) {
        this.snapUserId = saved.userId;
        this.snapUserSecret = saved.userSecret;
      } else {
        // New user — register with SnapTrade
        const data = await this.edgeCall("register") as { userId: string; userSecret: string };
        this.snapUserId = data.userId;
        this.snapUserSecret = data.userSecret;
        saveSnapCreds({ userId: data.userId, userSecret: data.userSecret });
      }
    }

    // Fetch connected accounts
    const accounts = await this.edgeCall("listAccounts") as Array<{
      id: string;
      number: string;
      name: string;
    }>;

    if (!accounts || accounts.length === 0) {
      // No accounts connected yet — user needs the Connection Portal
      // Still mark as connected so they can use getConnectionPortalUrl()
      this.isConnected = true;
      return;
    }

    this.accountIds = accounts.map((a) => a.id);
    this.accountId = this.accountIds[0];
    this.isConnected = true;
  }

  disconnect(): void {
    this.snapUserId = "";
    this.snapUserSecret = "";
    this.accountId = "";
    this.accountIds = [];
    this.isConnected = false;
    clearSnapCreds();
  }

  async getConnectionPortalUrl(): Promise<string> {
    const data = await this.edgeCall("connectPortal") as { redirectURI: string };
    return data.redirectURI;
  }

  async getAccount(): Promise<BrokerAccount> {
    if (!this.accountId) {
      // No brokerage linked yet — return zeroed account
      return {
        id: "snaptrade-pending",
        broker: "snaptrade",
        equity: 0,
        buyingPower: 0,
        cash: 0,
        portfolioValue: 0,
        isPaperTrading: false,
      };
    }

    const data = await this.edgeCall("getBalances", { accountId: this.accountId }) as Array<{
      currency: { code: string };
      cash: number;
      buying_power?: number;
    }>;

    // SnapTrade balances returns an array of balance entries
    let cash = 0;
    let buyingPower = 0;
    if (Array.isArray(data)) {
      for (const b of data) {
        cash += b.cash ?? 0;
        buyingPower += b.buying_power ?? b.cash ?? 0;
      }
    }

    // Get positions to calculate portfolio value
    let positionsValue = 0;
    try {
      const positions = await this.getPositions();
      positionsValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
    } catch { /* positions may fail if account just connected */ }

    return {
      id: this.accountId,
      broker: "snaptrade",
      equity: cash + positionsValue,
      buyingPower,
      cash,
      portfolioValue: cash + positionsValue,
      isPaperTrading: false,
    };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    if (!this.accountId) return [];

    const data = await this.edgeCall("getPositions", { accountId: this.accountId }) as Array<{
      symbol?: { symbol?: { symbol?: string } };
      units: number;
      price: number;
      open_pnl: number;
      average_purchase_price: number;
    }>;

    if (!Array.isArray(data)) return [];

    return data.map((p) => {
      const symbol = p.symbol?.symbol?.symbol ?? "UNKNOWN";
      const qty = Math.abs(p.units ?? 0);
      const currentPrice = p.price ?? 0;
      const marketValue = qty * currentPrice;
      const avgEntry = p.average_purchase_price ?? 0;
      const unrealizedPL = p.open_pnl ?? 0;
      const costBasis = avgEntry * qty;
      const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;

      return {
        symbol,
        qty,
        side: (p.units >= 0 ? "long" : "short") as "long" | "short",
        avgEntryPrice: avgEntry,
        currentPrice,
        marketValue,
        unrealizedPL,
        unrealizedPLPercent,
        assetType: "stock" as const,
      };
    });
  }

  async getOrders(): Promise<BrokerOrder[]> {
    if (!this.accountId) return [];

    const data = await this.edgeCall("getOrders", { accountId: this.accountId }) as Array<{
      brokerage_order_id?: string;
      universal_symbol?: { symbol?: string };
      action?: string;
      type?: string;
      total_quantity?: number;
      limit_price?: number;
      stop_price?: number;
      status?: string;
      filled_quantity?: number;
      execution_price?: number;
      time_placed?: string;
    }>;

    if (!Array.isArray(data)) return [];

    return data.map((o) => ({
      id: o.brokerage_order_id ?? "",
      symbol: o.universal_symbol?.symbol ?? "UNKNOWN",
      side: mapSnapTradeSide(o.action),
      type: mapSnapTradeOrderType(o.type),
      qty: o.total_quantity ?? 0,
      limitPrice: o.limit_price ?? undefined,
      stopPrice: o.stop_price ?? undefined,
      status: mapSnapTradeStatus(o.status),
      filledQty: o.filled_quantity ?? undefined,
      filledAvgPrice: o.execution_price ?? undefined,
      createdAt: o.time_placed ?? new Date().toISOString(),
    }));
  }

  async placeOrder(_order: OrderRequest): Promise<BrokerOrder> {
    throw new Error("Order placement via SnapTrade coming soon");
  }

  async cancelOrder(_orderId: string): Promise<void> {
    throw new Error("Order cancellation via SnapTrade coming soon");
  }
}

function mapSnapTradeSide(action?: string): "buy" | "sell" {
  if (!action) return "buy";
  return action.toLowerCase().includes("sell") ? "sell" : "buy";
}

function mapSnapTradeOrderType(type?: string): BrokerOrder["type"] {
  if (!type) return "market";
  switch (type.toLowerCase()) {
    case "limit": return "limit";
    case "stop": return "stop";
    case "stop_limit":
    case "stoplimit": return "stop_limit";
    default: return "market";
  }
}

function mapSnapTradeStatus(status?: string): BrokerOrder["status"] {
  if (!status) return "pending";
  switch (status.toLowerCase()) {
    case "executed":
    case "filled": return "filled";
    case "partial":
    case "partially_filled": return "partial";
    case "canceled":
    case "cancelled":
    case "expired": return "cancelled";
    case "rejected":
    case "failed": return "rejected";
    default: return "pending";
  }
}
