/**
 * Known column mappings for major brokerage CSV exports.
 * Each profile maps our normalized field names to the column header
 * that broker uses in its export files.
 */

export interface BrokerProfile {
  name: string;
  slug: string;
  /** targetField -> expectedColumnName in the broker's CSV */
  columns: Record<string, string>;
}

export const BROKER_PROFILES: BrokerProfile[] = [
  {
    name: "Charles Schwab",
    slug: "schwab",
    columns: {
      symbol: "Symbol",
      qty: "Quantity",
      costBasis: "Cost Basis",
      currentPrice: "Price",
      marketValue: "Market Value",
      pnl: "Gain/Loss",
      assetType: "Security Type",
      strike: "Strike Price",
      expiry: "Expiration Date",
      optionType: "Option Type",
    },
  },
  {
    name: "Fidelity",
    slug: "fidelity",
    columns: {
      symbol: "Symbol",
      qty: "Quantity",
      costBasis: "Cost Basis Total",
      currentPrice: "Last Price",
      marketValue: "Current Value",
      pnl: "Gain/Loss Dollar",
      assetType: "Type",
    },
  },
  {
    name: "TD Ameritrade",
    slug: "tdameritrade",
    columns: {
      symbol: "Symbol",
      qty: "Qty",
      costBasis: "Average Price",
      currentPrice: "Mark",
      marketValue: "Market Value",
      pnl: "P/L Open",
      assetType: "Instrument Type",
      strike: "Strike",
      expiry: "Exp",
      optionType: "Type",
    },
  },
  {
    name: "Robinhood",
    slug: "robinhood",
    columns: {
      symbol: "Instrument",
      qty: "Quantity",
      costBasis: "Average Cost",
      currentPrice: "Current Price",
      marketValue: "Equity",
      pnl: "Total Return",
      assetType: "Type",
    },
  },
  {
    name: "E*Trade",
    slug: "etrade",
    columns: {
      symbol: "Symbol",
      qty: "Quantity",
      costBasis: "Price Paid",
      currentPrice: "Last Price $",
      marketValue: "Value $",
      pnl: "Total Gain/Loss $",
      assetType: "Security Type",
      strike: "Strike Price $",
      expiry: "Expiry Date",
      optionType: "Call/Put",
    },
  },
  {
    name: "Webull",
    slug: "webull",
    columns: {
      symbol: "Ticker",
      qty: "Shares",
      costBasis: "Avg Cost",
      currentPrice: "Last",
      marketValue: "Mkt Value",
      pnl: "Unrealized P&L",
      assetType: "Asset Type",
    },
  },
  {
    name: "Vanguard",
    slug: "vanguard",
    columns: {
      symbol: "Symbol",
      qty: "Shares",
      costBasis: "Total Cost",
      currentPrice: "Share Price",
      marketValue: "Total Value",
      pnl: "Gain/Loss",
      assetType: "Investment Type",
    },
  },
];
