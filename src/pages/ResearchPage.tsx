import { lazy, Suspense, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRegime } from "../hooks/useRegime";
import { usePortfolio } from "../hooks/usePortfolio";
import { useMarketHours } from "../hooks/useMarketHours";
import { useMarketScore } from "../hooks/useMarketScore";
import { computeVerdict } from "../lib/trafficLight";
import { TerminalShell } from "../components/layout/TerminalShell";
import { TabBar, type TabDef } from "../components/layout/TabBar";
import { Panel } from "../components/layout/Panel";
import { WorkflowHandoffCard } from "../components/shared/WorkflowHandoffCard";
import { ChatPanel } from "../components/ai/ChatPanel";
import { ResearchPanel } from "../components/ai/ResearchPanel";
import { ScreenerPanel } from "../components/ai/ScreenerPanel";

const EarningsContent = lazy(() => import("./partials/EarningsContent"));
const InsiderContent = lazy(() => import("./partials/InsiderContent"));
const FundamentalsContent = lazy(() => import("./partials/FundamentalsContent"));
const CompositeContent = lazy(() => import("./partials/CompositeContent"));
const InstitutionalContent = lazy(() => import("./partials/InstitutionalContent"));
const NewsContent = lazy(() => import("./partials/NewsContent"));
const TechnicalContent = lazy(() => import("./partials/TechnicalContent"));
const SocialContent = lazy(() => import("./partials/SocialContent"));

const PRIMARY_TABS: TabDef[] = [
  { id: "composite", label: "Composite", badge: "NEW", badgeColor: "var(--signal-core)" },
  { id: "ticker", label: "Ticker Research" },
  { id: "earnings", label: "Earnings" },
  { id: "insider", label: "Insider" },
  { id: "more", label: "More Research" },
];

const TICKER_TABS: TabDef[] = [
  { id: "chat", label: "AI Chat" },
  { id: "research", label: "Research" },
  { id: "fundamentals", label: "Fundamentals" },
];

const MORE_TABS: TabDef[] = [
  { id: "screener", label: "AI Screener" },
  { id: "technical", label: "Technical", badge: "NEW", badgeColor: "var(--signal-core)" },
  { id: "news", label: "News" },
  { id: "social", label: "Social", badge: "NEW", badgeColor: "var(--signal-core)" },
  { id: "institutional", label: "13F Tracker" },
];

const LEGACY_TAB_MAP: Record<string, { primary: string; view?: string }> = {
  chat: { primary: "ticker", view: "chat" },
  fundamentals: { primary: "ticker", view: "fundamentals" },
  technical: { primary: "more", view: "technical" },
  news: { primary: "more", view: "news" },
  social: { primary: "more", view: "social" },
  institutional: { primary: "more", view: "institutional" },
};

const loading = (
  <div style={{ padding: 32, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
    Loading...
  </div>
);

export default function ResearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") || "composite";
  const rawView = searchParams.get("view");
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

  useEffect(() => {
    const legacy = LEGACY_TAB_MAP[rawTab];
    if (!legacy) return;

    const next = new URLSearchParams(searchParams);
    next.set("tab", legacy.primary);
    if (legacy.view) next.set("view", legacy.view);
    setSearchParams(next, { replace: true });
  }, [rawTab, searchParams, setSearchParams]);

  const primaryTab = PRIMARY_TABS.some((tab) => tab.id === rawTab)
    ? rawTab
    : LEGACY_TAB_MAP[rawTab]?.primary ?? "composite";

  const tickerView: string = TICKER_TABS.some((tab) => tab.id === rawView)
    ? (rawView ?? "chat")
    : (LEGACY_TAB_MAP[rawTab]?.view ?? "chat");

  const moreView: string = MORE_TABS.some((tab) => tab.id === rawView)
    ? (rawView ?? "screener")
    : (LEGACY_TAB_MAP[rawTab]?.view ?? "screener");

  const selectPrimaryTab = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", id);
    if (id === "ticker" && !TICKER_TABS.some((tab) => tab.id === next.get("view"))) {
      next.set("view", "chat");
    } else if (id === "more" && !MORE_TABS.some((tab) => tab.id === next.get("view"))) {
      next.set("view", "screener");
    } else if (id !== "ticker" && id !== "more") {
      next.delete("view");
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <TerminalShell cri={cri}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 0, height: "calc(100vh - 96px)" }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          borderBottom: "1px solid var(--border-dim)",
          background: "var(--bg-panel)",
        }}>
          <PrimaryTabBar tabs={PRIMARY_TABS} active={primaryTab} onSelect={selectPrimaryTab} />
          {primaryTab === "ticker" && <SecondaryTabBar tabs={TICKER_TABS} />}
          {primaryTab === "more" && <SecondaryTabBar tabs={MORE_TABS} />}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "12px 0" }}>
          <div style={{ marginBottom: 12 }}>
            <WorkflowHandoffCard
              eyebrow="Next Step"
              title={primaryTab === "composite"
                ? "Take the best-ranked name into validation."
                : primaryTab === "ticker"
                  ? "If the thesis holds, move into review."
                  : "Use the signal only if it improves the setup."}
              body={primaryTab === "composite"
                ? "Composite should narrow your attention, not force a trade. After triage, validate with regime, backtest, or simulator before execution."
                : primaryTab === "ticker"
                  ? "Once the ticker-level work is coherent, move into Trade to review structure, order quality, and actual execution choices."
                  : "Secondary research is most useful when it sharpens the setup. If it doesn’t change the decision, go back to the main workflow."}
              actions={[
                {
                  label: primaryTab === "ticker" ? "Open Trading Review" : "Open Signals",
                  onClick: () => navigate(primaryTab === "ticker" ? "/trading" : "/signals"),
                },
                {
                  label: "View Progress",
                  onClick: () => navigate("/progress"),
                  tone: "secondary",
                },
              ]}
            />
          </div>

          {primaryTab === "composite" && (
            <Suspense fallback={loading}>
              <CompositeContent />
            </Suspense>
          )}

          {primaryTab === "earnings" && (
            <Suspense fallback={loading}>
              <EarningsContent />
            </Suspense>
          )}

          {primaryTab === "insider" && (
            <Suspense fallback={loading}>
              <InsiderContent />
            </Suspense>
          )}

          {primaryTab === "ticker" && tickerView === "chat" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(320px, 0.9fr)", gap: 12, minHeight: 500 }}>
              <Panel title="Ticker Conversation">
                <ChatPanel cri={cri} portfolio={portfolio} verdict={verdict} />
              </Panel>
              <Panel title="Why This Matters">
                <div style={contextStackStyle}>
                  <ResearchSummaryCard
                    title="Ask for a thesis, not just facts"
                    body="Use AI Chat to challenge a setup, compare strategies, or pressure-test why a ticker deserves attention right now."
                  />
                  <ResearchSummaryCard
                    title="Keep the workflow connected"
                    body="If the thesis survives, move into Research or Fundamentals next. If not, go back to Composite and keep triaging."
                  />
                </div>
              </Panel>
            </div>
          )}

          {primaryTab === "ticker" && tickerView === "research" && (
            <Panel title="Ticker Research">
              <ResearchPanel />
            </Panel>
          )}

          {primaryTab === "ticker" && tickerView === "fundamentals" && (
            <Suspense fallback={loading}>
              <FundamentalsContent />
            </Suspense>
          )}

          {primaryTab === "more" && moreView === "screener" && (
            <Panel title="AI Stock Screener">
              <ScreenerPanel />
            </Panel>
          )}

          {primaryTab === "more" && moreView === "technical" && (
            <Suspense fallback={loading}>
              <TechnicalContent />
            </Suspense>
          )}

          {primaryTab === "more" && moreView === "news" && (
            <Suspense fallback={loading}>
              <NewsContent />
            </Suspense>
          )}

          {primaryTab === "more" && moreView === "social" && (
            <Suspense fallback={loading}>
              <SocialContent />
            </Suspense>
          )}

          {primaryTab === "more" && moreView === "institutional" && (
            <Suspense fallback={loading}>
              <InstitutionalContent />
            </Suspense>
          )}
        </div>
      </div>
    </TerminalShell>
  );
}

function PrimaryTabBar({ tabs, active, onSelect }: { tabs: TabDef[]; active: string; onSelect: (id: string) => void }) {
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
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {tab.label}
            {tab.badge && (
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "1px 5px",
                borderRadius: 999,
                color: tab.badgeColor ?? "var(--warning)",
                border: `1px solid ${tab.badgeColor ?? "var(--warning)"}`,
                lineHeight: 1,
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SecondaryTabBar({ tabs }: { tabs: TabDef[] }) {
  return (
    <div style={{ padding: "0 12px 8px" }}>
      <TabBar tabs={tabs.map((tab) => ({ ...tab, label: tab.label }))} paramKey="view" />
    </div>
  );
}

function ResearchSummaryCard({ title, body }: { title: string; body: string }) {
  return (
    <div style={{
      padding: 14,
      borderRadius: 8,
      border: "1px solid var(--border-dim)",
      background: "var(--bg-panel-raised)",
    }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>
        {body}
      </div>
    </div>
  );
}

const contextStackStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minHeight: 0,
};
