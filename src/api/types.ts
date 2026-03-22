/* ─── WebSocket Protocol Types ─────────────────────── */

export type PriceData = {
  symbol: string;
  last: number | null;
  lastIsCalculated: boolean;
  bid: number | null;
  ask: number | null;
  bidSize: number | null;
  askSize: number | null;
  volume: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  close: number | null;
  week52High: number | null;
  week52Low: number | null;
  avgVolume: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  impliedVol: number | null;
  undPrice: number | null;
  timestamp: string;
};

export type FundamentalsData = {
  symbol: string;
  peRatio: number | null;
  eps: number | null;
  dividendYield: number | null;
  week52High: number | null;
  week52Low: number | null;
  priceBookRatio: number | null;
  roe: number | null;
  revenue: number | null;
  timestamp: string;
};

export type OptionContract = {
  symbol: string;
  expiry: string; // YYYYMMDD
  strike: number;
  right: "C" | "P";
};

export type IndexContract = {
  symbol: string;
  exchange: string;
};

export type WSMessage =
  | { type: "price"; symbol: string; data: PriceData }
  | { type: "batch"; updates: Record<string, PriceData> }
  | { type: "snapshot"; symbol: string; data: PriceData }
  | { type: "fundamentals"; symbol: string; data: FundamentalsData }
  | { type: "subscribed"; symbols: string[] }
  | { type: "unsubscribed"; symbols: string[] }
  | { type: "status"; ib_connected: boolean; ib_issue: string | null; ib_status_message: string | null; subscriptions: string[] }
  | { type: "error"; message: string }
  | { type: "ping" }
  | { type: "pong" };

/* ─── Option Helpers ───────────────────────────────── */

export function normalizeOptionExpiry(expiry: string): string | null {
  const compact = expiry.trim().replace(/-/g, "");
  return compact.length === 8 ? compact : null;
}

export function normalizeOptionContract(c: OptionContract): OptionContract | null {
  const symbol = c.symbol.trim().toUpperCase();
  const expiry = normalizeOptionExpiry(c.expiry);
  if (!symbol || !expiry || !Number.isFinite(c.strike) || c.strike <= 0) return null;
  return { symbol, expiry, strike: c.strike, right: c.right };
}

export function optionKey(c: OptionContract): string {
  const n = normalizeOptionContract(c);
  if (n) return `${n.symbol}_${n.expiry}_${n.strike}_${n.right}`;
  return `${c.symbol.trim().toUpperCase()}_${c.expiry.trim()}_${c.strike}_${c.right}`;
}

export function uniqueOptionContracts(contracts: OptionContract[]): OptionContract[] {
  const seen = new Set<string>();
  const result: OptionContract[] = [];
  for (const c of contracts) {
    const n = normalizeOptionContract(c);
    if (!n) continue;
    const key = optionKey(n);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(n);
  }
  return result;
}

export function contractsKey(contracts: OptionContract[]): string {
  return uniqueOptionContracts(contracts).map(optionKey).sort().join(",");
}

export function normalizeSymbolList(symbols: string[]): string[] {
  return [...symbols].map((s) => s.trim().toUpperCase()).filter((s) => s.length > 0);
}

export function symbolKey(symbols: string[]): string {
  return normalizeSymbolList(symbols).sort().join(",");
}

/* ─── Radon API Response Types ─────────────────────── */

export type PortfolioLeg = {
  direction: "LONG" | "SHORT";
  contracts: number;
  type: "Call" | "Put" | "Stock";
  strike: number | null;
  entry_cost: number;
  avg_cost: number;
  market_price: number | null;
  market_value: number | null;
};

export type PortfolioPosition = {
  id: number;
  ticker: string;
  structure: string;
  structure_type: string;
  risk_profile: string;
  expiry: string;
  contracts: number;
  direction: string;
  entry_cost: number;
  max_risk: number | null;
  market_value: number | null;
  legs: PortfolioLeg[];
  ib_daily_pnl?: number | null;
  kelly_optimal: number | null;
  target: number | null;
  stop: number | null;
  entry_date: string;
};

export type AccountSummary = {
  net_liquidation: number;
  daily_pnl: number | null;
  unrealized_pnl: number;
  realized_pnl: number;
  settled_cash: number;
  maintenance_margin: number;
  excess_liquidity: number;
  buying_power: number;
  dividends: number;
};

export type PortfolioData = {
  bankroll: number;
  peak_value: number;
  last_sync: string;
  positions: PortfolioPosition[];
  total_deployed_pct: number;
  total_deployed_dollars: number;
  remaining_capacity_pct: number;
  position_count: number;
  defined_risk_count: number;
  undefined_risk_count: number;
  avg_kelly_optimal: number | null;
  account_summary?: AccountSummary;
};

export type OrderComboLeg = {
  conId: number;
  ratio: number;
  action: string;
  symbol?: string;
  strike?: number | null;
  right?: string | null;
  expiry?: string | null;
};

export type OrderContract = {
  conId: number | null;
  symbol: string;
  secType: string;
  strike: number | null;
  right: string | null;
  expiry: string | null;
  comboLegs?: OrderComboLeg[];
};

export type OpenOrder = {
  orderId: number;
  permId: number;
  symbol: string;
  contract: OrderContract;
  action: string;
  orderType: string;
  totalQuantity: number;
  limitPrice: number | null;
  auxPrice: number | null;
  status: string;
  filled: number;
  remaining: number;
  avgFillPrice: number | null;
  tif: string;
};

export type ExecutedOrder = {
  execId: string;
  symbol: string;
  contract: OrderContract;
  side: string;
  quantity: number;
  avgPrice: number | null;
  commission: number | null;
  realizedPNL: number | null;
  time: string;
  exchange: string;
};

export type OrdersData = {
  last_sync: string;
  open_orders: OpenOrder[];
  executed_orders: ExecutedOrder[];
  open_count: number;
  executed_count: number;
};

export type CriHistoryEntry = {
  date: string;
  cri: number;
  vix: number;
  vvix: number;
  realized_vol: number;
  cor1m: number;
  spy: number;
  market_open: boolean;
};

export type CriData = {
  date: string;
  market_open: boolean;
  cri: number;
  cri_level: string;
  vix: number;
  vvix: number;
  spy: number;
  realized_vol: number;
  cor1m: number;
  cor1m_5d_change: number;
  vix_5d_roc: number;
  vvix_vix_ratio: number;
  spx_distance_pct: number;
  components: {
    vix: number;
    vvix: number;
    correlation: number;
    momentum: number;
  };
  crash_trigger: {
    spx_below_ma: boolean;
    rvol_above_25: boolean;
    cor1m_above_60: boolean;
    triggered: boolean;
  };
  history: CriHistoryEntry[];
};

export type HealthResponse = {
  status: string;
  ib_gateway: {
    port_listening: boolean;
    service_state: string;
  };
  ib_pool: Record<string, { connected: boolean; client_id: number }>;
  uw: boolean;
};

export type ScannerSignal = {
  ticker: string;
  sector: string;
  score: number;
  signal: string;
  direction: string;
  strength: number;
  buy_ratio: number | null;
  num_prints: number;
  sustained_days: number;
  recent_direction: string;
  recent_strength: number;
};

export type ScannerData = {
  scan_time: string;
  tickers_scanned: number;
  signals_found: number;
  top_signals: ScannerSignal[];
};

export type DiscoverCandidate = {
  ticker: string;
  score: number;
  score_breakdown: Record<string, number>;
  alerts: number;
  total_premium: number;
  calls: number;
  puts: number;
  options_bias: string;
  sweeps: number;
  avg_vol_oi: number;
  sector: string;
  issue_type: string;
  dp_direction: string;
  dp_strength: number;
  dp_buy_ratio: number;
  dp_sustained_days: number;
  dp_total_prints: number;
  confluence: boolean;
};

export type DiscoverData = {
  discovery_time: string;
  alerts_analyzed: number;
  candidates_found: number;
  candidates: DiscoverCandidate[];
};

export type FlowAnalysisPosition = {
  ticker: string;
  position: string;
  direction: string;
  flow_direction: string;
  flow_label: string;
  flow_class: string;
  strength: number;
  buy_ratio: number | null;
  note: string;
};

export type FlowAnalysisData = {
  analysis_time: string;
  positions_scanned: number;
  supports: FlowAnalysisPosition[];
  against: FlowAnalysisPosition[];
  watch: FlowAnalysisPosition[];
  neutral: FlowAnalysisPosition[];
};

export type PerformanceSummary = {
  starting_equity: number;
  ending_equity: number;
  pnl: number;
  trading_days: number;
  total_return: number;
  annualized_return: number;
  annualized_volatility: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  current_drawdown: number;
  hit_rate: number;
  best_day: number;
  worst_day: number;
};

export type PerformanceSeriesPoint = {
  date: string;
  equity: number;
  daily_return: number | null;
  drawdown: number;
  benchmark_close: number;
  benchmark_return: number;
};

export type PerformanceData = {
  as_of: string;
  last_sync: string;
  period_start: string;
  period_end: string;
  period_label: string;
  benchmark: string;
  benchmark_total_return: number;
  summary: PerformanceSummary;
  warnings: string[];
  series: PerformanceSeriesPoint[];
};
