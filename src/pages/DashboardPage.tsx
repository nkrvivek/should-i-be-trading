import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMarketHours } from "../hooks/useMarketHours";
import { useSignalHistory } from "../hooks/useSignalHistory";
import { useMarketScore } from "../hooks/useMarketScore";
import { useRegimeMonitor } from "../hooks/useRegimeMonitor";
import { useAlertEvaluator } from "../hooks/useAlertEvaluator";
import { useTradeJournal } from "../hooks/useTradeJournal";
import { useWatchlists } from "../hooks/useWatchlists";
import { useStockMetrics } from "../hooks/useStockMetrics";
import { computeVerdict, type VixRegimeAction } from "../lib/trafficLight";
import { estimateStockScoreFromMetrics } from "../lib/estimatedStockScore";
import { getCompositeTradeScore } from "../hooks/useCompositeTradeScore";
import { WORKFLOW_PRESETS, WORKFLOW_OPTIONS } from "../lib/workflowPresets";
import { TerminalShell } from "../components/layout/TerminalShell";
import { ScoreBreakdown } from "../components/regime/ScoreBreakdown";
import { SignalTimeline } from "../components/regime/SignalTimeline";
import { DailyBriefing } from "../components/regime/DailyBriefing";
import { SectorHeatMap } from "../components/market/SectorHeatMap";
import { TickerChart } from "../components/market/TickerChart";
import { WatchlistManager } from "../components/watchlist/WatchlistManager";
import { Panel } from "../components/layout/Panel";
import { FearGreedGauge } from "../components/dashboard/FearGreedGauge";
import { ScoreHistoryChart } from "../components/dashboard/ScoreHistoryChart";
import { ActionCard } from "../components/dashboard/ActionCard";
import { MiniStat } from "../components/dashboard/MiniStat";
import { ProgressNote } from "../components/dashboard/ProgressNote";
import { ChecklistRow } from "../components/dashboard/ChecklistRow";
import { EmptyState } from "../components/dashboard/EmptyState";
import { ExpandableWorkspaceCard } from "../components/dashboard/ExpandableWorkspaceCard";
import { CompactStanceRow } from "../components/dashboard/CompactStanceRow";
import { TradeVerdictBadgeWithScore } from "../components/trading/TradeVerdictBadge";
import { TickerWithCompanyName } from "../components/shared/TickerWithCompanyName";
import { useAppStore, type WorkflowProfile } from "../stores/appStore";

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    workflowProfile,
    setWorkflowProfile,
    hasChosenWorkflowProfile,
    workflowProfilePromptDismissed,
    dismissWorkflowProfilePrompt,
  } = useAppStore();
  const { status } = useMarketHours();
  const { history, recordVerdict } = useSignalHistory();
  const { score: marketScore, loading: scoreLoading, refresh: refreshScore } = useMarketScore();
  const { regime } = useRegimeMonitor();
  const { openTrades, entries, stats: journalStats } = useTradeJournal();
  const { activeWatchlist } = useWatchlists();
  const { metrics, loading: metricsLoading, progress: metricsProgress } = useStockMetrics();

  const verdict = useMemo(
    () =>
      computeVerdict({
        cri: null,
        marketStatus: status,
        marketScore,
      }),
    [status, marketScore],
  );

  useAlertEvaluator(marketScore, verdict);

  useEffect(() => {
    if (verdict && marketScore) {
      recordVerdict(verdict, marketScore.total ?? null, null);
    }
  }, [verdict.signal, marketScore?.total]); // eslint-disable-line react-hooks/exhaustive-deps

  const marketRevision = marketScore?.timestamp ?? 0;
  const regimeRevision = regime?.timestamp ?? 0;
  const topOpportunities = useMemo(() => {
    void marketRevision;
    void regimeRevision;

    return metrics
      .map((metric) => {
        const estimated = estimateStockScoreFromMetrics(metric);
        const composite = getCompositeTradeScore(metric.symbol, {
          stockScoreComposite: estimated.composite,
        });

        if (!composite) return null;

        return {
          symbol: metric.symbol,
          sector: metric.sector,
          price: metric.currentPrice,
          overall: composite.overall,
          confidence: composite.confidence,
          verdict: composite.verdict,
          stockScore: estimated.composite,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => {
        if (b.overall !== a.overall) return b.overall - a.overall;
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        return a.symbol.localeCompare(b.symbol);
      })
      .slice(0, 5);
  }, [marketRevision, metrics, regimeRevision]);

  const watchlistFocus = useMemo(
    () => activeWatchlist.tickers.slice(0, 5),
    [activeWatchlist.tickers],
  );

  const lastJournalEntry = entries[0] ?? null;
  const stance = regime?.actionStance ?? verdict.vixRegime.label;
  const regimeLabel = regime?.marketState ?? verdict.signal.replace("_", " ");
  const workflowPreset = WORKFLOW_PRESETS[workflowProfile];
  const [showDeeperMarketDetail, setShowDeeperMarketDetail] = useState(false);
  const [showWatchlistWorkspace, setShowWatchlistWorkspace] = useState(false);
  const [showSignalHistory, setShowSignalHistory] = useState(false);
  const showWorkflowPrompt = !hasChosenWorkflowProfile && !workflowProfilePromptDismissed;

  const verdictColor = verdict.signal === "TRADE"
    ? "var(--positive)"
    : verdict.signal === "NO_TRADE"
      ? "var(--negative)"
      : "var(--warning)";

  return (
    <TerminalShell>
      {scoreLoading && !marketScore && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 4px", marginBottom: 4 }}>
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--positive)", animation: "pulse 1.5s infinite" }} />
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--positive)" }}>
            Computing market quality score...
          </span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 1400, margin: "0 auto" }}>
        {showWorkflowPrompt && (
          <Panel title="Choose Your Default Workflow">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ padding: "8px 4px 16px" }}>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700, color: "var(--positive)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                  First-Run Setup
                </div>
                <div className="heading-tight" style={{ fontFamily: "var(--font-sans)", fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                  Make the app feel more like your process.
                </div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.65, color: "var(--text-secondary)", maxWidth: 860 }}>
                  Pick the workflow that matches how you trade right now. This changes the default guidance across Home and the rest of the product without hiding any of the core tools you already have.
                </div>
              </div>
              {WORKFLOW_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setWorkflowProfile(option.id)}
                  className="list-row"
                >
                  <div className="list-row-main">
                    <span className="list-row-label" style={{ fontSize: 14 }}>{option.label}</span>
                    <span className="list-row-sublabel" style={{ fontSize: 13, lineHeight: 1.55 }}>{WORKFLOW_PRESETS[option.id].summary}</span>
                  </div>
                </button>
              ))}
              <div style={{ paddingTop: 12 }}>
                <button type="button" onClick={dismissWorkflowProfilePrompt} className="btn btn-ghost btn-sm">
                  Choose Later
                </button>
              </div>
            </div>
          </Panel>
        )}

        {/* ── Hero: score + verdict + history chart ── */}
        <div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
            Market Quality Score
          </div>
          <div className="heading-tight num-tabular" style={{ fontFamily: "var(--font-sans)", fontSize: 56, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
            {marketScore ? marketScore.total : "--"}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 700, color: verdictColor }}>
              {verdict.signal.replace("_", " ")}
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)" }}>
              {verdict.confidence}% confidence &middot; {regimeLabel}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <ScoreHistoryChart history={history} />
          </div>
        </div>

        {/* ── Signals | Today's Plan ── */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 28 }}>
          <div className="list-section">
            <div className="list-section-header">Signals</div>
            <div className="list-row">
              <div className="list-row-main">
                <span className="list-row-label" style={{ fontSize: 14 }}>Verdict</span>
                <span className="list-row-sublabel">{verdict.reasons[0] ?? "No active reasons"}</span>
              </div>
              <div className="list-row-value">
                <span className="list-row-number" style={{ fontSize: 15, color: verdictColor }}>{verdict.signal.replace("_", " ")}</span>
                <span className="list-row-delta" style={{ color: "var(--text-muted)", fontWeight: 400 }}>{verdict.confidence}% confidence</span>
              </div>
            </div>

            {marketScore?.categories.map((cat) => {
              const tone = categoryTone(cat.score);
              return (
                <div key={cat.name} className="list-row">
                  <div className="list-row-main">
                    <span className="list-row-label" style={{ fontSize: 14 }}>{cat.name}</span>
                    <span className="list-row-sublabel">{(cat.weight * 100).toFixed(0)}% weight &middot; {cat.detail}</span>
                  </div>
                  <div className="list-row-value">
                    <span className="list-row-number num-tabular" style={{ fontSize: 15, color: tone.color }}>{cat.score}</span>
                    <span className="list-row-delta" style={{ color: tone.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>{tone.word}</span>
                  </div>
                </div>
              );
            })}

            <div className="list-row">
              <div className="list-row-main">
                <span className="list-row-label" style={{ fontSize: 14 }}>VIX Regime</span>
                <span className="list-row-sublabel">{verdict.vixRegime.detail}</span>
              </div>
              <span className="list-row-number" style={{ fontSize: 14, color: vixRegimeColor(verdict.vixRegime.action) }}>{verdict.vixRegime.label}</span>
            </div>

            {verdict.overrides.length > 0 && (
              <div className="list-row">
                <div className="list-row-main">
                  <span className="list-row-label" style={{ fontSize: 14 }}>Consider</span>
                  <span className="list-row-sublabel" style={{ fontStyle: "italic" }}>{verdict.overrides[0]}</span>
                </div>
              </div>
            )}
          </div>

          <div className="list-section">
            <div className="list-section-header">Today&apos;s Plan</div>
            <div style={{ padding: "0 4px 12px" }}>
              <div className="heading-tight" style={{ fontFamily: "var(--font-sans)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                {stance}
              </div>
              <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>
                {workflowPreset.stanceCopy}
              </p>
            </div>
            <CompactStanceRow label="Bias" value={getBiasLabel(stance)} />
            <CompactStanceRow label="Best Fit" value={getBestFitLabel(workflowProfile, stance)} />
            <CompactStanceRow label="Risk Note" value={getRiskNote(status, marketScore?.total ?? null)} />

            <div className="list-row" style={{ alignItems: "flex-start" }}>
              <div className="list-row-main">
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700, color: "var(--positive)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  What To Do Today
                </span>
                <span className="list-row-label" style={{ fontSize: 14 }}>{getTodayActionTitle(workflowProfile, status, stance)}</span>
                <span className="list-row-sublabel" style={{ fontSize: 13, lineHeight: 1.5 }}>{getTodayActionBody(workflowProfile, status, stance)}</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "16px 4px" }}>
              <MiniStat label="Window" value={marketScore ? `${marketScore.executionWindow}%` : "---"} tone="var(--warning)" />
              <MiniStat label="Score" value={marketScore ? `${marketScore.total}/100` : "---"} tone="var(--positive)" />
            </div>

            <div className="list-section-header" style={{ paddingTop: 12 }}>Workflow Profile</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "0 4px 12px" }}>
              {WORKFLOW_OPTIONS.map((option) => {
                const active = option.id === workflowProfile;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setWorkflowProfile(option.id)}
                    className={`btn btn-sm ${active ? "btn-primary" : "btn-secondary"}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.45, padding: "0 4px 16px" }}>
              {workflowPreset.summary}
            </div>

            <ActionCard
              eyebrow="Research"
              title={workflowPreset.researchTitle}
              body={topOpportunities.length
                ? `${topOpportunities[0].symbol} leads the current composite list. ${workflowPreset.researchBody}`
                : metricsLoading
                  ? `Loading fundamentals universe ${metricsProgress.done}/${metricsProgress.total}`
                  : workflowPreset.researchFallback}
              cta={workflowPreset.researchCta}
              secondary={watchlistFocus.length ? workflowPreset.researchSecondary : undefined}
              onClick={() => navigate("/research?tab=composite")}
              onSecondaryClick={watchlistFocus.length ? () => navigate("/research") : undefined}
            />
            <ActionCard
              eyebrow="Trade"
              title={openTrades.length ? `${openTrades.length} trade${openTrades.length === 1 ? "" : "s"} need follow-up` : workflowPreset.tradeTitle}
              body={openTrades.length
                ? `You have ${openTrades.length} open journal ${openTrades.length === 1 ? "entry" : "entries"} to revisit. Close the loop with execution review and journaling.`
                : workflowPreset.tradeBody}
              cta={openTrades.length ? "Open Journal" : workflowPreset.tradeCta}
              secondary={workflowPreset.tradeSecondary}
              onClick={() => navigate(openTrades.length ? "/trading?tab=journal" : "/trading")}
              onSecondaryClick={() => navigate("/trading")}
            />

            {marketScore && (
              <>
                <div className="list-section-header" style={{ paddingTop: 12 }}>Market Pulse</div>
                <div style={{ padding: "0 4px 8px" }}>
                  <FearGreedGauge score={marketScore.total} />
                </div>
              </>
            )}
          </div>
        </div>

        <DailyBriefing cri={null} verdict={verdict} marketScore={marketScore} />

        {/* ── Positions | Top Opportunities ── */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)", gap: 28 }}>
          <div className="list-section">
            <div className="list-section-header">Positions</div>
            <div className="list-row">
              <div className="list-row-main">
                <span className="list-row-label" style={{ fontSize: 14 }}>Closed Trades</span>
                <span className="list-row-sublabel">Win rate {journalStats.winRate.toFixed(0)}%</span>
              </div>
              <span className="list-row-number num-tabular" style={{ fontSize: 20 }}>{journalStats.totalTrades}</span>
            </div>

            {openTrades.length === 0 ? (
              <EmptyState text="No open positions — trade journal is clear." />
            ) : (
              openTrades.map((trade) => (
                <div key={trade.id} className="list-row">
                  <div className="list-row-main">
                    <span className="list-row-label" style={{ fontSize: 14 }}>{trade.ticker}</span>
                    <span className="list-row-sublabel">{trade.strategy} &middot; {trade.direction}</span>
                  </div>
                  <div className="list-row-value">
                    <span className="list-row-number num-tabular" style={{ fontSize: 15 }}>${trade.entry.price.toFixed(2)}</span>
                    <span className="list-row-delta" style={{ color: directionColor(trade.direction), textTransform: "uppercase", letterSpacing: "0.04em" }}>Open</span>
                  </div>
                </div>
              ))
            )}

            <ProgressNote
              label="Journal"
              value={lastJournalEntry ? `Last logged: ${lastJournalEntry.ticker} ${lastJournalEntry.strategy}` : "No trades logged yet"}
              detail={journalStats.totalTrades > 0
                ? `Win rate ${journalStats.winRate.toFixed(0)}% &middot; Avg P&L ${formatCurrency(journalStats.avgPnl)}`
                : "Use the journal to reinforce process quality, not just P&L."}
            />
          </div>

          <div className="list-section">
            <div className="list-section-header">Top Opportunities</div>
            {metricsLoading && topOpportunities.length === 0 ? (
              <EmptyState text={`Loading fundamentals universe... ${metricsProgress.done}/${metricsProgress.total}`} />
            ) : topOpportunities.length === 0 ? (
              <EmptyState text="No composite opportunities surfaced yet." />
            ) : (
              topOpportunities.map((row) => (
                <button
                  key={row.symbol}
                  type="button"
                  onClick={() => navigate("/research?tab=composite")}
                  className="list-row"
                >
                  <div className="list-row-main">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <TickerWithCompanyName symbol={row.symbol} style={{ fontWeight: 700, color: "var(--text-primary)" }} />
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)" }}>{row.sector}</span>
                    </div>
                    <span className="list-row-sublabel">
                      {row.price != null ? `$${row.price.toFixed(2)}` : "---"} &middot; Stock score {row.stockScore.toFixed(1)} &middot; Confidence {Math.round(row.confidence * 100)}%
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span className="heading-tight num-tabular" style={{ fontFamily: "var(--font-sans)", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{row.overall}</span>
                    <TradeVerdictBadgeWithScore symbol={row.symbol} size="sm" showScore={false} inputs={{ stockScoreComposite: row.stockScore }} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Focus List | Next Best Actions ── */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 28 }}>
          <div className="list-section">
            <div className="list-section-header">Focus List</div>
            <ProgressNote
              label="Watchlist"
              value={`${activeWatchlist.name} &middot; ${activeWatchlist.tickers.length} symbols`}
              detail={watchlistFocus.length
                ? `Focus list: ${watchlistFocus.join(", ")}`
                : "Build a short list of names worth revisiting every day."}
            />
            {watchlistFocus.length === 0 ? (
              <EmptyState text="No watchlist symbols yet. Add a short list of names you want to review repeatedly." />
            ) : (
              watchlistFocus.map((symbol) => (
                <div key={symbol} className="list-row">
                  <div className="list-row-main">
                    <TickerWithCompanyName symbol={symbol} style={{ fontWeight: 700, color: "var(--text-primary)" }} />
                    <span className="list-row-sublabel">Open research first, then move to trading only if the setup still holds.</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <TradeVerdictBadgeWithScore symbol={symbol} showScore={false} />
                    <button type="button" onClick={() => navigate(`/research?tab=ticker&view=research&symbol=${symbol}`)} className="btn btn-secondary btn-sm">Research</button>
                    <button type="button" onClick={() => navigate(`/trading?symbol=${symbol}`)} className="btn btn-primary btn-sm">Trade</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="list-section">
            <div className="list-section-header">Next Best Actions</div>
            <ChecklistRow
              title="Start with regime"
              body="Use the market stance to decide whether you should be offensive, selective, or patient."
              cta="Open Signals"
              onClick={() => navigate("/signals?tab=regime")}
            />
            <ChecklistRow
              title="Triage with composite"
              body="Sort the composite screener before spending time on lower-quality names."
              cta="Open Composite"
              onClick={() => navigate("/research?tab=composite")}
            />
            <ChecklistRow
              title="Do one focused ticker review"
              body="Take one name through the ticker workspace instead of bouncing between unrelated tabs."
              cta="Open Ticker Workspace"
              onClick={() => navigate(topOpportunities[0] ? `/research?tab=ticker&view=research&symbol=${topOpportunities[0].symbol}` : "/research?tab=ticker&view=research")}
            />
            <ChecklistRow
              title="Practice before execution"
              body="If the setup is new or complex, route through the simulator before a live order."
              cta="Open Simulator"
              onClick={() => navigate("/signals?tab=simulator")}
            />
            <ChecklistRow
              title="Review and journal"
              body="Close the loop on order quality and trade management instead of just tracking outcomes."
              cta="Open Journal"
              onClick={() => navigate("/trading?tab=journal")}
            />
          </div>
        </div>

        <Panel title="Deeper Workspace">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="list-section">
              <ExpandableWorkspaceCard
                title="Market Detail"
                body="Open the lower-priority market panels only when you want more context behind the top-level stance."
                cta={showDeeperMarketDetail ? "Hide Detail" : "Open Detail"}
                onClick={() => setShowDeeperMarketDetail((value) => !value)}
              />
              <ExpandableWorkspaceCard
                title="Watchlist Workspace"
                body="Keep the watchlist manager available, but don't let it compete with the first-screen decision flow."
                cta={showWatchlistWorkspace ? "Hide Watchlists" : "Open Watchlists"}
                onClick={() => setShowWatchlistWorkspace((value) => !value)}
              />
              <ExpandableWorkspaceCard
                title={`Signal History (${history.length})`}
                body="Use history when you need context on prior stance changes, not as a default homepage focus."
                cta={showSignalHistory ? "Hide History" : "Open History"}
                onClick={() => setShowSignalHistory((value) => !value)}
              />
            </div>

            {showDeeperMarketDetail && (
              <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <ScoreBreakdown score={marketScore} loading={scoreLoading} onRefresh={refreshScore} />
                </div>
                <Panel title="Market Detail">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, minHeight: 460 }}>
                    <div style={{ minHeight: 0 }}>
                      <SectorHeatMap />
                    </div>
                    <div style={{ minHeight: 0 }}>
                      <TickerChart />
                    </div>
                  </div>
                </Panel>
              </div>
            )}

            {showWatchlistWorkspace && <WatchlistManager />}

            {showSignalHistory && (
              <Panel title={`Signal History (${history.length})`}>
                <SignalTimeline history={history} />
              </Panel>
            )}
          </div>
        </Panel>
      </div>
    </TerminalShell>
  );
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function categoryTone(score: number): { color: string; word: string } {
  if (score >= 60) return { color: "var(--positive)", word: "Strong" };
  if (score >= 40) return { color: "var(--warning)", word: "Mixed" };
  return { color: "var(--negative)", word: "Weak" };
}

function vixRegimeColor(action: VixRegimeAction): string {
  if (action === "BUY_AGGRESSIVE" || action === "BUY") return "var(--positive)";
  if (action === "SELL") return "var(--negative)";
  return "var(--warning)";
}

function directionColor(direction: string): string {
  if (direction === "bullish") return "var(--positive)";
  if (direction === "bearish") return "var(--negative)";
  return "var(--text-muted)";
}

function getBiasLabel(stance: string): string {
  const normalized = stance.toLowerCase();
  if (normalized.includes("no trade") || normalized.includes("hedged") || normalized.includes("defensive")) return "Defensive";
  if (normalized.includes("selective") || normalized.includes("caution")) return "Selective";
  return "Offensive";
}

function getBestFitLabel(profile: WorkflowProfile, stance: string): string {
  const defensive = getBiasLabel(stance) === "Defensive";
  if (profile === "options_trader") return defensive ? "Defined-risk only" : "Structured options";
  if (profile === "active_trader") return defensive ? "Wait or trim size" : "Fast validation";
  return defensive ? "Learn or simulate" : "Simple stock setups";
}

function getRiskNote(status: string, score: number | null): string {
  if (status !== "open") return "Market closed";
  if (score != null && score < 45) return "Weak quality tape";
  if (score != null && score < 60) return "Stay selective";
  return "Risk is manageable";
}

function getTodayActionTitle(profile: WorkflowProfile, status: string, stance: string): string {
  if (status !== "open") return profile === "beginner" ? "Use the closed session to learn" : "Prep before the open";
  if (getBiasLabel(stance) === "Defensive") return "Slow down and filter harder";
  if (profile === "options_trader") return "Structure only the clearest setups";
  return "Work only the top-ranked names";
}

function getTodayActionBody(profile: WorkflowProfile, status: string, stance: string): string {
  if (status !== "open") {
    return profile === "beginner"
      ? "Stay in Simulator first, then revisit the top composite names before the next session."
      : "Use this time to narrow watchlist names, review one setup, and queue the next action before the open.";
  }
  if (getBiasLabel(stance) === "Defensive") {
    return "Keep size down, skip marginal names, and route anything unfamiliar through review or simulator first.";
  }
  if (profile === "options_trader") {
    return "Only move into execution after structure, risk, and order quality are already clear.";
  }
  return "Let composite and regime narrow the field, then hand one clean setup into review instead of chasing breadth.";
}
