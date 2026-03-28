/**
 * SIGNALS hub — regime analysis, macro data, COT positioning, backtesting, strategy simulator.
 *
 * Sub-tabs: REGIME | MACRO | COT | BACKTEST | SIMULATOR
 * Consolidates: RegimePage + MacroPage + BacktestPage + StrategiesPage + COT Dashboard
 *
 * Uses visited-tabs pattern: tabs mount on first visit and stay mounted (display:none)
 * to prevent full remount/re-fetch on every tab switch.
 */

import { lazy, Suspense, useState, useEffect } from "react";
import { TerminalShell } from "../components/layout/TerminalShell";
import { TabBar, useActiveTab, type TabDef } from "../components/layout/TabBar";
import { useRegime } from "../hooks/useRegime";

// Lazy-load sub-tab content to keep initial bundle light
const RegimeContent = lazy(() => import("./partials/RegimeContent"));
const MacroContent = lazy(() => import("./partials/MacroContent"));
const CotContent = lazy(() => import("./partials/CotContent"));
const BacktestContent = lazy(() => import("./partials/BacktestContent"));
const SimulatorContent = lazy(() => import("./partials/SimulatorContent"));

const TABS: TabDef[] = [
  { id: "regime", label: "Regime" },
  { id: "macro", label: "Macro" },
  { id: "cot", label: "COT", badge: "NEW", badgeColor: "var(--signal-core)" },
  { id: "backtest", label: "Backtest" },
  { id: "simulator", label: "Simulator" },
];

const loading = (
  <div style={{ padding: 32, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
    Loading...
  </div>
);

export default function SignalsPage() {
  const activeTab = useActiveTab(TABS);
  const { data: cri } = useRegime(true);

  // Track which tabs have been visited so we mount on first visit and keep mounted
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([activeTab]));

  useEffect(() => {
    setVisitedTabs((prev) => { // eslint-disable-line react-hooks/set-state-in-effect
      if (prev.has(activeTab)) return prev;
      return new Set([...prev, activeTab]);
    });
  }, [activeTab]);

  return (
    <TerminalShell cri={cri}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 0 }}>
        <TabBar tabs={TABS} />

        <div style={{ padding: "12px 0" }}>
          {visitedTabs.has("regime") && (
            <div style={{ display: activeTab === "regime" ? "block" : "none" }}>
              <Suspense fallback={loading}><RegimeContent /></Suspense>
            </div>
          )}
          {visitedTabs.has("macro") && (
            <div style={{ display: activeTab === "macro" ? "block" : "none" }}>
              <Suspense fallback={loading}><MacroContent /></Suspense>
            </div>
          )}
          {visitedTabs.has("cot") && (
            <div style={{ display: activeTab === "cot" ? "block" : "none" }}>
              <Suspense fallback={loading}><CotContent /></Suspense>
            </div>
          )}
          {visitedTabs.has("backtest") && (
            <div style={{ display: activeTab === "backtest" ? "block" : "none" }}>
              <Suspense fallback={loading}><BacktestContent /></Suspense>
            </div>
          )}
          {visitedTabs.has("simulator") && (
            <div style={{ display: activeTab === "simulator" ? "block" : "none" }}>
              <Suspense fallback={loading}><SimulatorContent /></Suspense>
            </div>
          )}
        </div>
      </div>
    </TerminalShell>
  );
}
