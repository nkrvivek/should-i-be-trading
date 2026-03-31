import { useEffect, useMemo } from "react";
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
import { QuickMarketStats } from "../components/dashboard/QuickMarketStats";
import { TradeVerdictBadgeWithScore } from "../components/trading/TradeVerdictBadge";
import { TickerWithCompanyName } from "../components/shared/TickerWithCompanyName";

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

export function DashboardPage() {
  const navigate = useNavigate();
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
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 0.8fr)", gap: 16 }}>
          <Panel title="Today">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <TrafficLight verdict={verdict} />
                  {marketScore && <FearGreedGauge score={marketScore.total} />}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                      Start with the tape, stay selective when the market is fragile, and only push into setup review when the ticker and regime align.
                    </p>
                  </div>
                  {marketScore && <QuickMarketStats score={marketScore} />}
                </div>
              </div>
              <DailyBriefing cri={null} verdict={verdict} marketScore={marketScore} />
            </div>
          </Panel>

          <Panel title="Continue">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <ActionCard
                eyebrow="Learn"
                title={nextLesson ? nextLesson.title : "Start the academy"}
                body={nextLessonTrack
                  ? `${nextLessonTrack.title} • ${nextLesson.durationMinutes} min • ${nextLesson.riskLevel.toUpperCase()} risk framing`
                  : "Pick up the next lesson, then move directly into simulator or research practice."}
                cta="Resume Lesson"
                secondary={nextLesson?.simulatorRoute ? "Open Simulator" : nextLesson?.followUpRoute ? "Open Follow-Up" : undefined}
                onClick={() => navigate("/learn")}
                onSecondaryClick={() => {
                  if (nextLesson?.simulatorRoute) navigate(nextLesson.simulatorRoute);
                  else if (nextLesson?.followUpRoute) navigate(nextLesson.followUpRoute);
                }}
              />
              <ActionCard
                eyebrow="Research"
                title="Focus on the best-ranked setups"
                body={topOpportunities.length
                  ? `${topOpportunities[0].symbol} leads the current composite list. Review the top-ranked names before widening out into lower-conviction ideas.`
                  : metricsLoading
                    ? `Loading fundamentals universe ${metricsProgress.done}/${metricsProgress.total}`
                    : "Open the composite screener to triage what deserves attention first."}
                cta="Open Composite"
                secondary={watchlistFocus.length ? "Review Watchlist" : undefined}
                onClick={() => navigate("/research?tab=composite")}
                onSecondaryClick={watchlistFocus.length ? () => navigate("/research") : undefined}
              />
              <ActionCard
                eyebrow="Trade"
                title={openTrades.length ? `${openTrades.length} trade${openTrades.length === 1 ? "" : "s"} need follow-up` : "Review before you execute"}
                body={openTrades.length
                  ? `You have ${openTrades.length} open journal ${openTrades.length === 1 ? "entry" : "entries"} to revisit. Close the loop with execution review and journaling.`
                  : "Use order review and the trade checklist before sending anything to a broker."}
                cta={openTrades.length ? "Open Journal" : "Open Trading"}
                secondary="Order Review"
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

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 0.8fr)", gap: 16 }}>
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
                      <button type="button" onClick={() => navigate("/research?tab=composite")} style={secondaryBtnStyle}>RESEARCH</button>
                      <button type="button" onClick={() => navigate("/trading")} style={primaryBtnStyle}>TRADE</button>
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

        <WatchlistManager />

        <Panel title={`Signal History (${history.length})`}>
          <SignalTimeline history={history} />
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

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
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
