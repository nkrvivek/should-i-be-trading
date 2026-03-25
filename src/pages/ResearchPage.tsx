/**
 * RESEARCH hub — unified AI, fundamentals, news, institutional, earnings, insider research.
 *
 * Sub-tabs: AI CHAT | FUNDAMENTALS | TECHNICAL | NEWS | 13F TRACKER | EARNINGS | INSIDER
 *
 * AI Chat tab has a side panel with Research (Exa) + AI Screener toggles.
 * No separate Screener top-level tab — it lives inside Chat to avoid redundancy.
 */

import { lazy, Suspense, useMemo, useState } from "react";
import { useRegime } from "../hooks/useRegime";
import { usePortfolio } from "../hooks/usePortfolio";
import { useMarketHours } from "../hooks/useMarketHours";
import { useMarketScore } from "../hooks/useMarketScore";
import { computeVerdict } from "../lib/trafficLight";
import { TerminalShell } from "../components/layout/TerminalShell";
import { TabBar, useActiveTab, type TabDef } from "../components/layout/TabBar";
import { Panel } from "../components/layout/Panel";
import { ChatPanel } from "../components/ai/ChatPanel";
import { ResearchPanel } from "../components/ai/ResearchPanel";
import { ScreenerPanel } from "../components/ai/ScreenerPanel";

// Lazy-load heavier sub-tab content
const EarningsContent = lazy(() => import("./partials/EarningsContent"));
const InsiderContent = lazy(() => import("./partials/InsiderContent"));
const FundamentalsContent = lazy(() => import("./partials/FundamentalsContent"));
const InstitutionalContent = lazy(() => import("./partials/InstitutionalContent"));
const NewsContent = lazy(() => import("./partials/NewsContent"));
const TechnicalContent = lazy(() => import("./partials/TechnicalContent"));

const TABS: TabDef[] = [
  { id: "chat", label: "AI Chat" },
  { id: "fundamentals", label: "Fundamentals" },
  { id: "technical", label: "Technical", badge: "NEW", badgeColor: "var(--signal-core)" },
  { id: "news", label: "News" },
  { id: "institutional", label: "13F Tracker" },
  { id: "earnings", label: "Earnings" },
  { id: "insider", label: "Insider" },
];

const loading = (
  <div style={{ padding: 32, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
    Loading...
  </div>
);

export default function ResearchPage() {
  const activeTab = useActiveTab(TABS);
  const { data: cri } = useRegime(true);
  const { data: portfolio } = usePortfolio();
  const { status } = useMarketHours();
  const { score: marketScore } = useMarketScore();

  const verdict = useMemo(
    () =>
      computeVerdict({
        cri,
        marketStatus: status,
        marketScore,
      }),
    [cri, status, marketScore],
  );

  // Chat sub-tab layout: side panel toggle (research vs screener)
  const [rightPanel, setRightPanel] = useState<"research" | "screener">("research");

  return (
    <TerminalShell cri={cri}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 0, height: "calc(100vh - 96px)" }}>
        <TabBar tabs={TABS} />

        <div style={{ flex: 1, overflow: "auto", padding: "12px 0" }}>
          {activeTab === "chat" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, minHeight: 500 }}>
              <Panel title="Claude Analysis">
                <ChatPanel cri={cri} portfolio={portfolio} verdict={verdict} />
              </Panel>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    padding: "0 8px",
                    borderBottom: "1px solid var(--border-dim)",
                    background: "var(--bg-panel)",
                  }}
                >
                  <button style={miniTab(rightPanel === "research")} onClick={() => setRightPanel("research")}>
                    RESEARCH
                  </button>
                  <button style={miniTab(rightPanel === "screener")} onClick={() => setRightPanel("screener")}>
                    AI SCREENER
                  </button>
                </div>
                <Panel title={rightPanel === "research" ? "Research (Exa)" : "AI Stock Screener"}>
                  {rightPanel === "research" ? <ResearchPanel /> : <ScreenerPanel />}
                </Panel>
              </div>
            </div>
          )}

          {activeTab === "fundamentals" && (
            <Suspense fallback={loading}>
              <FundamentalsContent />
            </Suspense>
          )}

          {activeTab === "technical" && (
            <Suspense fallback={loading}>
              <TechnicalContent />
            </Suspense>
          )}

          {activeTab === "news" && (
            <Suspense fallback={loading}>
              <NewsContent />
            </Suspense>
          )}

          {activeTab === "institutional" && (
            <Suspense fallback={loading}>
              <InstitutionalContent />
            </Suspense>
          )}

          {activeTab === "earnings" && (
            <Suspense fallback={loading}>
              <EarningsContent />
            </Suspense>
          )}

          {activeTab === "insider" && (
            <Suspense fallback={loading}>
              <InsiderContent />
            </Suspense>
          )}
        </div>
      </div>
    </TerminalShell>
  );
}

function miniTab(active: boolean): React.CSSProperties {
  return {
    padding: "4px 12px",
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    fontWeight: active ? 700 : 400,
    color: active ? "var(--accent-bg)" : "var(--text-muted)",
    background: "none",
    border: "none",
    borderBottom: active ? "2px solid var(--accent-bg)" : "2px solid transparent",
    cursor: "pointer",
  };
}
