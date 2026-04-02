import { lazy, Suspense, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TerminalShell } from "../components/layout/TerminalShell";
import { TabBar, type TabDef } from "../components/layout/TabBar";
import { useRegime } from "../hooks/useRegime";

const RegimeContent = lazy(() => import("./partials/RegimeContent"));
const MacroContent = lazy(() => import("./partials/MacroContent"));
const CotContent = lazy(() => import("./partials/CotContent"));
const BacktestContent = lazy(() => import("./partials/BacktestContent"));
const SimulatorContent = lazy(() => import("./partials/SimulatorContent"));
const ActivityContent = lazy(() => import("./partials/ActivityContent"));

const PRIMARY_TABS: TabDef[] = [
  { id: "validation", label: "Validate" },
  { id: "practice", label: "Practice" },
  { id: "advanced", label: "Advanced Context" },
];

const VALIDATION_TABS: TabDef[] = [
  { id: "regime", label: "Regime" },
  { id: "backtest", label: "Backtest" },
];

const PRACTICE_TABS: TabDef[] = [
  { id: "simulator", label: "Simulator" },
  { id: "activity", label: "Activity", badge: "NEW", badgeColor: "var(--signal-core)" },
];

const ADVANCED_TABS: TabDef[] = [
  { id: "macro", label: "Macro" },
  { id: "cot", label: "COT", badge: "NEW", badgeColor: "var(--signal-core)" },
];

const LEGACY_TAB_MAP: Record<string, { primary: string; view: string }> = {
  regime: { primary: "validation", view: "regime" },
  backtest: { primary: "validation", view: "backtest" },
  simulator: { primary: "practice", view: "simulator" },
  activity: { primary: "practice", view: "activity" },
  macro: { primary: "advanced", view: "macro" },
  cot: { primary: "advanced", view: "cot" },
};

const loading = (
  <div style={{ padding: 32, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
    Loading...
  </div>
);

type SignalsPrimaryTab = "validation" | "practice" | "advanced";
type SignalsView = "regime" | "backtest" | "simulator" | "activity" | "macro" | "cot";

const PRIMARY_STAGE_COPY: Record<SignalsPrimaryTab, { step: string; title: string; body: string }> = {
  validation: {
    step: "STEP 1",
    title: "Validate the setup",
    body: "Confirm whether the idea deserves attention before you spend energy on execution.",
  },
  practice: {
    step: "STEP 2",
    title: "Practice the trade",
    body: "Rehearse structure, payoff, and tape behavior before the order ticket matters.",
  },
  advanced: {
    step: "STEP 3",
    title: "Add extra context",
    body: "Use macro and positioning only when they materially change the risk picture.",
  },
};

const VIEW_COPY: Record<SignalsView, { label: string; summary: string; useWhen: string; moveOnWhen: string }> = {
  regime: {
    label: "Regime",
    summary: "Start here when you need a quick read on whether the broader market supports taking risk at all.",
    useWhen: "You want a fast go, caution, or stop signal before trusting the setup.",
    moveOnWhen: "You can explain whether the setup deserves rehearsal or whether the answer is no trade.",
  },
  backtest: {
    label: "Backtest",
    summary: "Use recent history to calibrate expectations, not to force conviction out of the past.",
    useWhen: "You want context on how the signal framework behaved before under similar conditions.",
    moveOnWhen: "You have enough context to move into simulator and test the structure for today.",
  },
  simulator: {
    label: "Simulator",
    summary: "Turn a surviving idea into a cleaner structure, payoff map, and order plan.",
    useWhen: "The setup still looks valid and you need to test strikes, risk, and execution.",
    moveOnWhen: "You can describe the trade cleanly enough to review in Trading or discard it.",
  },
  activity: {
    label: "Activity",
    summary: "Use live volume, insider clusters, and short-interest context to spot pressure, not to chase noise.",
    useWhen: "You want tape-level confirmation or friction after the thesis already makes sense.",
    moveOnWhen: "The activity either improves timing or tells you to stop forcing the trade.",
  },
  macro: {
    label: "Macro",
    summary: "Macro is a tie-breaker when rates, growth, or calendar risk could change your plan.",
    useWhen: "A setup is sensitive to the bigger tape and you need more than a simple regime check.",
    moveOnWhen: "You know whether macro changes the setup enough to revisit validation or reduce risk.",
  },
  cot: {
    label: "COT",
    summary: "Use positioning data to understand crowding and trend pressure when conviction feels stretched.",
    useWhen: "You need a futures positioning read that could support or weaken the thesis.",
    moveOnWhen: "You can say whether positioning sharpens the idea or is just extra noise.",
  },
};

export default function SignalsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") || "validation";
  const rawView = searchParams.get("view");
  const { data: cri } = useRegime(true);

  useEffect(() => {
    const legacy = LEGACY_TAB_MAP[rawTab];
    if (!legacy) return;

    const next = new URLSearchParams(searchParams);
    next.set("tab", legacy.primary);
    next.set("view", legacy.view);
    setSearchParams(next, { replace: true });
  }, [rawTab, searchParams, setSearchParams]);

  const primaryTab = PRIMARY_TABS.some((tab) => tab.id === rawTab)
    ? rawTab
    : LEGACY_TAB_MAP[rawTab]?.primary ?? "validation";

  const activeView = getActiveView(primaryTab, rawView, rawTab);

  const selectPrimaryTab = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", id);
    if (id === "validation" && !VALIDATION_TABS.some((tab) => tab.id === next.get("view"))) {
      next.set("view", "regime");
    } else if (id === "practice" && !PRACTICE_TABS.some((tab) => tab.id === next.get("view"))) {
      next.set("view", "simulator");
    } else if (id === "advanced" && !ADVANCED_TABS.some((tab) => tab.id === next.get("view"))) {
      next.set("view", "macro");
    }
    setSearchParams(next, { replace: true });
  };

  const openSignalsView = (tab: SignalsPrimaryTab, view: SignalsView) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    next.set("view", view);
    setSearchParams(next, { replace: true });
  };

  const secondaryTabs = primaryTab === "validation"
    ? VALIDATION_TABS
    : primaryTab === "practice"
      ? PRACTICE_TABS
      : ADVANCED_TABS;
  const quickActions = getSignalsQuickActions(activeView);

  return (
    <TerminalShell cri={cri}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 0 }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          borderBottom: "1px solid var(--border-dim)",
          background: "var(--bg-panel)",
        }}>
          <PrimarySignalsTabBar tabs={PRIMARY_TABS} active={primaryTab} onSelect={selectPrimaryTab} />
          <div style={{ padding: "0 12px 8px" }}>
            <TabBar tabs={secondaryTabs} paramKey="view" />
          </div>
        </div>

        <div style={{ padding: "12px 0" }}>
          <div style={{ marginBottom: 12 }}>
            <SignalsOverview
              primaryTab={primaryTab}
              activeView={activeView}
              onSelectPrimary={selectPrimaryTab}
            />
          </div>

          <div style={signalsActionStripStyle}>
            <div style={{ ...signalsStripLabelStyle, minWidth: 90 }}>{VIEW_COPY[activeView as SignalsView].label}</div>
            <div style={signalsStripTextStyle}>{VIEW_COPY[activeView as SignalsView].useWhen}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    if (action.kind === "route") {
                      navigate(action.to);
                      return;
                    }
                    openSignalsView(action.tab, action.view);
                  }}
                  style={action.tone === "secondary" ? signalsSecondaryButtonStyle : signalsPrimaryButtonStyle}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {activeView === "regime" && (
            <Suspense fallback={loading}><RegimeContent /></Suspense>
          )}
          {activeView === "backtest" && (
            <Suspense fallback={loading}><BacktestContent /></Suspense>
          )}
          {activeView === "simulator" && (
            <Suspense fallback={loading}><SimulatorContent /></Suspense>
          )}
          {activeView === "activity" && (
            <Suspense fallback={loading}><ActivityContent /></Suspense>
          )}
          {activeView === "macro" && (
            <Suspense fallback={loading}><MacroContent /></Suspense>
          )}
          {activeView === "cot" && (
            <Suspense fallback={loading}><CotContent /></Suspense>
          )}
        </div>
      </div>
    </TerminalShell>
  );
}

function SignalsOverview({
  primaryTab,
  activeView,
  onSelectPrimary,
}: {
  primaryTab: string;
  activeView: string;
  onSelectPrimary: (id: string) => void;
}) {
  const stageCards = (Object.keys(PRIMARY_STAGE_COPY) as SignalsPrimaryTab[]).map((id) => ({
    id,
    active: primaryTab === id,
    ...PRIMARY_STAGE_COPY[id],
  }));
  const currentView = VIEW_COPY[activeView as SignalsView];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        {stageCards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectPrimary(card.id)}
            style={{
              textAlign: "left",
              padding: 14,
              borderRadius: 8,
              border: `1px solid ${card.active ? "rgba(5, 173, 152, 0.35)" : "var(--border-dim)"}`,
              background: card.active ? "rgba(5, 173, 152, 0.08)" : "var(--bg-panel-raised)",
              cursor: "pointer",
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: card.active ? "var(--signal-core)" : "var(--text-muted)", letterSpacing: "0.08em", marginBottom: 6 }}>
              {card.step}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
              {card.title}
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>
              {card.body}
            </div>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div style={signalsInfoCardStyle}>
          <div style={signalsInfoLabelStyle}>CURRENT FOCUS</div>
          <div style={signalsInfoTitleStyle}>{currentView.label}</div>
          <div style={signalsInfoBodyStyle}>{currentView.summary}</div>
        </div>
        <div style={signalsInfoCardStyle}>
          <div style={signalsInfoLabelStyle}>USE IT WHEN</div>
          <div style={signalsInfoBodyStyle}>{currentView.useWhen}</div>
        </div>
        <div style={signalsInfoCardStyle}>
          <div style={signalsInfoLabelStyle}>MOVE ON WHEN</div>
          <div style={signalsInfoBodyStyle}>{currentView.moveOnWhen}</div>
        </div>
      </div>
    </div>
  );
}

type SignalsQuickAction =
  | { label: string; kind: "route"; to: string; tone?: "secondary" }
  | { label: string; kind: "signals"; tab: SignalsPrimaryTab; view: SignalsView; tone?: "secondary" };

function getSignalsQuickActions(activeView: string): SignalsQuickAction[] {
  switch (activeView) {
    case "regime":
      return [
        { label: "OPEN SIMULATOR", kind: "signals", tab: "practice", view: "simulator" },
        { label: "OPEN RESEARCH", kind: "route", to: "/research", tone: "secondary" },
      ];
    case "backtest":
      return [
        { label: "OPEN SIMULATOR", kind: "signals", tab: "practice", view: "simulator" },
        { label: "BACK TO REGIME", kind: "signals", tab: "validation", view: "regime", tone: "secondary" },
      ];
    case "simulator":
      return [
        { label: "OPEN TRADING", kind: "route", to: "/trading" },
        { label: "OPEN PROGRESS", kind: "route", to: "/progress", tone: "secondary" },
      ];
    case "activity":
      return [
        { label: "OPEN TRADING", kind: "route", to: "/trading" },
        { label: "OPEN PROGRESS", kind: "route", to: "/progress", tone: "secondary" },
      ];
    case "macro":
      return [
        { label: "BACK TO REGIME", kind: "signals", tab: "validation", view: "regime" },
        { label: "OPEN RESEARCH", kind: "route", to: "/research", tone: "secondary" },
      ];
    case "cot":
      return [
        { label: "BACK TO REGIME", kind: "signals", tab: "validation", view: "regime" },
        { label: "OPEN SIMULATOR", kind: "signals", tab: "practice", view: "simulator", tone: "secondary" },
      ];
    default:
      return [
        { label: "OPEN RESEARCH", kind: "route", to: "/research" },
        { label: "OPEN PROGRESS", kind: "route", to: "/progress", tone: "secondary" },
      ];
  }
}

const signalsInfoCardStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const signalsActionStripStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  padding: "10px 12px",
  marginBottom: 12,
  borderRadius: 6,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const signalsStripLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-muted)",
  letterSpacing: "0.06em",
};

const signalsStripTextStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  lineHeight: 1.55,
  color: "var(--text-secondary)",
  flex: 1,
  minWidth: 240,
};

const signalsPrimaryButtonStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 700,
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid var(--signal-core)",
  background: "rgba(5, 173, 152, 0.12)",
  color: "var(--signal-core)",
  cursor: "pointer",
};

const signalsSecondaryButtonStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 700,
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid var(--border-dim)",
  background: "transparent",
  color: "var(--text-secondary)",
  cursor: "pointer",
};

const signalsInfoLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--signal-core)",
  letterSpacing: "0.08em",
  marginBottom: 6,
};

const signalsInfoTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 18,
  fontWeight: 700,
  color: "var(--text-primary)",
  marginBottom: 6,
};

const signalsInfoBodyStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  lineHeight: 1.6,
  color: "var(--text-secondary)",
};

function getActiveView(primaryTab: string, rawView: string | null, rawTab: string) {
  if (primaryTab === "validation") {
    if (VALIDATION_TABS.some((tab) => tab.id === rawView)) return rawView ?? "regime";
    return LEGACY_TAB_MAP[rawTab]?.view ?? "regime";
  }

  if (primaryTab === "practice") {
    if (PRACTICE_TABS.some((tab) => tab.id === rawView)) return rawView ?? "simulator";
    return LEGACY_TAB_MAP[rawTab]?.view ?? "simulator";
  }

  if (ADVANCED_TABS.some((tab) => tab.id === rawView)) return rawView ?? "macro";
  return LEGACY_TAB_MAP[rawTab]?.view ?? "macro";
}

function PrimarySignalsTabBar({ tabs, active, onSelect }: { tabs: TabDef[]; active: string; onSelect: (id: string) => void }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        overflowX: "auto",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            style={{
              padding: "10px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: isActive ? 700 : 400,
              letterSpacing: "0.04em",
              color: isActive ? "var(--accent-bg)" : "var(--text-muted)",
              background: "none",
              border: "none",
              borderBottom: `2px solid ${isActive ? "var(--accent-bg)" : "transparent"}`,
              cursor: "pointer",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
