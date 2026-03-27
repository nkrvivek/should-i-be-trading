import type {
  BrokerConnection, BrokerAccount, BrokerPosition, BrokerOrder,
  OrderRequest, OptionChainEntry,
} from "./types";
import { getEdgeHeaders } from "../../api/edgeHeaders";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export class EtradeBroker implements BrokerConnection {
  name = "E*Trade";
  slug = "etrade";
  icon = "📊";
  isConnected = false;
  isPaperAvailable = true;

  private oauthToken = "";
  private oauthTokenSecret = "";
  private accountIdKey = "";
  private mode: "live" | "sandbox" = "live";

  private async request<T>(
    endpoint: string,
    params?: Record<string, string>,
    method = "GET",
    orderParams?: unknown,
  ): Promise<T> {
    const headers = await getEdgeHeaders();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/broker-etrade`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint,
        accountIdKey: this.accountIdKey,
        oauthToken: this.oauthToken,
        oauthTokenSecret: this.oauthTokenSecret,
        mode: this.mode === "sandbox" ? "sandbox" : undefined,
        params,
        method,
        orderParams,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`E*Trade ${res.status}: ${err}`);
    }
    return res.json();
  }

  async connect(credentials: Record<string, string>): Promise<void> {
    this.oauthToken = credentials.oauthToken || "";
    this.oauthTokenSecret = credentials.oauthTokenSecret || "";
    this.accountIdKey = credentials.accountIdKey || "";
    this.mode = credentials.mode === "sandbox" ? "sandbox" : "live";

    // Validate by fetching accounts list
    const data = await this.request<{
      AccountListResponse: { Accounts: { Account: Array<{ accountIdKey: string }> } };
    }>("v1/accounts/list");

    const accounts = data.AccountListResponse?.Accounts?.Account ?? [];
    if (accounts.length === 0) throw new Error("No E*Trade accounts found");

    // If no accountIdKey provided, use the first account
    if (!this.accountIdKey) {
      this.accountIdKey = accounts[0].accountIdKey;
    }

    this.isConnected = true;
  }

  disconnect(): void {
    this.oauthToken = "";
    this.oauthTokenSecret = "";
    this.accountIdKey = "";
    this.isConnected = false;
  }

  async getAccount(): Promise<BrokerAccount> {
    const data = await this.request<{
      BalanceResponse: {
        accountId: string;
        Computed: {
          RealTimeValues: { totalAccountValue: number; netMv: number };
          cashBuyingPower: number;
        };
        Cash: { fundsForOpenOrdersCash: number };
      };
    }>("v1/accounts/{key}/balance", { instType: "BROKERAGE", realTimeNAV: "true" });

    const balance = data.BalanceResponse;
    const computed = balance.Computed;
    const realTime = computed.RealTimeValues;

    return {
      id: this.accountIdKey,
      broker: "etrade",
      equity: realTime.totalAccountValue,
      buyingPower: computed.cashBuyingPower,
      cash: computed.cashBuyingPower,
      portfolioValue: realTime.totalAccountValue,
      isPaperTrading: this.mode === "sandbox",
    };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    const data = await this.request<{
      PortfolioResponse: {
        AccountPortfolio: Array<{
          Position: Array<{
            symbolDescription: string;
            quantity: number;
            costPerShare: number;
            currentPrice: number;
            marketValue: number;
            totalGain: number;
            totalGainPct: number;
            positionType: string;
          }>;
        }>;
      };
    }>("v1/accounts/{key}/portfolio");

    const portfolios = data.PortfolioResponse?.AccountPortfolio ?? [];
    const positions: BrokerPosition[] = [];

    for (const portfolio of portfolios) {
      for (const p of portfolio.Position ?? []) {
        positions.push({
          symbol: p.symbolDescription,
          qty: Math.abs(p.quantity),
          side: p.positionType === "SHORT" ? "short" : "long",
          avgEntryPrice: p.costPerShare,
          currentPrice: p.currentPrice,
          marketValue: p.marketValue,
          unrealizedPL: p.totalGain,
          unrealizedPLPercent: p.totalGainPct,
          assetType: "stock",
        });
      }
    }

    return positions;
  }

  async getOrders(status?: string): Promise<BrokerOrder[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;

    const data = await this.request<{
      OrdersResponse: {
        Order: Array<{
          orderId: number;
          OrderDetail: Array<{
            symbol: string;
            orderAction: string;
            orderType: string;
            quantity: number;
            limitPrice?: number;
            stopPrice?: number;
            status: string;
          }>;
        }>;
      };
    }>("v1/accounts/{key}/orders", params);

    const orders = data.OrdersResponse?.Order ?? [];
    return orders.map((o) => {
      const detail = o.OrderDetail?.[0];
      return {
        id: String(o.orderId),
        symbol: detail?.symbol ?? "",
        side: mapEtradeAction(detail?.orderAction ?? ""),
        type: mapEtradeOrderType(detail?.orderType ?? ""),
        qty: detail?.quantity ?? 0,
        limitPrice: detail?.limitPrice,
        stopPrice: detail?.stopPrice,
        status: mapEtradeStatus(detail?.status ?? ""),
        createdAt: new Date().toISOString(),
      };
    });
  }

  async placeOrder(order: OrderRequest): Promise<BrokerOrder> {
    const orderPayload = {
      PreviewOrderRequest: {
        orderType: "EQ",
        clientOrderId: crypto.randomUUID().slice(0, 20),
        Order: [{
          allOrNone: "false",
          priceType: mapToEtradeOrderType(order.type),
          orderTerm: order.timeInForce === "gtc" ? "GOOD_UNTIL_CANCEL" : "GOOD_FOR_DAY",
          limitPrice: order.limitPrice,
          stopPrice: order.stopPrice,
          Instrument: [{
            Product: { securityType: "EQ", symbol: order.symbol },
            orderAction: order.side === "buy" ? "BUY" : "SELL",
            quantityType: "QUANTITY",
            quantity: order.qty,
          }],
        }],
      },
    };

    // Step 1: Preview the order (required by E*Trade)
    const preview = await this.request<{
      PreviewOrderResponse: {
        PreviewIds: Array<{ previewId: number }>;
        clientOrderId: string;
      };
    }>("v1/accounts/{key}/orders/preview", undefined, "POST", orderPayload);

    const previewId = preview.PreviewOrderResponse?.PreviewIds?.[0]?.previewId;
    const clientOrderId = preview.PreviewOrderResponse?.clientOrderId;

    if (!previewId) throw new Error("E*Trade preview failed: no previewId returned");

    // Step 2: Place the order with the previewId
    const placePayload = {
      PlaceOrderRequest: {
        orderType: "EQ",
        clientOrderId,
        PreviewIds: [{ previewId }],
        Order: orderPayload.PreviewOrderRequest.Order,
      },
    };

    const placed = await this.request<{
      PlaceOrderResponse: {
        OrderIds: Array<{ orderId: number }>;
      };
    }>("v1/accounts/{key}/orders/place", undefined, "POST", placePayload);

    const orderId = placed.PlaceOrderResponse?.OrderIds?.[0]?.orderId;

    return {
      id: String(orderId ?? ""),
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
      "v1/accounts/{key}/orders",
      undefined,
      "PUT",
      { CancelOrderRequest: { orderId: parseInt(orderId, 10) } },
    );
  }

  async getOptionChain(symbol: string): Promise<OptionChainEntry[]> {
    const data = await this.request<{
      OptionChainResponse: {
        OptionPair: Array<{
          Call?: EtradeOptionLeg;
          Put?: EtradeOptionLeg;
        }>;
      };
    }>("v1/market/optionchains", { symbol });

    const pairs = data.OptionChainResponse?.OptionPair ?? [];
    const entries: OptionChainEntry[] = [];

    for (const pair of pairs) {
      if (pair.Call) entries.push(mapOptionLeg(pair.Call, symbol, "call"));
      if (pair.Put) entries.push(mapOptionLeg(pair.Put, symbol, "put"));
    }

    return entries;
  }
}

// ── E*Trade response types ──────────────────────────────────────
interface EtradeOptionLeg {
  symbol: string;
  strikePrice: number;
  bid: number;
  ask: number;
  lastPrice: number;
  volume: number;
  openInterest: number;
  OptionGreeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    iv: number;
  };
}

function mapOptionLeg(leg: EtradeOptionLeg, underlying: string, optionType: "call" | "put"): OptionChainEntry {
  return {
    symbol: leg.symbol,
    underlying,
    strike: leg.strikePrice,
    expiration: "", // E*Trade includes expiration in the symbol
    optionType,
    bid: leg.bid,
    ask: leg.ask,
    last: leg.lastPrice,
    volume: leg.volume,
    openInterest: leg.openInterest,
    impliedVol: leg.OptionGreeks?.iv ?? 0,
    delta: leg.OptionGreeks?.delta ?? 0,
    gamma: leg.OptionGreeks?.gamma ?? 0,
    theta: leg.OptionGreeks?.theta ?? 0,
    vega: leg.OptionGreeks?.vega ?? 0,
  };
}

// ── Status/type mappers ─────────────────────────────────────────
function mapEtradeAction(action: string): "buy" | "sell" {
  switch (action) {
    case "BUY":
    case "BUY_TO_COVER":
    case "BUY_OPEN":
    case "BUY_CLOSE":
      return "buy";
    default:
      return "sell";
  }
}

function mapEtradeOrderType(t: string): BrokerOrder["type"] {
  switch (t) {
    case "MARKET": return "market";
    case "LIMIT": return "limit";
    case "STOP": return "stop";
    case "STOP_LIMIT": return "stop_limit";
    default: return "market";
  }
}

function mapToEtradeOrderType(t: string): string {
  switch (t) {
    case "market": return "MARKET";
    case "limit": return "LIMIT";
    case "stop": return "STOP";
    case "stop_limit": return "STOP_LIMIT";
    default: return "MARKET";
  }
}

function mapEtradeStatus(s: string): BrokerOrder["status"] {
  switch (s) {
    case "OPEN":
    case "INDIVIDUAL_FILLS":
      return "pending";
    case "EXECUTED":
      return "filled";
    case "PARTIAL":
      return "partial";
    case "CANCELLED":
    case "CANCEL_REQUESTED":
    case "EXPIRED":
      return "cancelled";
    case "REJECTED":
      return "rejected";
    default:
      return "pending";
  }
}
