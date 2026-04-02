import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMarketHours } from "../hooks/useMarketHours";
import { useSignalHistory } from "../hooks/useSignalHistory";
import { useMarketScore } from "../hooks/useMarketScore";
import { useRegimeMonitor } from "../hooks/useRegimeMonitor";
import { useAlertEvaluator } from "../hooks/useAlertEvaluator";
import { useLearningAcademy } from "../hooks/useLearningAcademy";
import { useTradeJournal } from "../hooks/useTradeJournal";
import { useWatchlists } from "../hooks/useWatchlists";
import { useStockMetrics } from "../hooks/useStockMetrics";
import { computeVerdict } from "../lib/trafficLight";
import { computeLearningStats } from "../lib/learningProgress";
import { ALL_LEARNING_LESSONS, LEARNING_TRACKS } from "../lib/academy";
import { isLessonUnlocked } from "../lib/academyUnlock";
import { estimateStockScoreFromMetrics } from "../lib/estimatedStockScore";
import { getCompositeTradeScore } from "../hooks/useCompositeTradeScore";
import { WORKFLOW_PRESETS, WORKFLOW_OPTIONS } from "../lib/workflowPresets";
import { TerminalShell } from "../components/layout/TerminalShell";
import { TrafficLight } from "../components/regime/TrafficLight";
import { ScoreBreakdown } from "../components/regime/ScoreBreakdown";
import { SignalTimeline } from "../components/regime/SignalTimeline";
import { DailyBriefing } from "../components/regime/DailyBriefing";
import { SectorHeatMap } from "../components/market/SectorHeatMap";
import { TickerChart } from "../components/market/TickerChart";
import { WatchlistManager } from "../components/watchlist/WatchlistManager";
import { Panel } from "../components/layout/Panel";
import { FearGreedGauge } from "../components/dashboard/FearGreedGauge";
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

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

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
  const { progress: learningProgress, persistence } = useLearningAcademy();
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

  const learningStats = useMemo(
    () => computeLearningStats(learningProgress, ALL_LEARNING_LESSONS.length),
    [learningProgress],
  );

  const nextLesson = useMemo(
    () => ALL_LEARNING_LESSONS.find((lesson) =>
      !learningProgress.completedLessons[lesson.slug] &&
      isLessonUnlocked(lesson.trackSlug, lesson.slug, learningProgress.completedLessons)
    ) ?? ALL_LEARNING_LESSONS[0],
    [learningProgress.completedLessons],
  );

  const nextLessonTrack = useMemo(
    () => LEARNING_TRACKS.find((track) => track.slug === nextLesson?.trackSlug) ?? null,
    [nextLesson],
  );

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

  return (
    <TerminalShell>
      {scoreLoading && !marketScore && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            background: "rgba(5, 173, 152, 0.08)",
            border: "1px solid rgba(5, 173, 152, 0.2)",
            borderRadius: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--signal-core)",
            marginBottom: 12,
          }}
        >
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--signal-core)", animation: "pulse 1.5s infinite" }} />
          Computing market quality score...
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 1400, margin: "0 auto" }}>
        {showWorkflowPrompt && (
          <Panel title="Choose Your Default Workflow">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={heroCardStyle}>
                <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "var(--signal-core)", letterSpacing: "0.08em", marginBottom: 8 }}>
                  FIRST-RUN SETUP
                </div>
                <div style={{ ...mono, fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                  Make the app feel more like your process.
                </div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.65, color: "var(--text-secondary)", maxWidth: 860 }}>
                  Pick the workflow that matches how you trade right now. This changes the default guidance across Home, Learn, and the rest of the product without hiding any of the core tools you already have.
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                {WORKFLOW_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setWorkflowProfile(option.id)}
                    style={{
                      ...listRowButtonStyle,
                      flexDirection: "column",
                      alignItems: "flex-start",
                      justifyContent: "flex-start",
                    }}
                  >
                    <div style={{ ...mono, fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                      {option.label}
                    </div>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.55, color: "var(--text-secondary)" }}>
                      {WORKFLOW_PRESETS[option.id].summary}
                    </div>
                  </button>
                ))}
              </div>
              <div>
                <button type="button" onClick={dismissWorkflowProfilePrompt} style={secondaryBtnStyle}>
                  Choose Later
                </button>
              </div>
            </div>
          </Panel>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(280px, 0.7fr)", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Panel title="Today">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <TrafficLight verdict={verdict} />
              </div>
            </Panel>
            {marketScore?.categories && marketScore.categories.length > 0 && (
              <div style={presetCardStyle}>
                <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "var(--signal-core)", letterSpacing: "0.08em", marginBottom: 8 }}>
                  SCORE BREAKDOWN
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {marketScore.categories.map((cat) => (
                    <div key={cat.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ ...mono, fontSize: 11, color: "var(--text-muted)" }}>{cat.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 80 }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(148, 163, 184, 0.15)", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(cat.score, 100)}%`, height: "100%", borderRadius: 2, background: cat.score >= 60 ? "var(--signal-core)" : cat.score >= 40 ? "var(--warning)" : "var(--fault)" }} />
                        </div>
                        <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: cat.score >= 60 ? "var(--signal-core)" : cat.score >= 40 ? "var(--warning)" : "var(--fault)", minWidth: 24, textAlign: "right" }}>{cat.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={heroCardStyle}>
              <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "var(--signal-core)", letterSpacing: "0.08em", marginBottom: 6 }}>
                TODAY&apos;S STANCE
              </div>
              <div style={{ ...mono, fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                {stance}
              </div>
              <div style={{ ...mono, fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                {regimeLabel}
              </div>
              <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>
                {workflowPreset.stanceCopy}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                <CompactStanceRow label="Bias" value={getBiasLabel(stance)} />
                <CompactStanceRow label="Best Fit" value={getBestFitLabel(workflowProfile, stance)} />
                <CompactStanceRow label="Risk Note" value={getRiskNote(status, marketScore?.total ?? null)} />
              </div>
            </div>
            <div style={actionCardStyle}>
              <div>
                <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "var(--signal-core)", letterSpacing: "0.08em", marginBottom: 4 }}>
                  WHAT TO DO TODAY
                </div>
                <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                  {getTodayActionTitle(workflowProfile, status, stance)}
                </div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)" }}>
                  {getTodayActionBody(workflowProfile, status, stance)}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <MiniStat label="Window" value={marketScore ? `${marketScore.executionWindow}%` : "---"} tone="var(--warning)" />
                <MiniStat label="Score" value={marketScore ? `${marketScore.total}/100` : "---"} tone="var(--signal-core)" />
              </div>
            </div>
            {marketScore && (
              <div style={marketAccentCardStyle}>
                <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "var(--signal-core)", letterSpacing: "0.08em", marginBottom: 6 }}>
                  MARKET PULSE
                </div>
                <FearGreedGauge score={marketScore.total} />
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={presetCardStyle}>
              <div style={{ ...mono, fontSize: 11, color: "var(--signal-core)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>
                WORKFLOW PROFILE
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                {WORKFLOW_OPTIONS.map((option) => {
                  const active = option.id === workflowProfile;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setWorkflowProfile(option.id)}
                      style={{
                        ...mono,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "5px 9px",
                        borderRadius: 999,
                        border: `1px solid ${active ? "var(--signal-core)" : "var(--border-dim)"}`,
                        background: active ? "rgba(5, 173, 152, 0.12)" : "transparent",
                        color: active ? "var(--signal-core)" : "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.45 }}>
                {workflowPreset.summary}
              </div>
            </div>
              <ActionCard
                eyebrow="Learn"
                title={workflowPreset.learnTitle(nextLesson?.title)}
                body={nextLessonTrack
                  ? `${nextLessonTrack.title} • ${nextLesson.durationMinutes} min • ${nextLesson.riskLevel.toUpperCase()} risk framing • ${workflowPreset.learnBody}`
                  : workflowPreset.learnFallback}
                cta={workflowPreset.learnCta}
                secondary={workflowPreset.learnSecondaryLabel(nextLesson)}
                onClick={() => navigate("/learn")}
                onSecondaryClick={() => {
                  const route = workflowPreset.learnSecondaryRoute(nextLesson);
                  if (route) navigate(route);
                }}
              />
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
            </div>
        </div>

        <DailyBriefing cri={null} verdict={verdict} marketScore={marketScore} />

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)", gap: 12 }}>
          <Panel title="Top Opportunities">
            {metricsLoading && topOpportunities.length === 0 ? (
              <EmptyState text={`Loading fundamentals universe... ${metricsProgress.done}/${metricsProgress.total}`} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {topOpportunities.map((row) => (
                  <button
                    key={row.symbol}
                    type="button"
                    onClick={() => navigate("/research?tab=composite")}
                    style={listRowButtonStyle}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <TickerWithCompanyName symbol={row.symbol} style={{ fontWeight: 700, color: "var(--text-primary)" }} />
                        <span style={{ ...mono, fontSize: 11, color: "var(--text-muted)" }}>{row.sector}</span>
                      </div>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)" }}>
                        {row.price != null ? `$${row.price.toFixed(2)}` : "---"} • Stock score {row.stockScore.toFixed(1)} • Confidence {Math.round(row.confidence * 100)}%
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ ...mono, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{row.overall}</div>
                      <TradeVerdictBadgeWithScore symbol={row.symbol} size="sm" showScore={false} inputs={{ stockScoreComposite: row.stockScore }} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Progress">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
              <MiniStat label="Lessons" value={`${learningStats.completedCount}/${ALL_LEARNING_LESSONS.length}`} tone="var(--text-primary)" />
              <MiniStat label="Streak" value={`${learningStats.currentStreak}d`} tone="var(--warning)" />
              <MiniStat label="Weekly Goal" value={`${learningStats.thisWeekSessions}/${learningStats.weeklyTarget}`} tone="var(--signal-core)" />
              <MiniStat label="Closed Trades" value={`${journalStats.totalTrades}`} tone="var(--positive)" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <ProgressNote
                label="Academy"
                value={nextLesson ? `Next up: ${nextLesson.title}` : "All lessons complete"}
                detail={`Persistence: ${persistence.toUpperCase()}`}
              />
              <ProgressNote
                label="Journal"
                value={lastJournalEntry ? `Last logged: ${lastJournalEntry.ticker} ${lastJournalEntry.strategy}` : "No trades logged yet"}
                detail={journalStats.totalTrades > 0
                  ? `Win rate ${journalStats.winRate.toFixed(0)}% • Avg P&L ${formatCurrency(journalStats.avgPnl)}`
                  : "Use the journal to reinforce process quality, not just P&L."}
              />
              <ProgressNote
                label="Watchlist"
                value={`${activeWatchlist.name} • ${activeWatchlist.tickers.length} symbols`}
                detail={watchlistFocus.length
                  ? `Focus list: ${watchlistFocus.join(", ")}`
                  : "Build a short list of names worth revisiting every day."}
              />
            </div>
          </Panel>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 0.9fr)", gap: 12 }}>
          <Panel title="Focus List">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {watchlistFocus.length === 0 ? (
                <EmptyState text="No watchlist symbols yet. Add a short list of names you want to review repeatedly." />
              ) : (
                watchlistFocus.map((symbol) => (
                  <div key={symbol} style={focusRowStyle}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <TickerWithCompanyName symbol={symbol} style={{ fontWeight: 700, color: "var(--text-primary)" }} />
                      <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)" }}>
                        Open research first, then move to trading only if the setup still holds.
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <TradeVerdictBadgeWithScore symbol={symbol} showScore={false} />
                      <button type="button" onClick={() => navigate(`/research?tab=ticker&view=research&symbol=${symbol}`)} style={secondaryBtnStyle}>RESEARCH</button>
                      <button type="button" onClick={() => navigate(`/trading?symbol=${symbol}`)} style={primaryBtnStyle}>TRADE</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel title="Next Best Actions">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
          </Panel>
        </div>

        <Panel title="Deeper Workspace">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
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
      ? "Stay in Learn or Simulator first, then revisit the top composite names before the next session."
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

const heroCardStyle: React.CSSProperties = {
  border: "1px solid rgba(5, 173, 152, 0.25)",
  borderRadius: 8,
  padding: 16,
  background: "linear-gradient(180deg, rgba(5, 173, 152, 0.08), rgba(5, 173, 152, 0.02))",
};

const actionCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const focusRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const listRowButtonStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  textAlign: "left",
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
  cursor: "pointer",
};

const primaryBtnStyle: React.CSSProperties = {
  ...mono,
  fontSize: 12,
  fontWeight: 700,
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid var(--signal-core)",
  background: "rgba(5, 173, 152, 0.12)",
  color: "var(--signal-core)",
  cursor: "pointer",
};

const secondaryBtnStyle: React.CSSProperties = {
  ...mono,
  fontSize: 12,
  fontWeight: 700,
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid var(--border-dim)",
  background: "transparent",
  color: "var(--text-secondary)",
  cursor: "pointer",
};

const presetCardStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const marketAccentCardStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid rgba(5, 173, 152, 0.2)",
  background: "linear-gradient(180deg, rgba(5, 173, 152, 0.06), rgba(5, 173, 152, 0.01))",
};
