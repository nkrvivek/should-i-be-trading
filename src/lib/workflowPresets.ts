import type { WorkflowProfile } from "../stores/appStore";

export type WorkflowPreset = {
  summary: string;
  stanceCopy: string;
  learnTitle: (lessonTitle?: string) => string;
  learnBody: string;
  learnFallback: string;
  learnCta: string;
  learnSecondaryLabel: (lesson?: { simulatorRoute?: string; followUpRoute?: string }) => string | undefined;
  learnSecondaryRoute: (lesson?: { simulatorRoute?: string; followUpRoute?: string }) => string | undefined;
  researchTitle: string;
  researchBody: string;
  researchFallback: string;
  researchCta: string;
  researchSecondary: string;
  tradeTitle: string;
  tradeBody: string;
  tradeCta: string;
  tradeSecondary: string;
};

export const WORKFLOW_OPTIONS: Array<{ id: WorkflowProfile; label: string }> = [
  { id: "beginner", label: "Beginner" },
  { id: "active_trader", label: "Active Trader" },
  { id: "options_trader", label: "Options Trader" },
];

export const WORKFLOW_PRESETS: Record<WorkflowProfile, WorkflowPreset> = {
  beginner: {
    summary: "Start with education and simulator reps before pushing into live execution. The app should slow you down and make the next step obvious.",
    stanceCopy: "Start with the tape, keep the process simple, and only move into review when the ticker and regime align. Learn first, simulate second, trade last.",
    learnTitle: (lessonTitle) => lessonTitle ?? "Start the academy",
    learnBody: "Stay on the guided lesson path until the order ticket and risk framing feel obvious.",
    learnFallback: "Pick up the next lesson, then move into simulator practice instead of skipping straight to live trading.",
    learnCta: "Resume Lesson",
    learnSecondaryLabel: (lesson) => lesson?.simulatorRoute ? "Open Simulator" : lesson?.followUpRoute ? "Open Follow-Up" : undefined,
    learnSecondaryRoute: (lesson) => lesson?.simulatorRoute ?? lesson?.followUpRoute,
    researchTitle: "Focus on the clearest setups",
    researchBody: "Review the highest-ranked ideas first and ignore lower-conviction noise.",
    researchFallback: "Open the composite screener to triage what deserves attention first.",
    researchCta: "Open Composite",
    researchSecondary: "Review Watchlist",
    tradeTitle: "Review before you execute",
    tradeBody: "Use order review and the trade checklist before sending anything to a broker.",
    tradeCta: "Open Trading",
    tradeSecondary: "Order Review",
  },
  active_trader: {
    summary: "Bias toward fast triage, tighter validation, and cleaner review loops. The app should help you narrow faster without skipping discipline.",
    stanceCopy: "Start with the tape, narrow quickly to the highest-conviction names, and use review to reject weak setups before they reach execution.",
    learnTitle: (lessonTitle) => lessonTitle ? `Sharpen with ${lessonTitle}` : "Refresh the playbook",
    learnBody: "Use shorter refreshers to reinforce discipline and stop drift in your process.",
    learnFallback: "Use the academy as a fast refresher, then move into research or trading review.",
    learnCta: "Open Learn",
    learnSecondaryLabel: () => "Open Progress",
    learnSecondaryRoute: () => "/progress",
    researchTitle: "Work the ranked list fast",
    researchBody: "Take the best names into validation quickly, but keep the bar high.",
    researchFallback: "Open the composite screener and move straight into validation on the top names.",
    researchCta: "Open Composite",
    researchSecondary: "Open Research",
    tradeTitle: "Keep the review loop tight",
    tradeBody: "Execution should be fast only after the structure, risk, and thesis are already clear.",
    tradeCta: "Open Trading",
    tradeSecondary: "Order Review",
  },
  options_trader: {
    summary: "Bias toward structure, risk definition, and simulator/order-review repetition. The app should route you into spreads, order entry, and trade review discipline.",
    stanceCopy: "Start with the tape, but do not let a strong opinion skip structure. For options, review, simulator context, and order quality matter as much as direction.",
    learnTitle: (lessonTitle) => lessonTitle ? `Practice ${lessonTitle}` : "Refresh options workflows",
    learnBody: "Use lessons to reinforce structure, defined risk, and order-entry discipline before execution.",
    learnFallback: "Revisit the options tracks, then move into simulator reps or trade review flows.",
    learnCta: "Open Learn",
    learnSecondaryLabel: () => "Open Simulator",
    learnSecondaryRoute: () => "/signals?tab=practice&view=simulator",
    researchTitle: "Find setups worth structuring",
    researchBody: "Look for names where the regime and ticker score justify an options structure, not just a directional opinion.",
    researchFallback: "Use composite and ticker research to narrow to names worth structuring into spreads or defined-risk setups.",
    researchCta: "Open Composite",
    researchSecondary: "Open Research",
    tradeTitle: "Structure before execution",
    tradeBody: "Use review and order quality checks before sending a multi-leg trade or options order.",
    tradeCta: "Open Trading",
    tradeSecondary: "Order Review",
  },
};
