import type { BrokerConnectionInterface, BrokerAccount, BrokerPosition, BrokerOrder, OrderRequest } from "./types";
import { getEdgeHeaders } from "../../api/edgeHeaders";
import { normalizeBrokerRequestError } from "./error";

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

export class SnapTradeBroker implements BrokerConnectionInterface {
  name = "SnapTrade";
  slug = "snaptrade";
  icon = "🔗";
  isConnected = false;
  isPaperAvailable = false;

  private snapUserId = "";
  private snapUserSecret = "";
  private accountId = "";
  private accountIds: string[] = [];
  private institutionName = "";

  private async edgeCall(action: string, extra: Record<string, unknown> = {}): Promise<unknown> {
    try {
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
    } catch (error) {
      throw normalizeBrokerRequestError("SnapTrade", error);
    }
  }

  /** Returns the current SnapTrade credentials for persistence in connection entries */
  getCredentials(): Record<string, string> {
    const creds: Record<string, string> = {};
    if (this.snapUserId && this.snapUserSecret) {
      creds.snapUserId = this.snapUserId;
      creds.snapUserSecret = this.snapUserSecret;
    }
    if (this.accountId) {
      creds.accountId = this.accountId;
    }
    if (this.institutionName) {
      creds.institutionName = this.institutionName;
    }
    return creds;
  }

  /** Returns a human-friendly name based on the underlying brokerage */
  getDisplayName(): string {
    if (this.institutionName) {
      return `${this.institutionName} (via SnapTrade)`;
    }
    return "SnapTrade";
  }

  /** After connecting via portal, returns all linked accounts for multi-connection creation */
  async listLinkedAccounts(): Promise<Array<{ accountId: string; institutionName: string }>> {
    const accounts = await this.fetchAccounts();
    return accounts.map((a) => ({
      accountId: a.id,
      institutionName: a.institution_name ?? "Unknown",
    }));
  }

  async connect(credentials: Record<string, string>): Promise<void> {
    // Restore institution name from stored credentials if available
    if (credentials.institutionName) {
      this.institutionName = credentials.institutionName;
    }

    // 1) Credentials passed from stored connection entry (best path)
    if (credentials.snapUserId && credentials.snapUserSecret) {
      this.snapUserId = credentials.snapUserId;
      this.snapUserSecret = credentials.snapUserSecret;
    } else {
      // 2) Fallback: check legacy localStorage key
      const saved = loadSnapCreds();
      if (saved) {
        this.snapUserId = saved.userId;
        this.snapUserSecret = saved.userSecret;
      } else {
        // 3) New user — register with SnapTrade
        const data = await this.edgeCall("register") as { userId: string; userSecret: string };
        this.snapUserId = data.userId;
        this.snapUserSecret = data.userSecret;
      }
    }

    // Always persist to localStorage as backup
    saveSnapCreds({ userId: this.snapUserId, userSecret: this.snapUserSecret });

    // If a specific accountId was stored, use it directly (multi-account support)
    if (credentials.accountId) {
      this.accountId = credentials.accountId;
      this.accountIds = [credentials.accountId];
      this.isConnected = true;
      return;
    }

    // Otherwise fetch all accounts to discover what's linked
    const accounts = await this.fetchAccounts();

    if (!accounts || accounts.length === 0) {
      // No accounts connected yet — user needs the Connection Portal
      // Still mark as connected so they can use getConnectionPortalUrl()
      this.isConnected = true;
      return;
    }

    // Extract the underlying brokerage name (e.g. "Schwab", "Robinhood")
    const firstInstitution = accounts[0].institution_name;
    if (firstInstitution) {
      this.institutionName = firstInstitution;
    }

    this.accountIds = accounts.map((a) => a.id);
    this.accountId = this.accountIds[0];
    this.isConnected = true;
  }

  /** Fetch linked accounts with retry on auth failure */
  private async fetchAccounts(): Promise<Array<{ id: string; number: string; name: string; institution_name?: string }>> {
    try {
      return await this.edgeCall("listAccounts") as Array<{ id: string; number: string; name: string; institution_name?: string }>;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("401") || msg.includes("authentication") || msg.includes("expired")) {
        // Clear stale credentials and re-register
        const data = await this.edgeCall("register") as { userId: string; userSecret: string };
        this.snapUserId = data.userId;
        this.snapUserSecret = data.userSecret;
        saveSnapCreds({ userId: data.userId, userSecret: data.userSecret });
        try {
          return await this.edgeCall("listAccounts") as Array<{ id: string; number: string; name: string; institution_name?: string }>;
        } catch {
          return [];
        }
      }
      throw err;
    }
  }

  disconnect(): void {
    this.snapUserId = "";
    this.snapUserSecret = "";
    this.accountId = "";
    this.accountIds = [];
    this.institutionName = "";
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

    return {
      id: this.accountId,
      broker: "snaptrade",
      equity: cash,
      buyingPower,
      cash,
      portfolioValue: cash,
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

  async placeOrder(order: OrderRequest): Promise<BrokerOrder> {
    if (!this.accountId) throw new Error("No brokerage account linked");

    // Map our OrderRequest to SnapTrade's trade/place format
    const isOption = !!order.optionDetails;
    const action = isOption
      ? (order.side === "buy" ? "BUY_TO_OPEN" : "SELL_TO_OPEN")
      : order.side.toUpperCase();

    const snapOrder: Record<string, unknown> = {
      action,
      symbol: isOption ? order.optionDetails!.occSymbol ?? order.symbol : order.symbol,
      order_type: mapOrderType(order.type),
      time_in_force: mapTimeInForce(order.timeInForce),
      units: order.qty,
    };
    if (order.limitPrice != null) snapOrder.price = order.limitPrice;
    if (order.stopPrice != null) snapOrder.stop = order.stopPrice;

    const data = await this.edgeCall("placeOrder", {
      accountId: this.accountId,
      order: snapOrder,
    }) as {
      brokerage_order_id?: string;
      status?: string;
      action?: string;
      order_type?: string;
      total_quantity?: string;
      limit_price?: number;
      stop_price?: number;
      time_placed?: string;
      filled_quantity?: string;
      execution_price?: number;
    };

    return {
      id: data.brokerage_order_id ?? "",
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      qty: order.qty,
      limitPrice: data.limit_price ?? order.limitPrice,
      stopPrice: data.stop_price ?? order.stopPrice,
      status: mapSnapTradeStatus(data.status),
      filledQty: data.filled_quantity ? Number(data.filled_quantity) : undefined,
      filledAvgPrice: data.execution_price ?? undefined,
      createdAt: data.time_placed ?? new Date().toISOString(),
    };
  }

  async cancelOrder(orderId: string): Promise<void> {
    if (!this.accountId) throw new Error("No brokerage account linked");
    await this.edgeCall("cancelOrder", {
      accountId: this.accountId,
      order: { brokerage_order_id: orderId },
    });
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

/** Map our order type to SnapTrade's order_type string */
function mapOrderType(type: string): string {
  switch (type) {
    case "market": return "Market";
    case "limit": return "Limit";
    case "stop": return "Stop";
    case "stop_limit": return "StopLimit";
    default: return "Market";
  }
}

/** Map our timeInForce to SnapTrade's time_in_force string */
function mapTimeInForce(tif: string): string {
  switch (tif) {
    case "day": return "Day";
    case "gtc": return "GTC";
    case "ioc": return "IOC";
    case "fok": return "FOK";
    default: return "Day";
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
