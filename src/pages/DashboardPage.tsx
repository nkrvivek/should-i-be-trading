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

      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1400, margin: "0 auto" }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.55fr) minmax(340px, 0.85fr)", gap: 16, alignItems: "stretch" }}>
          <Panel title="Today">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 0.95fr) minmax(0, 1.35fr)", gap: 14, alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}>
                  <TrafficLight verdict={verdict} />
                  {marketScore && (
                    <div style={marketAccentCardStyle}>
                      <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "var(--signal-core)", letterSpacing: "0.08em", marginBottom: 8 }}>
                        MARKET PULSE
                      </div>
                      <FearGreedGauge score={marketScore.total} />
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(250px, 0.95fr)", gap: 12, alignItems: "start" }}>
                  <div style={heroCardStyle}>
                    <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "var(--signal-core)", letterSpacing: "0.08em", marginBottom: 8 }}>
                      TODAY&apos;S STANCE
                    </div>
                    <div style={{ ...mono, fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                      {stance}
                    </div>
                    <div style={{ ...mono, fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
                      {regimeLabel}
                    </div>
                    <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.65, color: "var(--text-secondary)" }}>
                      {workflowPreset.stanceCopy}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                      <CompactStanceRow label="Bias" value={getBiasLabel(stance)} />
                      <CompactStanceRow label="Best Fit" value={getBestFitLabel(workflowProfile, stance)} />
                      <CompactStanceRow label="Risk Note" value={getRiskNote(status, marketScore?.total ?? null)} />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, alignSelf: "start" }}>
                    <div style={presetCardStyle}>
                      <div style={{ ...mono, fontSize: 11, color: "var(--signal-core)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>
                        WORKFLOW PROFILE
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                        {WORKFLOW_OPTIONS.map((option) => {
                          const active = option.id === workflowProfile;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setWorkflowProfile(option.id)}
                              style={{
                                ...mono,
                                fontSize: 12,
                                fontWeight: 700,
                                padding: "6px 10px",
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
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        {workflowPreset.summary}
                      </div>
                    </div>
                    <div style={actionCardStyle}>
                      <div>
                        <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "var(--signal-core)", letterSpacing: "0.08em", marginBottom: 6 }}>
                          WHAT TO DO TODAY
                        </div>
                        <div style={{ ...mono, fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                          {getTodayActionTitle(workflowProfile, status, stance)}
                        </div>
                        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.55, color: "var(--text-secondary)" }}>
                          {getTodayActionBody(workflowProfile, status, stance)}
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <MiniStat label="Window" value={marketScore ? `${marketScore.executionWindow}%` : "---"} tone="var(--warning)" />
                        <MiniStat label="Score" value={marketScore ? `${marketScore.total}/100` : "---"} tone="var(--signal-core)" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DailyBriefing cri={null} verdict={verdict} marketScore={marketScore} />
            </div>
          </Panel>

          <Panel title="Continue">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
          </Panel>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)", gap: 16 }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 0.9fr)", gap: 16 }}>
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
                body="Keep the watchlist manager available, but don’t let it compete with the first-screen decision flow."
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

function ActionCard({
  eyebrow,
  title,
  body,
  cta,
  secondary,
  onClick,
  onSecondaryClick,
}: {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  secondary?: string;
  onClick: () => void;
  onSecondaryClick?: () => void;
}) {
  return (
    <div style={actionCardStyle}>
      <div>
        <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "var(--signal-core)", letterSpacing: "0.08em", marginBottom: 6 }}>
          {eyebrow}
        </div>
        <div style={{ ...mono, fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>
          {body}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={onClick} style={primaryBtnStyle}>{cta}</button>
        {secondary && onSecondaryClick && (
          <button type="button" onClick={onSecondaryClick} style={secondaryBtnStyle}>{secondary}</button>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={miniStatStyle}>
      <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ ...mono, fontSize: 20, fontWeight: 700, color: tone }}>{value}</div>
    </div>
  );
}

function ProgressNote({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div style={progressNoteStyle}>
      <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{value}</div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{detail}</div>
    </div>
  );
}

function CompactStanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={compactStanceRowStyle}>
      <span style={{ ...mono, fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--text-primary)", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function ChecklistRow({ title, body, cta, onClick }: { title: string; body: string; cta: string; onClick: () => void }) {
  return (
    <div style={checklistRowStyle}>
      <div>
        <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{title}</div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>{body}</div>
      </div>
      <button type="button" onClick={onClick} style={secondaryBtnStyle}>{cta}</button>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: 24, textAlign: "center", ...mono, fontSize: 13, color: "var(--text-muted)" }}>
      {text}
    </div>
  );
}

function ExpandableWorkspaceCard({
  title,
  body,
  cta,
  onClick,
}: {
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div style={actionCardStyle}>
      <div>
        <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>
          {body}
        </div>
      </div>
      <div>
        <button type="button" onClick={onClick} style={secondaryBtnStyle}>{cta}</button>
      </div>
    </div>
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
  gap: 12,
  padding: 14,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const miniStatStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const progressNoteStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const compactStanceRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  paddingTop: 8,
  borderTop: "1px solid rgba(5, 173, 152, 0.12)",
};

const checklistRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
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

const WORKFLOW_OPTIONS: Array<{ id: WorkflowProfile; label: string }> = [
  { id: "beginner", label: "Beginner" },
  { id: "active_trader", label: "Active Trader" },
  { id: "options_trader", label: "Options Trader" },
];

const WORKFLOW_PRESETS: Record<WorkflowProfile, {
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
}> = {
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
