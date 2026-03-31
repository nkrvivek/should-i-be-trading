export const SECTOR_MAP: Record<string, string> = {
  AAPL: "Technology", MSFT: "Technology", NVDA: "Technology", GOOG: "Technology",
  META: "Technology", AMD: "Technology", AVGO: "Technology", CRM: "Technology", ORCL: "Technology",
  ADBE: "Technology", INTC: "Technology", CSCO: "Technology", QCOM: "Technology", MU: "Technology",
  SNOW: "Technology", PLTR: "Technology", DELL: "Technology", APP: "Technology", SHOP: "Technology",
  NOW: "Technology", PANW: "Technology", ACN: "Technology", ADI: "Technology", ADSK: "Technology",
  AMAT: "Technology", ANET: "Technology", ARM: "Technology", CDNS: "Technology", CRWD: "Technology",
  DOCU: "Technology", FIS: "Technology", FTNT: "Technology", HPE: "Technology", IBM: "Technology",
  INTU: "Technology", KLAC: "Technology", MCHP: "Technology", MDB: "Technology", MSI: "Technology",
  NET: "Technology", NXPI: "Technology", ON: "Technology", PYPL: "Technology", SMCI: "Technology",
  STX: "Technology", TTD: "Technology", TXN: "Technology", WDAY: "Technology", WDC: "Technology",
  ZS: "Technology",

  JPM: "Financials", BAC: "Financials", GS: "Financials", MS: "Financials", WFC: "Financials",
  C: "Financials", BX: "Financials", KKR: "Financials", SCHW: "Financials", AXP: "Financials",
  V: "Financials", MA: "Financials", COF: "Financials", AIG: "Financials", ALL: "Financials",
  AMP: "Financials", AON: "Financials", APO: "Financials", BK: "Financials", BLK: "Financials",
  CB: "Financials", CME: "Financials", DFS: "Financials", FITB: "Financials", HBAN: "Financials",
  ICE: "Financials", MCO: "Financials", MMC: "Financials", MSCI: "Financials", PGR: "Financials",
  PNC: "Financials", RJF: "Financials", SPGI: "Financials", TFC: "Financials", USB: "Financials",

  UNH: "Healthcare", JNJ: "Healthcare", LLY: "Healthcare", PFE: "Healthcare", ABBV: "Healthcare",
  MRK: "Healthcare", TMO: "Healthcare", ABT: "Healthcare", BMY: "Healthcare", AMGN: "Healthcare",
  BAX: "Healthcare", BDX: "Healthcare", BIIB: "Healthcare", BSX: "Healthcare", CAH: "Healthcare",
  CI: "Healthcare", CVS: "Healthcare", DHR: "Healthcare", DGX: "Healthcare", ELV: "Healthcare",
  EW: "Healthcare", GILD: "Healthcare", HCA: "Healthcare", HUM: "Healthcare", IDXX: "Healthcare",
  IQV: "Healthcare", ISRG: "Healthcare", MCK: "Healthcare", MDT: "Healthcare", REGN: "Healthcare",
  RMD: "Healthcare", STE: "Healthcare", SYK: "Healthcare", VRTX: "Healthcare", ZTS: "Healthcare",

  AMZN: "Consumer", TSLA: "Consumer", HD: "Consumer", MCD: "Consumer", NKE: "Consumer",
  SBUX: "Consumer", WMT: "Consumer", COST: "Consumer", TGT: "Consumer", LOW: "Consumer",
  ABNB: "Consumer", AZO: "Consumer", BBY: "Consumer", BKNG: "Consumer", CCL: "Consumer",
  CMG: "Consumer", DG: "Consumer", DLTR: "Consumer", DPZ: "Consumer", DRI: "Consumer",
  EBAY: "Consumer", ETSY: "Consumer", EXPE: "Consumer", F: "Consumer", GM: "Consumer",
  KMX: "Consumer", LEN: "Consumer", MAR: "Consumer", MGM: "Consumer", ORLY: "Consumer",
  RCL: "Consumer", ROST: "Consumer", TJX: "Consumer", UAL: "Consumer", YUM: "Consumer",

  PG: "Consumer Staples", KO: "Consumer Staples", PEP: "Consumer Staples", PM: "Consumer Staples",
  CL: "Consumer Staples", GIS: "Consumer Staples", HSY: "Consumer Staples", KHC: "Consumer Staples",
  KMB: "Consumer Staples", KR: "Consumer Staples", MDLZ: "Consumer Staples", MO: "Consumer Staples",
  MNST: "Consumer Staples", SYY: "Consumer Staples", WBA: "Consumer Staples",

  XOM: "Energy", CVX: "Energy", COP: "Energy", SLB: "Energy", EOG: "Energy",
  APA: "Energy", BKR: "Energy", DVN: "Energy", FANG: "Energy", HAL: "Energy",
  KMI: "Energy", MPC: "Energy", OXY: "Energy", PSX: "Energy", VLO: "Energy",

  CAT: "Industrials", BA: "Industrials", HON: "Industrials", UPS: "Industrials", RTX: "Industrials",
  ADP: "Industrials", CARR: "Industrials", CTAS: "Industrials", DE: "Industrials", EMR: "Industrials",
  ETN: "Industrials", FAST: "Industrials", GD: "Industrials", GE: "Industrials", IR: "Industrials",
  ITW: "Industrials", JCI: "Industrials", LHX: "Industrials", LMT: "Industrials", NOC: "Industrials",
  OTIS: "Industrials", PCAR: "Industrials", PH: "Industrials", RSG: "Industrials", SNA: "Industrials",
  TDG: "Industrials", TXT: "Industrials", UNP: "Industrials", WM: "Industrials", XYL: "Industrials",

  NFLX: "Communication", DIS: "Communication", CHTR: "Communication", CMCSA: "Communication", EA: "Communication",
  FOXA: "Communication", IPG: "Communication", LYV: "Communication", MTCH: "Communication", NWSA: "Communication",
  OMC: "Communication", TMUS: "Communication", VZ: "Communication",

  NEE: "Utilities", SO: "Utilities", DUK: "Utilities", AEP: "Utilities", AES: "Utilities",
  AWK: "Utilities", CMS: "Utilities", CNP: "Utilities", D: "Utilities", EIX: "Utilities",
  ETR: "Utilities", EVRG: "Utilities", EXC: "Utilities", FE: "Utilities", NI: "Utilities",
  NRG: "Utilities", PCG: "Utilities", PEG: "Utilities", PPL: "Utilities", SRE: "Utilities",
  WEC: "Utilities", XEL: "Utilities",
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
