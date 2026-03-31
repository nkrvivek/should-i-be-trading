export type SibtBadgeLevel = "beginner" | "intermediate" | "expert";

export type SibtBadgePath = {
  market: "stocks" | "options" | "etfs" | "futures" | "forex" | "commodities";
  title: string;
  description: string;
  levels: Array<{
    level: SibtBadgeLevel;
    label: string;
    requirements: string[];
    liveTradeRequirement?: string;
    note?: string;
  }>;
};

export const SIBT_BADGE_PATHS: SibtBadgePath[] = [
  {
    market: "stocks",
    title: "Stock Trading",
    description: "Build a process around market regime, screening, and disciplined execution before scaling into more complex products.",
    levels: [
      {
        level: "beginner",
        label: "Stock Beginner",
        requirements: [
          "Complete the daily trade workflow lessons",
          "Use the composite screener to narrow to a watchlist",
          "Explain basic order types and position sizing",
        ],
        liveTradeRequirement: "Log one small real stock trade with entry thesis, risk level, and exit plan.",
        note: "Completion is based on process quality, not whether the trade made money.",
      },
      {
        level: "intermediate",
        label: "Stock Intermediate",
        requirements: [
          "Document three completed trade reviews",
          "Use earnings, social, and regime context before entry",
          "Show consistent risk limits and stop logic",
        ],
      },
      {
        level: "expert",
        label: "Stock Expert",
        requirements: [
          "Demonstrate repeatable workflow across multiple market conditions",
          "Avoid forcing trades in weak regimes",
          "Show process consistency over a multi-week review period",
        ],
      },
    ],
  },
  {
    market: "options",
    title: "Options",
    description: "Progress from contract basics into risk-defined strategies, then into disciplined spread execution and trade review.",
    levels: [
      {
        level: "beginner",
        label: "Options Beginner",
        requirements: [
          "Complete calls, puts, and order action lessons",
          "Understand defined vs undefined risk",
          "Finish one simulator checkpoint on covered calls or cash-secured puts",
        ],
        liveTradeRequirement: "Log one small live options trade or covered call/cash-secured put with a written risk plan.",
        note: "Positive return is tracked separately. Badge progression should not reward reckless short-term P&L.",
      },
      {
        level: "intermediate",
        label: "Options Intermediate",
        requirements: [
          "Complete vertical and credit spread lessons",
          "Explain net debit vs net credit order entry",
          "Review two live or paper spread trades against original plan",
        ],
      },
      {
        level: "expert",
        label: "Options Expert",
        requirements: [
          "Use the simulator and order review flow consistently",
          "Demonstrate good strike selection and event-risk awareness",
          "Show disciplined exits rather than chasing premium",
        ],
      },
    ],
  },
  {
    market: "etfs",
    title: "ETFs",
    description: "Use ETFs as simpler vehicles for market, sector, and hedging workflows before taking concentrated single-name risk.",
    levels: [
      {
        level: "beginner",
        label: "ETF Beginner",
        requirements: [
          "Understand broad-market vs sector ETFs",
          "Use sector rotation and regime context in trade selection",
          "Complete one ETF screening walkthrough",
        ],
        liveTradeRequirement: "Log one ETF trade with regime context and holding-plan notes.",
      },
      {
        level: "intermediate",
        label: "ETF Intermediate",
        requirements: [
          "Compare ETF trades against single-name alternatives",
          "Use ETFs for directional or defensive positioning intentionally",
          "Document a post-trade review with what changed",
        ],
      },
      {
        level: "expert",
        label: "ETF Expert",
        requirements: [
          "Show a repeatable macro-to-sector workflow",
          "Use ETFs for tactical exposure without overtrading",
        ],
      },
    ],
  },
  {
    market: "futures",
    title: "Futures",
    description: "Learn leverage, notional exposure, and margin discipline before live futures execution.",
    levels: [
      {
        level: "beginner",
        label: "Futures Beginner",
        requirements: [
          "Complete futures basics lesson",
          "Explain multipliers, margin, and overnight gap risk",
          "Show that you understand why margin is not max loss",
        ],
      },
      {
        level: "intermediate",
        label: "Futures Intermediate",
        requirements: [
          "Build a documented risk plan before any live contract exposure",
          "Use macro and regime context before directional bets",
        ],
      },
      {
        level: "expert",
        label: "Futures Expert",
        requirements: [
          "Demonstrate disciplined sizing and session planning",
          "Avoid treating leveraged futures like large-cap stock swings",
        ],
      },
    ],
  },
  {
    market: "forex",
    title: "Forex",
    description: "Treat FX as a leveraged macro product, not an easier stock market substitute.",
    levels: [
      {
        level: "beginner",
        label: "Forex Beginner",
        requirements: [
          "Complete forex basics lesson",
          "Explain base/quote, pips, and leverage",
          "Understand why small moves can still create outsized P&L",
        ],
      },
      {
        level: "intermediate",
        label: "Forex Intermediate",
        requirements: [
          "Connect macro drivers to currency pairs",
          "Document one structured practice setup with clear invalidation",
        ],
      },
      {
        level: "expert",
        label: "Forex Expert",
        requirements: [
          "Show process discipline around leverage and event risk",
          "Demonstrate repeatable journaling and review habits",
        ],
      },
    ],
  },
  {
    market: "commodities",
    title: "Commodities",
    description: "Understand commodity exposure as a macro and supply/demand market with product-specific volatility characteristics.",
    levels: [
      {
        level: "beginner",
        label: "Commodities Beginner",
        requirements: [
          "Complete commodity/futures basics",
          "Understand product-specific drivers like energy, metals, and agricultural supply shocks",
        ],
      },
      {
        level: "intermediate",
        label: "Commodities Intermediate",
        requirements: [
          "Use macro context and contract specs before trade planning",
          "Document one structured review of commodity exposure risk",
        ],
      },
      {
        level: "expert",
        label: "Commodities Expert",
        requirements: [
          "Show disciplined position planning around volatility and event windows",
          "Demonstrate process, not excitement, in leveraged commodity decisions",
        ],
      },
    ],
  },
];
