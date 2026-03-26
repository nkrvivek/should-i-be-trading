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

  private async request<T>(path: string, method: "GET" | "POST" = "GET"): Promise<T> {
    const res = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
    });
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
      account_summary?: {
        net_liquidation?: number;
        buying_power?: number;
        cash?: number;
        settled_cash?: number;
        equity_with_loan?: number;
        excess_liquidity?: number;
        daily_pnl?: number;
        unrealized_pnl?: number;
        realized_pnl?: number;
      };
    }>("/portfolio/sync", "POST");
    const acct = data.account_summary;
    return {
      id: "ibkr-local",
      broker: "ibkr",
      equity: acct?.net_liquidation ?? data.bankroll ?? 0,
      buyingPower: acct?.buying_power ?? 0,
      cash: acct?.cash ?? acct?.settled_cash ?? 0,
      portfolioValue: acct?.net_liquidation ?? data.bankroll ?? 0,
      isPaperTrading: false,
    };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    const data = await this.request<{
      positions?: Array<{
        ticker?: string;
        contracts?: number;
        direction?: string;
        entry_cost?: number;
        market_value?: number | null;
        ib_daily_pnl?: number | null;
        structure_type?: string;
        risk_profile?: string;
        structure?: string;
        expiry?: string;
        legs?: Array<{
          direction?: string;
          contracts?: number;
          type?: string;
          strike?: number | null;
          entry_cost?: number;
          avg_cost?: number;
          market_price?: number | null;
          market_value?: number | null;
        }>;
      }>;
    }>("/portfolio/sync", "POST");

    return (data.positions ?? []).map((p) => {
      const contracts = p.contracts ?? 1;
      const entryCost = Math.abs(p.entry_cost ?? 0);
      const marketVal = Math.abs(p.market_value ?? 0);
      // Compute avg entry per contract and current price per contract
      const avgEntry = contracts > 0 ? entryCost / contracts : entryCost;
      const currentPerContract = contracts > 0 ? marketVal / contracts : marketVal;
      const unrealizedPL = marketVal - entryCost;
      const unrealizedPLPct = entryCost > 0 ? (unrealizedPL / entryCost) * 100 : 0;

      // Determine asset type from structure_type or legs
      const structType = (p.structure_type ?? "").toLowerCase();
      const hasOptions = p.legs?.some((l) => l.type === "Call" || l.type === "Put");
      const isOption = hasOptions || structType.includes("call") || structType.includes("put")
        || structType.includes("spread") || structType.includes("condor") || structType.includes("butterfly");

      return {
        symbol: p.ticker ?? "",
        qty: contracts,
        side: (p.direction === "SHORT" ? "short" : "long") as "long" | "short",
        avgEntryPrice: avgEntry,
        currentPrice: currentPerContract,
        marketValue: marketVal,
        unrealizedPL,
        unrealizedPLPercent: unrealizedPLPct,
        assetType: (isOption ? "option" : "stock") as BrokerPosition["assetType"],
      };
    });
  }

  async getOrders(): Promise<BrokerOrder[]> {
    const data = await this.request<{
      open_orders?: Array<{
        orderId?: number;
        symbol?: string;
        contract?: { symbol?: string; secType?: string; strike?: number | null; right?: string | null; expiry?: string | null };
        action?: string;
        orderType?: string;
        totalQuantity?: number;
        limitPrice?: number | null;
        auxPrice?: number | null;
        status?: string;
        filled?: number;
        remaining?: number;
        avgFillPrice?: number | null;
        tif?: string;
      }>;
      executed_orders?: Array<{
        execId?: string;
        symbol?: string;
        contract?: { symbol?: string };
        side?: string;
        quantity?: number;
        avgPrice?: number | null;
        time?: string;
      }>;
    }>("/orders/refresh", "POST");

    const openOrders: BrokerOrder[] = (data.open_orders ?? []).map((o) => ({
      id: String(o.orderId ?? ""),
      symbol: o.contract?.symbol ?? o.symbol ?? "",
      side: (o.action === "BUY" ? "buy" : "sell") as "buy" | "sell",
      type: mapIBOrderType(o.orderType ?? ""),
      qty: o.totalQuantity ?? 0,
      limitPrice: o.limitPrice ?? undefined,
      stopPrice: o.auxPrice ?? undefined,
      status: mapIBStatus(o.status ?? ""),
      filledQty: o.filled,
      filledAvgPrice: o.avgFillPrice ?? undefined,
      createdAt: new Date().toISOString(),
    }));

    const executedOrders: BrokerOrder[] = (data.executed_orders ?? []).map((o) => ({
      id: o.execId ?? "",
      symbol: o.contract?.symbol ?? o.symbol ?? "",
      side: (o.side === "BUY" ? "buy" : "sell") as "buy" | "sell",
      type: "market" as const,
      qty: o.quantity ?? 0,
      status: "filled" as const,
      filledQty: o.quantity,
      filledAvgPrice: o.avgPrice ?? undefined,
      createdAt: o.time ?? new Date().toISOString(),
    }));

    return [...openOrders, ...executedOrders];
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
    const res = await fetch(`${this.apiUrl}/orders/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId }),
    });
    if (!res.ok) throw new Error(`Cancel failed: ${res.status}`);
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
