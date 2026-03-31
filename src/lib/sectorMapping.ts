export const SECTOR_MAP: Record<string, string> = {
  AAPL: "Technology", MSFT: "Technology", NVDA: "Technology", GOOG: "Technology",
  AMZN: "Consumer", META: "Technology", TSLA: "Consumer", AMD: "Technology", NFLX: "Communication",
  AVGO: "Technology", CRM: "Technology", ORCL: "Technology", ADBE: "Technology", INTC: "Technology",
  CSCO: "Technology", QCOM: "Technology", MU: "Technology", SNOW: "Technology", PLTR: "Technology",
  DELL: "Technology", APP: "Technology", SHOP: "Technology", NOW: "Technology", PANW: "Technology",
  JPM: "Financials", BAC: "Financials", GS: "Financials", MS: "Financials", WFC: "Financials",
  C: "Financials", BX: "Financials", KKR: "Financials", SCHW: "Financials", AXP: "Financials",
  V: "Financials", MA: "Financials", COF: "Financials",
  UNH: "Healthcare", JNJ: "Healthcare", LLY: "Healthcare", PFE: "Healthcare", ABBV: "Healthcare",
  MRK: "Healthcare", TMO: "Healthcare", ABT: "Healthcare", BMY: "Healthcare", AMGN: "Healthcare",
  XOM: "Energy", CVX: "Energy", COP: "Energy", SLB: "Energy", EOG: "Energy",
  DIS: "Communication", HD: "Consumer", MCD: "Consumer", NKE: "Consumer", SBUX: "Consumer",
  WMT: "Consumer", COST: "Consumer", TGT: "Consumer", LOW: "Consumer",
  CAT: "Industrials", BA: "Industrials", HON: "Industrials", UPS: "Industrials", RTX: "Industrials",
  NEE: "Utilities", SO: "Utilities", DUK: "Utilities",
  PG: "Consumer Staples", KO: "Consumer Staples", PEP: "Consumer Staples", PM: "Consumer Staples",
};

export const SECTOR_TO_ETF: Record<string, string> = {
  Technology: "XLK",
  Financials: "XLF",
  Healthcare: "XLV",
  Consumer: "XLY",
  "Consumer Staples": "XLP",
  Energy: "XLE",
  Industrials: "XLI",
  Communication: "XLC",
  Utilities: "XLU",
};

export function getSectorForSymbol(symbol: string): string | null {
  return SECTOR_MAP[symbol.trim().toUpperCase()] ?? null;
}

export function getSectorEtfForSymbol(symbol: string): string | null {
  const sector = getSectorForSymbol(symbol);
  return sector ? SECTOR_TO_ETF[sector] ?? null : null;
}
