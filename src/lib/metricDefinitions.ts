/**
 * Educational definitions for every metric in the dashboard.
 * Each entry: what it is, why it matters, and how to interpret the current value.
 */

export type MetricDefinition = {
  name: string;
  short: string;
  description: string;
  whyItMatters: string;
  interpret: (value: number) => string;
  range: { low: number; high: number; unit?: string };
};

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  vix: {
    name: "VIX (Volatility Index)",
    short: "Market's expectation of 30-day volatility",
    description:
      "The CBOE Volatility Index measures the market's expectation of S&P 500 volatility over the next 30 days. Often called the \"fear gauge\" — it rises when investors buy put options for protection.",
    whyItMatters:
      "High VIX = expensive options, hedging demand, potential opportunity in equities. Low VIX = complacency, cheap protection, potential risk of correction.",
    interpret: (v) => {
      if (v <= 14) return `${v.toFixed(1)} is very low — complacency zone. Historically, corrections often start from here. Consider taking profits.`;
      if (v <= 20) return `${v.toFixed(1)} is normal. Healthy market conditions for standard trading.`;
      if (v <= 25) return `${v.toFixed(1)} is mildly elevated. Some uncertainty — be selective with entries.`;
      if (v <= 30) return `${v.toFixed(1)} is elevated — fear is rising. VIX regime says this is a buying zone for equities.`;
      if (v <= 45) return `${v.toFixed(1)} is high — significant fear. Historically a strong buying opportunity for long-term equity positions.`;
      return `${v.toFixed(1)} is extreme panic. Maximum fear = maximum opportunity. VIX regime says buy aggressively.`;
    },
    range: { low: 10, high: 50 },
  },

  vvix: {
    name: "VVIX (Volatility of Volatility)",
    short: "How volatile the VIX itself is",
    description:
      "VVIX measures the expected volatility of VIX options — essentially, how uncertain the market is about future volatility. It's the \"fear of fear\" gauge.",
    whyItMatters:
      "When VVIX spikes, it means investors are frantically buying VIX options to hedge. This signals institutional panic and often precedes major market moves.",
    interpret: (v) => {
      if (v < 90) return `${v.toFixed(1)} is calm. Low demand for volatility protection.`;
      if (v < 110) return `${v.toFixed(1)} is normal. Standard volatility expectation.`;
      if (v < 130) return `${v.toFixed(1)} is elevated. Institutions are actively hedging. Watch for acceleration.`;
      return `${v.toFixed(1)} is extreme. Panic-level demand for volatility hedges. Major dislocation may be underway.`;
    },
    range: { low: 70, high: 170 },
  },

  vvix_vix_ratio: {
    name: "VVIX/VIX Ratio",
    short: "Convexity demand relative to fear level",
    description:
      "The ratio of VVIX to VIX. When this is high (>7), institutions are paying a premium for tail-risk protection relative to the actual volatility level — a sign of smart money hedging.",
    whyItMatters:
      "A high ratio means professionals are worried about extreme moves even though surface-level fear (VIX) may be moderate. It's an early warning signal.",
    interpret: (v) => {
      if (v < 4) return `${v.toFixed(1)} is low. Minimal convexity demand. Calm market.`;
      if (v < 6) return `${v.toFixed(1)} is normal. Standard relationship between vol and vol-of-vol.`;
      if (v < 7) return `${v.toFixed(1)} is somewhat elevated. Institutions are starting to seek tail protection.`;
      return `${v.toFixed(1)} is high. Significant convexity demand — smart money is hedging aggressively.`;
    },
    range: { low: 3, high: 10 },
  },

  cor1m: {
    name: "COR1M (1-Month Implied Correlation)",
    short: "How correlated S&P 500 stocks are moving together",
    description:
      "COR1M measures the implied 1-month correlation of S&P 500 constituents. When correlation is high, all stocks move together (usually down) — diversification stops working.",
    whyItMatters:
      "High correlation (>60) signals herding behavior and systemic risk. Individual stock selection becomes irrelevant — everything moves together. This is when market-wide hedges (SPY puts) matter most.",
    interpret: (v) => {
      if (v < 25) return `${v.toFixed(1)} is low. Stocks are moving independently — stock picking is rewarded. Healthy market.`;
      if (v < 40) return `${v.toFixed(1)} is normal. Moderate correlation. Standard diversification benefits.`;
      if (v < 60) return `${v.toFixed(1)} is elevated. Stocks are starting to move together. Be cautious with concentrated positions.`;
      return `${v.toFixed(1)} is high. Stocks are highly correlated — diversification is failing. Systemic risk is elevated.`;
    },
    range: { low: 10, high: 80 },
  },

  rvol: {
    name: "RVOL (Realized Volatility)",
    short: "Actual price movement over the past 20 days",
    description:
      "Realized volatility measures how much the S&P 500 has actually moved over the past 20 trading sessions (annualized). Unlike VIX (which is forward-looking), RVOL shows what actually happened.",
    whyItMatters:
      "When RVOL > 25%, the market is experiencing large daily swings. Comparing RVOL to VIX tells you if the market is over- or under-pricing future risk.",
    interpret: (v) => {
      if (v < 10) return `${v.toFixed(1)}% is very low. Extremely calm market — almost no daily movement.`;
      if (v < 15) return `${v.toFixed(1)}% is normal. Standard market conditions.`;
      if (v < 25) return `${v.toFixed(1)}% is elevated. Daily swings are larger than usual.`;
      return `${v.toFixed(1)}% is high. Significant daily price swings — crash trigger threshold.`;
    },
    range: { low: 5, high: 40, unit: "%" },
  },

  spy: {
    name: "SPY (S&P 500 ETF)",
    short: "S&P 500 index level",
    description:
      "The SPDR S&P 500 ETF tracks the S&P 500 index — the benchmark for US equity market performance. It represents the 500 largest US publicly traded companies.",
    whyItMatters:
      "SPY's position relative to its 100-day moving average is a key momentum indicator. Below the MA signals a downtrend; above signals an uptrend.",
    interpret: (v) => `SPY at ${v.toFixed(2)}`,
    range: { low: 400, high: 700 },
  },

  cri: {
    name: "CRI (Crash Risk Index)",
    short: "Composite crash probability score, 0-100",
    description:
      "The Crash Risk Index combines four components — VIX level/rate-of-change, VVIX convexity demand, cross-asset correlation, and SPX momentum — into a single 0-100 score. Higher = more risk.",
    whyItMatters:
      "CRI synthesizes multiple risk signals into one actionable number. It answers: how likely is a significant market drawdown right now?",
    interpret: (v) => {
      if (v < 25) return `${v.toFixed(1)} is LOW. Normal market conditions. Standard risk-taking appropriate.`;
      if (v < 50) return `${v.toFixed(1)} is ELEVATED. Some risk factors are building. Monitor closely, reduce position sizes.`;
      if (v < 75) return `${v.toFixed(1)} is HIGH. Multiple risk signals firing. Only defined-risk trades. Consider hedging.`;
      return `${v.toFixed(1)} is CRITICAL. Maximum risk — avoid new positions except tail hedges.`;
    },
    range: { low: 0, high: 100 },
  },

  crash_trigger: {
    name: "Crash Trigger Conditions",
    short: "Three conditions that together signal systemic risk",
    description:
      "Three conditions that historically precede major market drawdowns: (1) SPX below its 100-day moving average, (2) realized volatility above 25%, and (3) COR1M above 60. When all three are met simultaneously, the risk of a cascading decline is significantly elevated.",
    whyItMatters:
      "Each condition alone is manageable. When all three align, it means: the trend is down (below MA), moves are large (high RVOL), and everything is moving together (high correlation). This is the setup for CTA forced selling and margin call cascades.",
    interpret: () => "",
    range: { low: 0, high: 3 },
  },

  vix_regime: {
    name: "VIX Regime Signal",
    short: "Equity allocation signal based on VIX mean reversion",
    description:
      "A simple, historically proven strategy: buy equities when VIX is high (fear = opportunity) and sell when VIX is low (complacency = risk). Based on the principle that extreme fear is temporary and markets recover.",
    whyItMatters:
      "This is one of the most robust signals in finance. High VIX readings have consistently preceded strong equity returns over the following 6-12 months. It works because fear creates better entry prices.",
    interpret: (v) => {
      if (v >= 45) return "BUY AGGRESSIVE: Extreme fear. Historically the best equity entry points.";
      if (v >= 30) return "BUY: Elevated fear. Favorable for building equity positions.";
      if (v <= 14) return "SELL / TAKE PROFITS: Complacency. Historically precedes corrections.";
      return "HOLD: Normal range. Standard position management.";
    },
    range: { low: 10, high: 50 },
  },
};

/** Get a definition by key, with fallback */
export function getMetricDef(key: string): MetricDefinition | null {
  return METRIC_DEFINITIONS[key] ?? null;
}
