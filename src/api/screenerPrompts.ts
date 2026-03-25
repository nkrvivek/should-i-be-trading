/**
 * AI Screener — Claude system prompt and response parser.
 */

export const SCREENER_SYSTEM_PROMPT = `You are a stock screening assistant for the SIBT terminal.
The user will describe stocks they want to find using natural language.
You must translate their request into a structured JSON filter specification.

Available metrics in our dataset:
- pe (trailing P/E ratio)
- forwardPe (forward P/E ratio)
- dividendYield (annual dividend yield as decimal, e.g. 0.05 = 5%)
- marketCap (in USD)
- eps (earnings per share, trailing)
- revenueGrowthQuarterly (quarterly revenue growth as decimal)
- profitMargin (net profit margin as decimal)
- beta (stock beta)
- sector (string: Technology, Financials, Healthcare, Consumer, Energy, Communication, Industrials, Utilities, Consumer Staples)
- fiftyTwoWeekHigh (52-week high price)
- fiftyTwoWeekLow (52-week low price)
- currentPrice (current stock price)

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "filters": [
    { "field": "<metric_name>", "operator": "<op>", "value": <number_or_string> }
  ],
  "sort": { "field": "<metric_name>", "direction": "asc" | "desc" },
  "limit": <number>
}

Operators: "gt" (>), "lt" (<), "gte" (>=), "lte" (<=), "eq" (==), "neq" (!=), "contains" (string contains)

Rules:
- Convert percentage inputs to decimals (e.g. "5%" dividend yield = 0.05)
- Convert billions/millions for marketCap (e.g. "$100B" = 100000000000)
- Default limit to 20 if not specified
- If the user asks for "high dividend", use dividendYield gt 0.03
- If the user asks for "low P/E", use pe lt 15
- If the user asks for "growth stocks", use revenueGrowthQuarterly gt 0.15
- If the user asks for "defensive", use beta lt 0.8
- Always include a sensible sort based on the query intent`;

export type ScreenerFilter = {
  field: string;
  operator: "gt" | "lt" | "gte" | "lte" | "eq" | "neq" | "contains";
  value: number | string;
};

export type ScreenerSpec = {
  filters: ScreenerFilter[];
  sort?: { field: string; direction: "asc" | "desc" };
  limit?: number;
};

export function parseScreenerResponse(text: string): ScreenerSpec | null {
  try {
    // Try to extract JSON from the response (in case Claude wraps it)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as ScreenerSpec;
    if (!parsed.filters || !Array.isArray(parsed.filters)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function matchesFilter<T extends Record<string, unknown>>(item: T, f: ScreenerFilter): boolean | null {
  const val = item[f.field];
  // null = no data for this field — return null to indicate "unknown"
  if (val == null) return null;

  switch (f.operator) {
    case "gt": return (val as number) > (f.value as number);
    case "lt": return (val as number) < (f.value as number);
    case "gte": return (val as number) >= (f.value as number);
    case "lte": return (val as number) <= (f.value as number);
    case "eq": return val === f.value;
    case "neq": return val !== f.value;
    case "contains":
      return typeof val === "string" && val.toLowerCase().includes((f.value as string).toLowerCase());
    default: return true;
  }
}

export function applyFilters<T extends Record<string, unknown>>(
  data: T[],
  spec: ScreenerSpec,
): T[] {
  // Score each item: count how many filters it matches vs total
  const scored = data.map((item) => {
    const results = spec.filters.map((f) => matchesFilter(item, f));
    const matched = results.filter((r) => r === true).length;
    const failed = results.filter((r) => r === false).length;
    const unknown = results.filter((r) => r === null).length;
    return { item, matched, failed, unknown, total: spec.filters.length };
  });

  // Strict pass: all known filters pass (no failures, unknowns OK)
  let results = scored
    .filter((s) => s.failed === 0 && s.matched > 0)
    .map((s) => s.item);

  // If strict pass returns nothing, relax: allow items that match at least half
  // of filters and have no more than 1 failure (rest are unknown/null data)
  if (results.length === 0 && spec.filters.length > 1) {
    results = scored
      .filter((s) => s.failed <= 1 && s.matched >= Math.ceil(s.total / 2))
      .sort((a, b) => b.matched - a.matched || a.failed - b.failed)
      .map((s) => s.item);
  }

  if (spec.sort) {
    const { field, direction } = spec.sort;
    results.sort((a, b) => {
      const aVal = a[field] as number;
      const bVal = b[field] as number;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    });
  }

  return results.slice(0, spec.limit ?? 20);
}
