/**
 * Column Mapper — auto-detects broker format and maps CSV headers
 * to our normalized ColumnMapping fields using broker profiles,
 * alias dictionaries, and fuzzy matching.
 */
import type { ColumnMapping } from "../strategy/types";
import { BROKER_PROFILES } from "./brokerProfiles";

export interface MappingResult {
  mapping: ColumnMapping;
  confidence: number;
  detectedBroker?: string;
  unmapped: string[];
}

/** Target field -> list of known aliases (lowercased for comparison) */
const ALIAS_MAP: Record<keyof ColumnMapping, string[]> = {
  symbol: [
    "symbol", "ticker", "instrument", "stock", "sym", "security",
    "name", "stock symbol", "asset", "underlying", "stock ticker",
    "security symbol", "trading symbol",
  ],
  qty: [
    "qty", "quantity", "shares", "amount", "units", "position",
    "num shares", "share count", "lot size", "volume", "contracts",
    "total qty", "total quantity",
  ],
  side: [
    "side", "direction", "position type", "long/short", "action",
    "buy/sell", "transaction type", "type", "trade side", "order side",
    "position side", "trade type",
  ],
  costBasis: [
    "cost basis", "avg cost", "average cost", "price paid", "cost",
    "average price", "avg price", "purchase price", "entry price",
    "cost basis total", "total cost", "basis", "cost per share",
  ],
  currentPrice: [
    "current price", "last price", "price", "mark", "last", "close",
    "market price", "share price", "closing price", "latest price",
    "last trade", "last price $", "current value per share",
  ],
  marketValue: [
    "market value", "value", "current value", "total value", "mkt value",
    "equity", "position value", "value $", "market val", "worth",
    "net value", "account value",
  ],
  pnl: [
    "p/l", "pnl", "gain/loss", "profit/loss", "unrealized p&l",
    "gain loss", "total return", "p/l open", "unrealized pnl",
    "gain/loss dollar", "total gain/loss", "total gain/loss $",
    "profit", "return",
  ],
  assetType: [
    "asset type", "type", "security type", "instrument type",
    "investment type", "category", "asset class", "product type",
    "security class", "position type", "holding type", "asset category",
  ],
  strike: [
    "strike", "strike price", "strike price $", "option strike",
    "exercise price", "strike px", "str", "contract strike",
    "strike value", "option strike price", "strk",
  ],
  expiry: [
    "expiry", "expiration", "expiration date", "exp", "exp date",
    "expiry date", "maturity", "contract expiry", "option expiry",
    "option expiration", "expires", "expiration day",
  ],
  optionType: [
    "option type", "call/put", "call put", "type", "contract type",
    "option kind", "put/call", "put call", "cp", "c/p",
    "option class", "right",
  ],
  buyDate: [
    "buy date", "purchase date", "open date", "entry date",
    "acquisition date", "trade date", "date acquired", "bought date",
    "date purchased", "opening date", "date opened", "start date",
  ],
  sellDate: [
    "sell date", "close date", "exit date", "sale date",
    "disposition date", "date sold", "sold date", "closing date",
    "date closed", "settlement date", "end date", "realized date",
  ],
  proceeds: [
    "proceeds", "sale proceeds", "gross proceeds", "total proceeds",
    "sell amount", "sale amount", "amount received", "net proceeds",
    "realized amount", "close amount", "exit amount", "revenue",
  ],
};

const ALL_TARGET_FIELDS = Object.keys(ALIAS_MAP) as (keyof ColumnMapping)[];

/** Normalize a header string for comparison */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

/** Try to match headers against a single broker profile */
function matchBrokerProfile(headers: string[], profile: typeof BROKER_PROFILES[number]): {
  mapping: Partial<ColumnMapping>;
  matchCount: number;
  totalFields: number;
} {
  const headerSet = new Set(headers.map((h) => h.trim()));
  const mapping: Partial<ColumnMapping> = {};
  let matchCount = 0;
  const totalFields = Object.keys(profile.columns).length;

  for (const [field, expectedCol] of Object.entries(profile.columns)) {
    if (headerSet.has(expectedCol)) {
      (mapping as Record<string, string>)[field] = expectedCol;
      matchCount++;
    }
  }

  return { mapping, matchCount, totalFields };
}

/** Score how well a header matches a target field via aliases */
function aliasScore(header: string, field: keyof ColumnMapping): number {
  const normHeader = norm(header);
  const aliases = ALIAS_MAP[field];

  // Exact match
  if (aliases.includes(normHeader)) return 1.0;

  // Substring match — alias contained in header or header contained in alias
  for (const alias of aliases) {
    if (normHeader.includes(alias) || alias.includes(normHeader)) {
      return 0.8;
    }
  }

  // Fuzzy: check if most words in an alias appear in the header
  for (const alias of aliases) {
    const aliasWords = alias.split(" ");
    const headerWords = normHeader.split(" ");
    const matched = aliasWords.filter((w) => headerWords.includes(w));
    if (aliasWords.length > 1 && matched.length / aliasWords.length >= 0.6) {
      return 0.6;
    }
  }

  return 0;
}

/** Auto-map CSV headers to ColumnMapping fields */
export function autoMapColumns(headers: string[]): MappingResult {
  // 1. Try each broker profile
  let bestBroker: { slug: string; mapping: Partial<ColumnMapping>; ratio: number } | null = null;

  for (const profile of BROKER_PROFILES) {
    const { mapping, matchCount, totalFields } = matchBrokerProfile(headers, profile);
    const ratio = matchCount / totalFields;
    if (ratio >= 0.8 && (!bestBroker || ratio > bestBroker.ratio)) {
      bestBroker = { slug: profile.slug, mapping, ratio };
    }
  }

  if (bestBroker) {
    const mapping = buildFullMapping(bestBroker.mapping, headers);
    const unmapped = headers.filter(
      (h) => !Object.values(mapping).includes(h)
    );
    return {
      mapping,
      confidence: Math.min(bestBroker.ratio + 0.1, 1),
      detectedBroker: bestBroker.slug,
      unmapped,
    };
  }

  // 2. Fall back to alias-based matching
  const mapping: Partial<ColumnMapping> = {};
  const usedHeaders = new Set<string>();
  let totalScore = 0;
  let fieldsAttempted = 0;

  for (const field of ALL_TARGET_FIELDS) {
    let bestHeader = "";
    let bestScore = 0;

    for (const header of headers) {
      if (usedHeaders.has(header)) continue;
      const score = aliasScore(header, field);
      if (score > bestScore) {
        bestScore = score;
        bestHeader = header;
      }
    }

    if (bestScore >= 0.6 && bestHeader) {
      (mapping as Record<string, string>)[field] = bestHeader;
      usedHeaders.add(bestHeader);
      totalScore += bestScore;
      fieldsAttempted++;
    }
  }

  const fullMapping = buildFullMapping(mapping, headers);
  const unmapped = headers.filter((h) => !usedHeaders.has(h));
  const confidence = fieldsAttempted > 0 ? totalScore / fieldsAttempted : 0;

  return {
    mapping: fullMapping,
    confidence: Math.round(confidence * 100) / 100,
    unmapped,
  };
}

/** Fill in the required symbol field and return a complete ColumnMapping */
function buildFullMapping(partial: Partial<ColumnMapping>, headers: string[]): ColumnMapping {
  // Symbol is required — if not mapped, use first header as fallback
  const symbol = partial.symbol || headers[0] || "";
  return { symbol, ...partial } as ColumnMapping;
}
