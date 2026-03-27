/* Brokerage abstraction layer — any broker plugs into this interface */

export interface BrokerPosition {
  symbol: string;
  qty: number;
  side: "long" | "short";
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  assetType: "stock" | "option" | "crypto";
  brokerId?: string;
  brokerName?: string;
}

export interface BrokerOrder {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop" | "stop_limit";
  qty: number;
  limitPrice?: number;
  stopPrice?: number;
  status: "pending" | "filled" | "partial" | "cancelled" | "rejected";
  filledQty?: number;
  filledAvgPrice?: number;
  createdAt: string;
  optionDetails?: {
    strike: number;
    expiration: string;
    optionType: "call" | "put";
    underlying: string;
  };
  brokerId?: string;
  brokerName?: string;
}

export interface BrokerAccount {
  id: string;
  broker: string;
  equity: number;
  buyingPower: number;
  cash: number;
  portfolioValue: number;
  dayTradeCount?: number;
  isPaperTrading: boolean;
  brokerId?: string;
}

export interface OrderRequest {
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop" | "stop_limit";
  qty: number;
  limitPrice?: number;
  stopPrice?: number;
  timeInForce: "day" | "gtc" | "ioc" | "fok";
}

export interface OptionChainEntry {
  symbol: string;
  underlying: string;
  strike: number;
  expiration: string;
  optionType: "call" | "put";
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  impliedVol: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface BrokerConnectionInterface {
  name: string;
  slug: string;
  icon: string;
  isConnected: boolean;
  isPaperAvailable: boolean;

  connect(credentials: Record<string, string>): Promise<void>;
  disconnect(): void;

  getAccount(): Promise<BrokerAccount>;
  getPositions(): Promise<BrokerPosition[]>;
  getOrders(status?: string): Promise<BrokerOrder[]>;
  placeOrder(order: OrderRequest): Promise<BrokerOrder>;
  cancelOrder(orderId: string): Promise<void>;

  getOptionChain?(symbol: string, expiration?: string): Promise<OptionChainEntry[]>;
  getTradeHistory?(startDate: string, endDate: string): Promise<BrokerOrder[]>;
}

/** @deprecated Use BrokerConnectionInterface instead */
export type BrokerConnection = BrokerConnectionInterface;
