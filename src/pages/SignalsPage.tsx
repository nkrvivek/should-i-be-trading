import { lazy, Suspense, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TerminalShell } from "../components/layout/TerminalShell";
import { TabBar, type TabDef } from "../components/layout/TabBar";
import { useRegime } from "../hooks/useRegime";
import { WorkflowHandoffCard } from "../components/shared/WorkflowHandoffCard";

const RegimeContent = lazy(() => import("./partials/RegimeContent"));
const MacroContent = lazy(() => import("./partials/MacroContent"));
const CotContent = lazy(() => import("./partials/CotContent"));
const BacktestContent = lazy(() => import("./partials/BacktestContent"));
const SimulatorContent = lazy(() => import("./partials/SimulatorContent"));
const ActivityContent = lazy(() => import("./partials/ActivityContent"));

const PRIMARY_TABS: TabDef[] = [
  { id: "validation", label: "Validation" },
  { id: "practice", label: "Practice" },
  { id: "advanced", label: "Advanced" },
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

  const secondaryTabs = primaryTab === "validation"
    ? VALIDATION_TABS
    : primaryTab === "practice"
      ? PRACTICE_TABS
      : ADVANCED_TABS;

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
            <WorkflowHandoffCard
              eyebrow="Next Step"
              title={primaryTab === "validation"
                ? "Use this to decide whether the setup deserves action."
                : primaryTab === "practice"
                  ? "Turn practice into a cleaner real workflow."
                  : "Advanced context should support, not replace, the main process."}
              body={primaryTab === "validation"
                ? "Validation is where you confirm or reject the setup. If it still holds, move into Trade review. If not, go back to Research and keep triaging."
                : primaryTab === "practice"
                  ? "Once the simulator or activity view makes the setup clear, move into Trade review or log the lesson in Progress."
                  : "Macro and COT should sharpen conviction, not become a detour. Use them when they change risk framing."}
              actions={[
                {
                  label: primaryTab === "practice" ? "Open Trading" : "Open Research",
                  onClick: () => navigate(primaryTab === "practice" ? "/trading" : "/research"),
                },
                {
                  label: "Open Progress",
                  onClick: () => navigate("/progress"),
                  tone: "secondary",
                },
              ]}
            />
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
