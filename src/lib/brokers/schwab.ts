import type { BrokerConnection, BrokerAccount, BrokerPosition, BrokerOrder, OrderRequest, OptionChainEntry } from "./types";
import { getEdgeHeaders } from "../../api/edgeHeaders";
import { normalizeBrokerRequestError } from "./error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";

export class SchwabBroker implements BrokerConnection {
  name = "Schwab";
  slug = "schwab";
  icon = "💼";
  isConnected = false;
  isPaperAvailable = false;

  private accessToken = "";
  private refreshToken = "";
  private accountHash = "";

  private async request(
    endpoint: string,
    params?: Record<string, string>,
    method = "GET",
    orderBody?: Record<string, unknown>,
  ) {
    try {
      const headers = await getEdgeHeaders();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/broker-schwab`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint,
          accountHash: this.accountHash,
          accessToken: this.accessToken,
          params,
          method,
          orderBody,
        }),
      });
      if (res.status === 401 && this.refreshToken) {
        await this.refreshAccessToken();
        // Retry with new token
        const retryRes = await fetch(`${SUPABASE_URL}/functions/v1/broker-schwab`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint, accountHash: this.accountHash, accessToken: this.accessToken, params, method, orderBody,
          }),
        });
        if (!retryRes.ok) throw new Error(`Schwab ${retryRes.status}: ${await retryRes.text()}`);
        return retryRes.json();
      }
      if (!res.ok) throw new Error(`Schwab ${res.status}: ${await res.text()}`);
      return res.json();
    } catch (error) {
      throw normalizeBrokerRequestError("Schwab", error);
    }
  }

  /** Refresh the access token using the stored refresh token */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) throw new Error("No refresh token available");

    try {
      const headers = await getEdgeHeaders();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/broker-schwab-auth`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refresh",
          refreshToken: this.refreshToken,
        }),
      });
      if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);

      const data = await res.json();
      this.accessToken = data.access_token;
      if (data.refresh_token) this.refreshToken = data.refresh_token;
    } catch (error) {
      throw normalizeBrokerRequestError("Schwab", error);
    }
  }

  async connect(credentials: Record<string, string>): Promise<void> {
    this.accessToken = credentials.accessToken || "";
    this.refreshToken = credentials.refreshToken || "";

    // If accountHash provided directly, use it
    if (credentials.accountHash) {
      this.accountHash = credentials.accountHash;
      // Validate by fetching account
      await this.getAccount();
      this.isConnected = true;
      return;
    }

    // Otherwise fetch account numbers to get the hash
    const data = await this.request("trader/v1/accounts/accountNumbers");
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No Schwab accounts found");
    }

    this.accountHash = data[0].hashValue;
    this.isConnected = true;
  }

  disconnect(): void {
    this.accessToken = "";
    this.refreshToken = "";
    this.accountHash = "";
    this.isConnected = false;
  }

  async getAccount(): Promise<BrokerAccount> {
    const data = await this.request("trader/v1/accounts/{hash}", { fields: "positions" });
    const acct = data.securitiesAccount;
    if (!acct) throw new Error("Could not retrieve Schwab account");

    return {
      id: this.accountHash,
      broker: "schwab",
      equity: acct.currentBalances?.liquidationValue ?? acct.currentBalances?.equity ?? 0,
      buyingPower: acct.currentBalances?.buyingPower ?? 0,
      cash: acct.currentBalances?.cashBalance ?? acct.currentBalances?.availableFunds ?? 0,
      portfolioValue: acct.currentBalances?.longMarketValue ?? 0,
      isPaperTrading: false,
    };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    const data = await this.request("trader/v1/accounts/{hash}", { fields: "positions" });
    const acct = data.securitiesAccount;
    const positions = acct?.positions ?? [];

    return positions.map((p: {
      instrument: {
        symbol: string;
        assetType: string;
        putCall?: string;
        underlyingSymbol?: string;
      };
      longQuantity: number;
      shortQuantity: number;
      averagePrice: number;
      currentDayProfitLoss: number;
      currentDayProfitLossPercentage: number;
      marketValue: number;
    }) => {
      const qty = p.longQuantity > 0 ? p.longQuantity : p.shortQuantity;
      const side = p.longQuantity > 0 ? "long" : "short";
      const avgEntry = p.averagePrice ?? 0;
      const marketVal = Math.abs(p.marketValue ?? 0);
      const currentPrice = qty > 0 ? marketVal / qty : 0;
      const unrealizedPL = marketVal - avgEntry * qty;
      const unrealizedPLPct = avgEntry * qty > 0 ? (unrealizedPL / (avgEntry * qty)) * 100 : 0;

      let assetType: BrokerPosition["assetType"] = "stock";
      if (p.instrument.assetType === "OPTION") assetType = "option";

      return {
        symbol: p.instrument.symbol,
        qty,
        side: side as "long" | "short",
        avgEntryPrice: avgEntry,
        currentPrice,
        marketValue: marketVal,
        unrealizedPL,
        unrealizedPLPercent: unrealizedPLPct,
        assetType,
      };
    });
  }

  async getOrders(status?: string): Promise<BrokerOrder[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status.toUpperCase();

    const data = await this.request("trader/v1/accounts/{hash}/orders", params);
    if (!Array.isArray(data)) return [];

    return data.map((o: {
      orderId: number;
      orderLegCollection: Array<{
        instrument: { symbol: string; assetType: string };
        instruction: string;
        quantity: number;
      }>;
      orderType: string;
      price?: number;
      stopPrice?: number;
      status: string;
      filledQuantity?: number;
      enteredTime: string;
    }) => {
      const leg = o.orderLegCollection?.[0];
      return {
        id: String(o.orderId),
        symbol: leg?.instrument?.symbol ?? "",
        side: mapSchwabSide(leg?.instruction ?? ""),
        type: mapSchwabOrderType(o.orderType),
        qty: leg?.quantity ?? 0,
        limitPrice: o.price ?? undefined,
        stopPrice: o.stopPrice ?? undefined,
        status: mapSchwabStatus(o.status),
        filledQty: o.filledQuantity,
        createdAt: o.enteredTime,
      };
    });
  }

  async placeOrder(order: OrderRequest): Promise<BrokerOrder> {
    const orderBody: Record<string, unknown> = {
      orderType: order.type.toUpperCase(),
      session: "NORMAL",
      duration: order.timeInForce === "gtc" ? "GOOD_TILL_CANCEL" : "DAY",
      orderStrategyType: "SINGLE",
      orderLegCollection: [
        {
          instruction: order.side === "buy" ? "BUY" : "SELL",
          quantity: order.qty,
          instrument: {
            symbol: order.symbol,
            assetType: "EQUITY",
          },
        },
      ],
    };
    if (order.limitPrice) orderBody.price = order.limitPrice.toString();
    if (order.stopPrice) orderBody.stopPrice = order.stopPrice.toString();

    await this.request("trader/v1/accounts/{hash}/orders", undefined, "POST", orderBody);

    return {
      id: "", // Schwab returns order ID in Location header, not in body
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
    await this.request(`trader/v1/accounts/{hash}/orders/${orderId}`, undefined, "DELETE");
  }

  async getOptionChain(symbol: string, expiration?: string): Promise<OptionChainEntry[]> {
    const params: Record<string, string> = {
      symbol,
      contractType: "ALL",
      includeUnderlyingQuote: "true",
    };
    if (expiration) params.toDate = expiration;

    const data = await this.request("marketdata/v1/chains", params);

    const entries: OptionChainEntry[] = [];

    // Schwab returns callExpDateMap and putExpDateMap
    for (const type of ["callExpDateMap", "putExpDateMap"] as const) {
      const expMap = data[type];
      if (!expMap) continue;

      const optionType = type === "callExpDateMap" ? "call" : "put";

      for (const expKey of Object.keys(expMap)) {
        const strikeMap = expMap[expKey];
        for (const strikeKey of Object.keys(strikeMap)) {
          const contracts = strikeMap[strikeKey];
          if (!Array.isArray(contracts)) continue;

          for (const c of contracts) {
            entries.push({
              symbol: c.symbol ?? "",
              underlying: symbol,
              strike: c.strikePrice ?? parseFloat(strikeKey),
              expiration: c.expirationDate ?? expKey.split(":")[0],
              optionType: optionType as "call" | "put",
              bid: c.bid ?? 0,
              ask: c.ask ?? 0,
              last: c.last ?? 0,
              volume: c.totalVolume ?? 0,
              openInterest: c.openInterest ?? 0,
              impliedVol: c.volatility ?? 0,
              delta: c.delta ?? 0,
              gamma: c.gamma ?? 0,
              theta: c.theta ?? 0,
              vega: c.vega ?? 0,
            });
          }
        }
      }
    }

    return entries;
  }
}

function mapSchwabSide(instruction: string): "buy" | "sell" {
  return instruction.toUpperCase().includes("BUY") ? "buy" : "sell";
}

function mapSchwabOrderType(type: string): BrokerOrder["type"] {
  switch (type.toUpperCase()) {
    case "MARKET": return "market";
    case "LIMIT": return "limit";
    case "STOP": return "stop";
    case "STOP_LIMIT": return "stop_limit";
    default: return "market";
  }
}

function mapSchwabStatus(status: string): BrokerOrder["status"] {
  switch (status.toUpperCase()) {
    case "AWAITING_PARENT_ORDER":
    case "AWAITING_CONDITION":
    case "AWAITING_STOP_CONDITION":
    case "AWAITING_MANUAL_REVIEW":
    case "ACCEPTED":
    case "PENDING_ACTIVATION":
    case "QUEUED":
    case "WORKING":
      return "pending";
    case "FILLED": return "filled";
    case "CANCELED":
    case "EXPIRED":
    case "REPLACED": return "cancelled";
    case "REJECTED": return "rejected";
    default: return "pending";
  }
}
