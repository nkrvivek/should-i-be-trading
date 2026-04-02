import { lazy, Suspense, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRegime } from "../hooks/useRegime";
import { usePortfolio } from "../hooks/usePortfolio";
import { useWatchlists } from "../hooks/useWatchlists";
import { useMarketHours } from "../hooks/useMarketHours";
import { useMarketScore } from "../hooks/useMarketScore";
import { computeVerdict } from "../lib/trafficLight";
import { TerminalShell } from "../components/layout/TerminalShell";
import { TabBar, type TabDef } from "../components/layout/TabBar";
import { Panel } from "../components/layout/Panel";
import { WorkflowHandoffCard } from "../components/shared/WorkflowHandoffCard";
import { TickerPicker, type TickerPickerOption } from "../components/shared/TickerPicker";
const ChatPanel = lazy(() => import("../components/ai/ChatPanel").then(m => ({ default: m.ChatPanel })));
const ResearchPanel = lazy(() => import("../components/ai/ResearchPanel").then(m => ({ default: m.ResearchPanel })));
const ScreenerPanel = lazy(() => import("../components/ai/ScreenerPanel").then(m => ({ default: m.ScreenerPanel })));

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
  const symbolParam = (searchParams.get("symbol") || "").trim().toUpperCase();
  const { data: cri } = useRegime(true);
  const { data: portfolio } = usePortfolio();
  const { activeWatchlist } = useWatchlists();
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
  const selectedSymbol = symbolParam || inferFocusedSymbol(portfolio?.positions?.[0]?.ticker);
  const tickerPickerOptions = useMemo(
    () => buildTickerPickerOptions(selectedSymbol, portfolio?.positions?.map((position) => position.ticker), activeWatchlist?.tickers),
    [activeWatchlist?.tickers, portfolio?.positions, selectedSymbol],
  );
  const chatPrompt = selectedSymbol
    ? `Walk me through the current thesis for ${selectedSymbol}. What would need to be true for this setup to deserve attention right now?`
    : undefined;

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

  const setSelectedSymbol = (symbol: string) => {
    const normalizedSymbol = inferFocusedSymbol(symbol);
    if (!normalizedSymbol) return;
    const next = new URLSearchParams(searchParams);
    next.set("tab", "ticker");
    if (!TICKER_TABS.some((tab) => tab.id === next.get("view"))) {
      next.set("view", "research");
    }
    next.set("symbol", normalizedSymbol);
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
                  onClick: () => navigate(primaryTab === "ticker" ? selectedSymbol ? `/trading?symbol=${selectedSymbol}` : "/trading" : "/signals"),
                },
                {
                  label: "View Progress",
                  onClick: () => navigate("/progress"),
                  tone: "secondary",
                },
              ]}
            />
          </div>

          {primaryTab === "ticker" && (
            <div style={{ marginBottom: 12 }}>
              <TickerWorkspaceHeader
                symbol={selectedSymbol}
                options={tickerPickerOptions}
                onSelectSymbol={setSelectedSymbol}
                onOpenComposite={() => navigate("/research?tab=composite")}
                onOpenTrading={() => navigate(selectedSymbol ? `/trading?symbol=${selectedSymbol}` : "/trading")}
              />
            </div>
          )}

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
            <Suspense fallback={loading}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(320px, 0.9fr)", gap: 12, minHeight: 500 }}>
              <Panel title="Ticker Conversation">
                <ChatPanel cri={cri} portfolio={portfolio} verdict={verdict} initialPrompt={chatPrompt} />
              </Panel>
              <Panel title="Why This Matters">
                <div style={contextStackStyle}>
                  <ResearchSummaryCard
                    title="Ask for a thesis, not just facts"
                    body={selectedSymbol
                      ? `Use AI Chat to challenge the thesis for ${selectedSymbol}, compare strategies, or pressure-test why it deserves attention right now.`
                      : "Use AI Chat to challenge a setup, compare strategies, or pressure-test why a ticker deserves attention right now."}
                  />
                  <ResearchSummaryCard
                    title="Keep the workflow connected"
                    body={selectedSymbol
                      ? `If ${selectedSymbol} survives the thesis check, move into Research or Fundamentals next. If not, go back to Composite and keep triaging.`
                      : "If the thesis survives, move into Research or Fundamentals next. If not, go back to Composite and keep triaging."}
                  />
                </div>
              </Panel>
            </div>
            </Suspense>
          )}

          {primaryTab === "ticker" && tickerView === "research" && (
            <Suspense fallback={loading}>
              <Panel title="Ticker Research">
                <ResearchPanel initialQuery={selectedSymbol} />
              </Panel>
            </Suspense>
          )}

          {primaryTab === "ticker" && tickerView === "fundamentals" && (
            <Suspense fallback={loading}>
              <FundamentalsContent initialSymbol={selectedSymbol} />
            </Suspense>
          )}

          {primaryTab === "more" && moreView === "screener" && (
            <Suspense fallback={loading}>
              <Panel title="AI Stock Screener">
                <ScreenerPanel />
              </Panel>
            </Suspense>
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

function TickerWorkspaceHeader({
  symbol,
  options,
  onSelectSymbol,
  onOpenComposite,
  onOpenTrading,
}: {
  symbol: string;
  options: TickerPickerOption[];
  onSelectSymbol: (symbol: string) => void;
  onOpenComposite: () => void;
  onOpenTrading: () => void;
}) {
  return (
    <Panel title="Ticker Workspace">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={workspaceHeroStyle}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--signal-core)", letterSpacing: "0.08em", marginBottom: 6 }}>
              FOCUSED WORKSPACE
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
              {symbol ? `Working on ${symbol}` : "Choose one ticker and stay with it"}
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Use one symbol across thesis, research, and fundamentals. Once the case is coherent, hand it off into Trading review instead of bouncing across unrelated tabs.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={onOpenComposite} style={secondaryTabActionStyle}>OPEN COMPOSITE</button>
            <button type="button" onClick={onOpenTrading} style={primaryTabActionStyle}>OPEN TRADING REVIEW</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, alignItems: "start" }}>
          <TickerPicker
            value={symbol}
            onSelect={onSelectSymbol}
            options={options}
            placeholder="AAPL, NVDA, Microsoft, SPY..."
          />
          <div style={selectionSummaryStyle}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em" }}>
              CURRENT SYMBOL
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700, color: symbol ? "var(--text-primary)" : "var(--text-muted)" }}>
              {symbol || "---"}
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>
              {symbol
                ? "The selected ticker stays in the URL, so the thesis, research, and fundamentals views stay aligned."
                : "Pick a ticker once, then work the same symbol through the full research flow."}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {options.slice(0, 10).map((candidate) => {
            const active = candidate.symbol === symbol;
            return (
              <button
                key={`${candidate.symbol}-${candidate.hint ?? "picker"}`}
                type="button"
                onClick={() => onSelectSymbol(candidate.symbol)}
                style={{
                  ...secondaryTabActionStyle,
                  borderColor: active ? "var(--signal-core)" : "var(--border-dim)",
                  color: active ? "var(--signal-core)" : "var(--text-secondary)",
                  background: active ? "rgba(5, 173, 152, 0.12)" : "transparent",
                }}
              >
                {candidate.symbol}
                {candidate.hint ? ` • ${candidate.hint}` : ""}
              </button>
            );
          })}
        </div>
      </div>
    </Panel>
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

function inferFocusedSymbol(symbol?: string | null): string {
  return symbol?.trim().toUpperCase() || "";
}

function buildTickerPickerOptions(
  selectedSymbol: string,
  portfolioSymbols?: Array<string | null | undefined>,
  watchlistSymbols?: string[],
): TickerPickerOption[] {
  const options: TickerPickerOption[] = [];
  const seen = new Set<string>();

  const add = (symbol: string | null | undefined, hint: string) => {
    const normalized = inferFocusedSymbol(symbol);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    options.push({ symbol: normalized, hint });
  };

  add(selectedSymbol, "Current");
  portfolioSymbols?.forEach((symbol) => add(symbol, "Portfolio"));
  watchlistSymbols?.forEach((symbol) => add(symbol, "Watchlist"));
  ["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "AMZN", "META", "TSLA"].forEach((symbol) => add(symbol, "Quick pick"));

  return options;
}

const contextStackStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minHeight: 0,
};

const workspaceHeroStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
  padding: 14,
  borderRadius: 8,
  border: "1px solid rgba(5, 173, 152, 0.25)",
  background: "linear-gradient(180deg, rgba(5, 173, 152, 0.08), rgba(5, 173, 152, 0.02))",
};

const selectionSummaryStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const primaryTabActionStyle: React.CSSProperties = {
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

const secondaryTabActionStyle: React.CSSProperties = {
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
