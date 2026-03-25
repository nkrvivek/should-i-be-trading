/**
 * SIGNALS hub — regime analysis, macro data, backtesting, strategy simulator.
 *
 * Sub-tabs: REGIME | MACRO | BACKTEST | SIMULATOR
 * Consolidates: RegimePage + MacroPage + BacktestPage + StrategiesPage
 */

import { lazy, Suspense } from "react";
import { TerminalShell } from "../components/layout/TerminalShell";
import { TabBar, useActiveTab, type TabDef } from "../components/layout/TabBar";
import { useRegime } from "../hooks/useRegime";

// Lazy-load sub-tab content to keep initial bundle light
const RegimeContent = lazy(() => import("./partials/RegimeContent"));
const MacroContent = lazy(() => import("./partials/MacroContent"));
const BacktestContent = lazy(() => import("./partials/BacktestContent"));
const SimulatorContent = lazy(() => import("./partials/SimulatorContent"));

const TABS: TabDef[] = [
  { id: "regime", label: "Regime" },
  { id: "macro", label: "Macro" },
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

  return (
    <TerminalShell cri={cri}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 0, height: "calc(100vh - 96px)" }}>
        <TabBar tabs={TABS} />

        <div style={{ flex: 1, overflow: "auto", padding: "12px 0" }}>
          <Suspense fallback={loading}>
            {activeTab === "regime" && <RegimeContent />}
            {activeTab === "macro" && <MacroContent />}
            {activeTab === "backtest" && <BacktestContent />}
            {activeTab === "simulator" && <SimulatorContent />}
          </Suspense>
        </div>
      </div>
    </TerminalShell>
  );
}
