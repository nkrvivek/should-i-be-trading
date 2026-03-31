export type LearningTrack = {
  slug: string;
  title: string;
  audience: string;
  description: string;
  level: "beginner" | "intermediate";
  lessons: LearningLesson[];
};

export type LessonSection = {
  title: string;
  body: string;
  videoUrl?: string;
  tip?: string;
};

export type LessonCheckpoint = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type LessonContent = {
  sections: LessonSection[];
  keyTakeaways: string[];
  checkpoint: LessonCheckpoint;
};

export type PracticeAction = {
  label: string;
  route: string;
  state?: Record<string, unknown>;
  description: string;
};

export type LearningLesson = {
  slug: string;
  title: string;
  format: "lesson" | "simulation" | "walkthrough";
  durationMinutes: number;
  market: "options" | "execution" | "screening" | "forex" | "futures";
  riskLevel: "low" | "medium" | "high" | "varies";
  description: string;
  outcomes: string[];
  simulatorRoute?: string;
  followUpRoute?: string;
  content?: LessonContent;
  practiceActions?: PracticeAction[];
};

export const LEARNING_TRACKS: LearningTrack[] = [
  {
    slug: "options-basics",
    title: "Options Basics",
    audience: "True beginners who need plain-English foundations before touching a live order ticket.",
    description: "Learn what calls, puts, contracts, strikes, premiums, and option rights actually mean before moving into strategies.",
    level: "beginner",
    lessons: [
      {
        slug: "calls-and-puts",
        title: "Calls, Puts, and Contract Basics",
        format: "lesson",
        durationMinutes: 12,
        market: "options",
        riskLevel: "low",
        description: "Understand the basic building blocks of options and how one contract maps to 100 shares.",
        outcomes: [
          "Explain what a call and a put give the buyer the right to do",
          "Understand strike, expiration, premium, and intrinsic value",
          "Know when options are directional vs hedging tools",
        ],
        simulatorRoute: "/signals?tab=simulator",
      },
      {
        slug: "buy-to-open-sell-to-close",
        title: "Buy to Open, Sell to Close, Sell to Open, Buy to Close",
        format: "lesson",
        durationMinutes: 14,
        market: "execution",
        riskLevel: "medium",
        description: "Learn the four order actions novices confuse most often and what position each one creates or closes.",
        outcomes: [
          "Know which actions open vs close long and short option positions",
          "Avoid the most common broker ticket mistakes",
          "Understand why short options change risk immediately",
        ],
        followUpRoute: "/trading",
      },
      {
        slug: "defined-vs-undefined-risk",
        title: "Defined Risk vs Undefined Risk",
        format: "lesson",
        durationMinutes: 10,
        market: "options",
        riskLevel: "medium",
        description: "See the difference between buying options, vertical spreads, covered calls, and naked short premium.",
        outcomes: [
          "Identify strategies with capped maximum loss",
          "Understand when a short option can create open-ended downside",
          "Use risk level as the first filter before strategy selection",
        ],
        simulatorRoute: "/signals?tab=simulator",
      },
    ],
  },
  {
    slug: "income-and-protection",
    title: "Income and Protection Strategies",
    audience: "New traders who already understand option basics and want practical starter strategies.",
    description: "Focus on covered calls, cash-secured puts, protective puts, and collars with realistic risk framing.",
    level: "beginner",
    lessons: [
      {
        slug: "covered-calls",
        title: "How Covered Calls Work",
        format: "simulation",
        durationMinutes: 15,
        market: "options",
        riskLevel: "low",
        description: "Use the simulator to see how premium income caps upside and when assignment becomes part of the trade.",
        outcomes: [
          "Know why covered calls need 100 shares",
          "Understand capped upside and premium income tradeoffs",
          "Recognize when a neutral-to-slightly-bullish outlook fits the strategy",
        ],
        simulatorRoute: "/signals?tab=simulator",
      },
      {
        slug: "cash-secured-puts",
        title: "Cash-Secured Puts and Entry Planning",
        format: "simulation",
        durationMinutes: 15,
        market: "options",
        riskLevel: "medium",
        description: "Learn how selling puts can be used as a structured way to enter a stock at a lower effective basis.",
        outcomes: [
          "Understand assignment risk and buying power requirements",
          "Calculate effective entry price after premium",
          "Know when not to sell puts into a weak setup",
        ],
        simulatorRoute: "/signals?tab=simulator",
      },
      {
        slug: "protective-puts-and-collars",
        title: "Protective Puts and Collars",
        format: "simulation",
        durationMinutes: 16,
        market: "options",
        riskLevel: "low",
        description: "Compare paying for downside insurance with a put vs offsetting some of that cost with a collar.",
        outcomes: [
          "See how hedging changes max loss",
          "Understand when a collar is a realistic compromise",
          "Connect strategy choice to risk appetite and event risk",
        ],
        simulatorRoute: "/signals?tab=simulator",
      },
    ],
  },
  {
    slug: "spreads-and-order-entry",
    title: "Spreads and Order Entry",
    audience: "Learners ready to move from single-leg trades into structured multi-leg execution.",
    description: "Learn bull call spreads, bear put spreads, credit spreads, and how to enter them properly with a broker.",
    level: "intermediate",
    lessons: [
      {
        slug: "vertical-spreads",
        title: "Bull Call and Bear Put Spreads",
        format: "simulation",
        durationMinutes: 18,
        market: "options",
        riskLevel: "medium",
        description: "Compare debit spreads for directional views and see how they cap both upside and downside.",
        outcomes: [
          "Understand why vertical spreads reduce cost but cap payoff",
          "Choose a spread that matches directional conviction",
          "Use max profit, max loss, and breakeven before order entry",
        ],
        simulatorRoute: "/signals?tab=simulator",
      },
      {
        slug: "credit-spreads",
        title: "Credit Spreads and Risk Limits",
        format: "simulation",
        durationMinutes: 18,
        market: "options",
        riskLevel: "medium",
        description: "See why credit spreads are defined-risk income trades rather than free premium.",
        outcomes: [
          "Understand width minus credit as real risk",
          "Know when credit spreads fit neutral or mildly directional setups",
          "Avoid treating win rate as the only metric that matters",
        ],
        simulatorRoute: "/signals?tab=simulator",
      },
      {
        slug: "placing-multi-leg-orders",
        title: "How to Place Multi-Leg Orders With a Broker",
        format: "walkthrough",
        durationMinutes: 12,
        market: "execution",
        riskLevel: "medium",
        description: "Walk through limit pricing, net debit vs net credit, and the most common broker ticket mistakes for spreads.",
        outcomes: [
          "Know how a broker expects spread orders to be entered",
          "Understand net debit and net credit pricing conventions",
          "Use SIBT analysis before execution rather than after",
        ],
        followUpRoute: "/trading",
      },
    ],
  },
  {
    slug: "sibt-workflows",
    title: "How To Use SIBT Well",
    audience: "New users who need a repeatable workflow, not just isolated metrics.",
    description: "Turn the product into a practical daily process using regime, screener, social, earnings, and simulator surfaces together.",
    level: "beginner",
    lessons: [
      {
        slug: "daily-trade-workflow",
        title: "A Daily SIBT Trade Workflow",
        format: "lesson",
        durationMinutes: 10,
        market: "screening",
        riskLevel: "low",
        description: "Start with the tape, then narrow to names where the market and ticker agree instead of forcing trades.",
        outcomes: [
          "Use market regime as the first filter",
          "Know when a high-scoring ticker still deserves caution",
          "Build a process instead of reacting to noise",
        ],
        followUpRoute: "/research?tab=composite",
      },
      {
        slug: "using-the-composite-screener",
        title: "How To Use the Composite Screener",
        format: "walkthrough",
        durationMinutes: 12,
        market: "screening",
        riskLevel: "low",
        description: "Learn how to sort by score, read confidence, and use verdicts as triage instead of blind conviction.",
        outcomes: [
          "Understand market base vs ticker score",
          "Know how missing inputs affect confidence",
          "Use ranked lists to focus attention, not force trades",
        ],
        followUpRoute: "/research?tab=composite",
      },
      {
        slug: "before-you-place-the-order",
        title: "What Analysis To Do Before You Place an Order",
        format: "walkthrough",
        durationMinutes: 14,
        market: "execution",
        riskLevel: "low",
        description: "Use SIBT verdicts, earnings context, social sentiment, and order review to avoid low-quality setups.",
        outcomes: [
          "Check event risk before entering a trade",
          "Use the order review screen as a final signal check",
          "Know when CAUTION is the right answer",
        ],
        followUpRoute: "/trading",
      },
    ],
  },
  {
    slug: "macro-products",
    title: "Forex and Futures Basics",
    audience: "Learners who need a plain-English introduction to non-equity markets and their risks.",
    description: "Understand how forex and futures differ from stocks and options before risking capital in leveraged markets.",
    level: "beginner",
    lessons: [
      {
        slug: "forex-basics",
        title: "Forex Basics: Pairs, Pips, and Leverage",
        format: "lesson",
        durationMinutes: 12,
        market: "forex",
        riskLevel: "high",
        description: "Learn what currency pairs represent, why leverage matters, and why small moves can still create large P&L swings.",
        outcomes: [
          "Understand base vs quote currency",
          "Know why leverage raises risk quickly",
          "Recognize why forex should not be treated like casual stock trading",
        ],
        followUpRoute: "/signals?tab=macro",
      },
      {
        slug: "futures-basics",
        title: "Futures Basics: Contracts, Margin, and Overnight Risk",
        format: "lesson",
        durationMinutes: 14,
        market: "futures",
        riskLevel: "high",
        description: "Get a beginner-friendly intro to futures multipliers, margin, and why overnight exposure behaves differently than stocks.",
        outcomes: [
          "Understand contract multipliers and notional exposure",
          "Know why futures margin is not the same as max loss",
          "Recognize overnight and gap risk in 24-hour markets",
        ],
        followUpRoute: "/signals?tab=macro",
      },
    ],
  },
];

import { ACADEMY_LESSON_CONTENT, ACADEMY_PRACTICE_ACTIONS } from "./academyContent";
for (const track of LEARNING_TRACKS) {
  for (const lesson of track.lessons) {
    lesson.content = ACADEMY_LESSON_CONTENT[lesson.slug];
    lesson.practiceActions = ACADEMY_PRACTICE_ACTIONS[lesson.slug];
  }
}

export const ALL_LEARNING_LESSONS = LEARNING_TRACKS.flatMap((track) =>
  track.lessons.map((lesson) => ({
    ...lesson,
    trackSlug: track.slug,
    trackTitle: track.title,
  })),
);
