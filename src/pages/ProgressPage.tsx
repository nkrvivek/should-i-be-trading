import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TerminalShell } from "../components/layout/TerminalShell";
import { Panel } from "../components/layout/Panel";
import { WorkflowHandoffCard } from "../components/shared/WorkflowHandoffCard";
import { useLearningAcademy } from "../hooks/useLearningAcademy";
import { useTradeJournal } from "../hooks/useTradeJournal";
import { ALL_LEARNING_LESSONS, LEARNING_TRACKS } from "../lib/academy";
import { isLessonUnlocked } from "../lib/academyUnlock";
import { SIBT_BADGE_PATHS, type SibtBadgeLevel } from "../lib/learningBadges";
import { computeLearningStats } from "../lib/learningProgress";
import type { TradeJournalEntry } from "../lib/strategy/types";

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

export function ProgressPage() {
  const navigate = useNavigate();
  const { progress, persistence } = useLearningAcademy();
  const { entries, openTrades, closedTrades, stats } = useTradeJournal();

  const learningStats = useMemo(
    () => computeLearningStats(progress, ALL_LEARNING_LESSONS.length),
    [progress],
  );

  const nextLesson = useMemo(
    () => ALL_LEARNING_LESSONS.find((lesson) =>
      !progress.completedLessons[lesson.slug] &&
      isLessonUnlocked(lesson.trackSlug, lesson.slug, progress.completedLessons)
    ) ?? null,
    [progress.completedLessons],
  );

  const completedByMarket = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const lesson of ALL_LEARNING_LESSONS) {
      if (!progress.completedLessons[lesson.slug]) continue;
      counts[lesson.market] = (counts[lesson.market] ?? 0) + 1;
    }
    return counts;
  }, [progress.completedLessons]);

  const trackProgress = useMemo(() => {
    return LEARNING_TRACKS.map((track) => {
      const completed = track.lessons.filter((lesson) => progress.completedLessons[lesson.slug]).length;
      return {
        ...track,
        completed,
        percent: Math.round((completed / track.lessons.length) * 100),
      };
    });
  }, [progress.completedLessons]);

  const badgeProgress = useMemo(() => {
    return SIBT_BADGE_PATHS.map((path) => {
      const completedLessonsForPath = countLessonsForBadge(path.market, completedByMarket);
      const levelProgress = path.levels.map((level, index) => ({
        ...level,
        unlocked: isBadgeLevelUnlocked(level.level, {
          completedLessonsForPath,
          totalClosedTrades: closedTrades.length,
          openTrades: openTrades.length,
          totalJournalEntries: entries.length,
          streak: learningStats.currentStreak,
          weeklySessions: learningStats.thisWeekSessions,
        }),
        step: index + 1,
      }));

      return {
        ...path,
        completedLessonsForPath,
        levelProgress,
      };
    });
  }, [closedTrades.length, completedByMarket, entries.length, learningStats.currentStreak, learningStats.thisWeekSessions, openTrades.length]);

  const recentTrades = entries.slice(0, 5);
  const closedReviewedTrades = useMemo(
    () => closedTrades.filter(hasStructuredReview),
    [closedTrades],
  );
  const reviewedTrades = useMemo(
    () => [...entries]
      .filter(hasStructuredReview)
      .sort((a, b) => getReviewTimestamp(b) - getReviewTimestamp(a)),
    [entries],
  );
  const recentReviews = reviewedTrades.slice(0, 5);
  const reviewStats = useMemo(() => {
    const totals = {
      reviewedCount: reviewedTrades.length,
      executionCounts: { A: 0, B: 0, C: 0 },
      thesisCounts: { worked: 0, mixed: 0, failed: 0 },
      notesCount: 0,
      nextActions: new Map<string, number>(),
    };
    for (const entry of reviewedTrades) {
      if (entry.review?.executionQuality) totals.executionCounts[entry.review.executionQuality] += 1;
      if (entry.review?.thesisOutcome) totals.thesisCounts[entry.review.thesisOutcome] += 1;
      if (entry.review?.notes?.trim()) totals.notesCount += 1;
      const nextAction = entry.review?.nextAction?.trim();
      if (nextAction) {
        totals.nextActions.set(nextAction, (totals.nextActions.get(nextAction) ?? 0) + 1);
      }
    }
    const gradedCount = totals.executionCounts.A + totals.executionCounts.B + totals.executionCounts.C;
    const outcomeCount = totals.thesisCounts.worked + totals.thesisCounts.mixed + totals.thesisCounts.failed;
    return {
      reviewedCount: totals.reviewedCount,
      closedReviewedCount: closedReviewedTrades.length,
      pendingClosedReviews: Math.max(closedTrades.length - closedReviewedTrades.length, 0),
      reviewCoverage: closedTrades.length ? Math.round((closedReviewedTrades.length / closedTrades.length) * 100) : 0,
      executionCounts: totals.executionCounts,
      thesisCounts: totals.thesisCounts,
      notesCount: totals.notesCount,
      gradedCount,
      outcomeCount,
      abRate: gradedCount ? Math.round(((totals.executionCounts.A + totals.executionCounts.B) / gradedCount) * 100) : 0,
      thesisWorkedRate: outcomeCount ? Math.round((totals.thesisCounts.worked / outcomeCount) * 100) : 0,
      topNextActions: [...totals.nextActions.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3)
        .map(([label, count]) => ({ label, count })),
    };
  }, [closedReviewedTrades.length, closedTrades.length, reviewedTrades]);
  const reviewBacklog = openTrades.length + reviewStats.pendingClosedReviews;

  return (
    <TerminalShell>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <WorkflowHandoffCard
          eyebrow="Next Step"
          title="Turn progress into the next action."
          body="Progress only matters if it changes what you do next. Continue a lesson, review a setup, or close a journal loop while the feedback is still fresh."
          actions={[
            {
              label: "Continue Learn",
              onClick: () => navigate("/learn"),
            },
            {
              label: "Open Research",
              onClick: () => navigate("/research"),
              tone: "secondary",
            },
            {
              label: "Open Trading",
              onClick: () => navigate("/trading"),
              tone: "secondary",
            },
          ]}
        />

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(300px, 0.8fr)", gap: 16 }}>
          <Panel title="Progress Overview">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={heroStyle}>
                <div style={{ ...mono, fontSize: 12, color: "var(--signal-core)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>
                  DISCIPLINE OVER HYPE
                </div>
                <div style={{ ...mono, fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                  Track learning, execution quality, and follow-through.
                </div>
                <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.65, color: "var(--text-secondary)", maxWidth: 760 }}>
                  This page is for process, not performance theater. Use it to keep your learning streak alive, close trade-review loops,
                  and see which badge path you are actually progressing through.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                <MetricCard label="Lessons Complete" value={`${learningStats.completedCount}/${ALL_LEARNING_LESSONS.length}`} tone="var(--text-primary)" />
                <MetricCard label="Current Streak" value={`${learningStats.currentStreak}d`} tone="var(--warning)" />
                <MetricCard label="Weekly Goal" value={`${learningStats.thisWeekSessions}/${learningStats.weeklyTarget}`} tone="var(--signal-core)" />
                <MetricCard label="Closed Trades" value={`${stats.totalTrades}`} tone="var(--positive)" />
                <MetricCard label="Reviewed Trades" value={`${reviewStats.closedReviewedCount}/${closedTrades.length}`} tone="var(--signal-core)" />
                <MetricCard label="Review Coverage" value={closedTrades.length ? `${reviewStats.reviewCoverage}%` : "N/A"} tone={closedTrades.length ? scoreTone(reviewStats.reviewCoverage) : "var(--text-muted)"} />
                <MetricCard label="A/B Execution" value={reviewStats.gradedCount ? `${reviewStats.abRate}%` : "N/A"} tone={reviewStats.gradedCount ? scoreTone(reviewStats.abRate) : "var(--text-muted)"} />
                <MetricCard label="Worked Thesis" value={reviewStats.outcomeCount ? `${reviewStats.thesisWorkedRate}%` : "N/A"} tone={reviewStats.outcomeCount ? scoreTone(reviewStats.thesisWorkedRate) : "var(--text-muted)"} />
              </div>
            </div>
          </Panel>

          <Panel title="Next Up">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <ActionTile
                eyebrow="Academy"
                title={nextLesson ? nextLesson.title : "Review your completed playbook"}
                body={nextLesson
                  ? `${nextLesson.trackTitle} • ${nextLesson.durationMinutes} min • ${nextLesson.market.toUpperCase()}`
                  : "You have completed the current curriculum. Revisit lessons, glossary concepts, and simulator reps to keep the workflow sharp."}
                primaryLabel={nextLesson ? "Continue Learning" : "Open Learn"}
                onPrimary={() => navigate("/learn")}
                secondaryLabel={nextLesson?.simulatorRoute ? "Open Simulator" : nextLesson?.followUpRoute ? "Open Workflow" : undefined}
                onSecondary={() => {
                  if (nextLesson?.simulatorRoute) navigate(nextLesson.simulatorRoute);
                  else if (nextLesson?.followUpRoute) navigate(nextLesson.followUpRoute);
                }}
              />
              <ActionTile
                eyebrow="Journal"
                title={reviewBacklog ? `${reviewBacklog} ${pluralize(reviewBacklog, "review")} still need closure` : "Keep the review loop tight"}
                body={reviewBacklog
                  ? `${openTrades.length} open ${pluralize(openTrades.length, "trade")} and ${reviewStats.pendingClosedReviews} closed ${pluralize(reviewStats.pendingClosedReviews, "trade")} still need structured follow-through. Log execution quality, thesis outcome, and the next action while the details are fresh.`
                  : reviewedTrades.length > 0
                    ? "All closed trades have a structured review. Keep using next-action notes so the journal changes what you do on the next setup."
                    : "No journal items right now. The next step is either logging a trade or reviewing a completed setup."}
                primaryLabel="Open Trading Journal"
                onPrimary={() => navigate("/trading?tab=journal")}
                secondaryLabel="Open Trading"
                onSecondary={() => navigate("/trading")}
              />
              <div style={infoBoxStyle}>
                <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
                  PERSISTENCE
                </div>
                <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  {persistence.toUpperCase()}
                </div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Progress is currently synced through your {persistence === "account" ? "signed-in account" : "local browser state"}.
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.95fr) minmax(0, 1.05fr)", gap: 16 }}>
          <Panel title="Track Progress">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {trackProgress.map((track) => (
                <div key={track.slug} style={trackRowStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                    <div>
                      <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{track.title}</div>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        {track.description}
                      </div>
                    </div>
                    <div style={{ ...mono, fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {track.completed}/{track.lessons.length}
                    </div>
                  </div>
                  <div style={progressBarStyle}>
                    <div style={{ ...progressFillStyle, width: `${track.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Badge Paths">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {badgeProgress.map((path) => (
                <div key={path.market} style={badgePathStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{path.title}</div>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        {path.description}
                      </div>
                    </div>
                    <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      Lessons logged: {path.completedLessonsForPath}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                    {path.levelProgress.map((level) => (
                      <div key={level.level} style={{
                        ...badgeLevelStyle,
                        borderColor: level.unlocked ? "rgba(5, 173, 152, 0.35)" : "var(--border-dim)",
                        background: level.unlocked ? "rgba(5, 173, 152, 0.08)" : "var(--bg-panel)",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                          <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{level.label}</span>
                          <span style={levelPillStyle(level.level)}>{level.level.toUpperCase()}</span>
                        </div>
                        <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 8 }}>
                          {level.requirements[0]}
                        </div>
                        <div style={{ ...mono, fontSize: 11, color: level.unlocked ? "var(--signal-core)" : "var(--text-muted)" }}>
                          {level.unlocked ? "READY / IN PROGRESS" : "LOCKED"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)", gap: 16 }}>
          <Panel title="Review Quality">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={infoBoxStyle}>
                <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
                  STRUCTURED REVIEW COVERAGE
                </div>
                <div style={{ ...mono, fontSize: 18, fontWeight: 700, color: closedTrades.length ? scoreTone(reviewStats.reviewCoverage) : "var(--text-primary)" }}>
                  {closedTrades.length ? `${reviewStats.closedReviewedCount}/${closedTrades.length} closed trades` : "No closed trades yet"}
                </div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)", marginTop: 6 }}>
                  The goal here is cleaner execution and better follow-through, not just more trades. Grade the execution, mark whether the thesis actually held, and write down what changes next.
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                <MetricCard label="Pending Closed Reviews" value={`${reviewStats.pendingClosedReviews}`} tone={reviewStats.pendingClosedReviews === 0 ? "var(--signal-core)" : "var(--warning)"} />
                <MetricCard label="Reviews With Notes" value={`${reviewStats.notesCount}/${reviewStats.reviewedCount}`} tone={reviewStats.notesCount > 0 ? "var(--text-primary)" : "var(--text-muted)"} />
              </div>

              <BreakdownSection title="Execution Quality">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(["A", "B", "C"] as const).map((grade) => (
                    <ReviewPill
                      key={grade}
                      label={`${grade}: ${reviewStats.executionCounts[grade]}`}
                      background={executionQualityStyle(grade).bg}
                      color={executionQualityStyle(grade).fg}
                    />
                  ))}
                </div>
              </BreakdownSection>

              <BreakdownSection title="Thesis Outcomes">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(["worked", "mixed", "failed"] as const).map((outcome) => (
                    <ReviewPill
                      key={outcome}
                      label={`${formatThesisOutcome(outcome)}: ${reviewStats.thesisCounts[outcome]}`}
                      background={thesisOutcomeStyle(outcome).bg}
                      color={thesisOutcomeStyle(outcome).fg}
                    />
                  ))}
                </div>
              </BreakdownSection>

              <BreakdownSection title="Most Common Next Actions">
                {reviewStats.topNextActions.length > 0 ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {reviewStats.topNextActions.map((action) => (
                      <ReviewPill
                        key={action.label}
                        label={`${action.label} (${action.count})`}
                        background="rgba(148, 163, 184, 0.12)"
                        color="var(--text-secondary)"
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{ ...mono, fontSize: 12, color: "var(--text-muted)" }}>
                    No next-action decisions logged yet.
                  </div>
                )}
              </BreakdownSection>

              <RuleRow text="A profitable trade alone should never count as a strong review." />
              <RuleRow text="The best review output is a specific next action you can actually follow on the next setup." />
            </div>
          </Panel>

          <Panel title="Recent Reviews">
            {recentReviews.length === 0 ? (
              <EmptyState text="No structured trade reviews yet. Use the Trading journal review form to log execution quality and thesis outcome." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recentReviews.map((entry) => (
                  <div key={entry.id} style={journalRowStyle}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                            {entry.ticker} • {entry.strategy}
                          </div>
                          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                            Reviewed {formatDate(entry.review?.reviewedAt ?? entry.date)} • {entry.direction} • {entry.status.toUpperCase()}
                            {entry.pnlPercent != null ? ` • ${formatSignedPercent(entry.pnlPercent)}` : ""}
                          </div>
                        </div>
                        <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)", textAlign: "right" }}>
                          Verdict {entry.verdictAtEntry}
                          <br />
                          Score {entry.marketScoreAtEntry}/100
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {entry.review?.executionQuality && (
                          <ReviewPill
                            label={`Execution ${entry.review.executionQuality}`}
                            background={executionQualityStyle(entry.review.executionQuality).bg}
                            color={executionQualityStyle(entry.review.executionQuality).fg}
                          />
                        )}
                        {entry.review?.thesisOutcome && (
                          <ReviewPill
                            label={formatThesisOutcome(entry.review.thesisOutcome)}
                            background={thesisOutcomeStyle(entry.review.thesisOutcome).bg}
                            color={thesisOutcomeStyle(entry.review.thesisOutcome).fg}
                          />
                        )}
                        {entry.review?.nextAction && (
                          <ReviewPill
                            label={`Next: ${entry.review.nextAction}`}
                            background="rgba(148, 163, 184, 0.12)"
                            color="var(--text-secondary)"
                          />
                        )}
                      </div>

                      {entry.review?.notes?.trim() && (
                        <div style={reviewNoteStyle}>
                          {entry.review.notes.trim()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 0.75fr)", gap: 16 }}>
          <Panel title="Recent Journal Entries">
            {recentTrades.length === 0 ? (
              <EmptyState text="No journal entries yet. Log trades and review them to build real badge progress." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recentTrades.map((entry) => (
                  <div key={entry.id} style={journalRowStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                          {entry.ticker} • {entry.strategy}
                        </div>
                        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)" }}>
                          {new Date(entry.date).toLocaleDateString()} • {entry.direction} • {entry.status}
                        </div>
                      </div>
                      <div style={{ ...mono, fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>
                        Verdict {entry.verdictAtEntry}
                        <br />
                        Score {entry.marketScoreAtEntry}/100
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Momentum Rules">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <RuleRow text="Keep streaks alive with short sessions, not binge-and-drop behavior." />
              <RuleRow text="Badges should reward process quality, simulator reps, and review discipline." />
              <RuleRow text="A profitable trade alone should never unlock higher trust tiers." />
              <RuleRow text="Use this page to see whether you are actually following the workflow you say you value." />
            </div>
          </Panel>
        </div>
      </div>
    </TerminalShell>
  );
}

function countLessonsForBadge(market: string, completedByMarket: Record<string, number>) {
  if (market === "stocks" || market === "etfs") {
    return (completedByMarket.screening ?? 0) + (completedByMarket.execution ?? 0);
  }
  if (market === "commodities") {
    return completedByMarket.futures ?? 0;
  }
  return completedByMarket[market] ?? 0;
}

function isBadgeLevelUnlocked(
  level: SibtBadgeLevel,
  context: {
    completedLessonsForPath: number;
    totalClosedTrades: number;
    openTrades: number;
    totalJournalEntries: number;
    streak: number;
    weeklySessions: number;
  },
) {
  if (level === "beginner") {
    return context.completedLessonsForPath >= 1;
  }

  if (level === "intermediate") {
    return context.completedLessonsForPath >= 2 && (context.totalJournalEntries >= 2 || context.totalClosedTrades >= 1);
  }

  return context.completedLessonsForPath >= 3 && context.totalClosedTrades >= 2 && (context.streak >= 3 || context.weeklySessions >= 3 || context.openTrades >= 1);
}

function ActionTile({
  eyebrow,
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  eyebrow: string;
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <div style={actionTileStyle}>
      <div>
        <div style={{ ...mono, fontSize: 11, color: "var(--signal-core)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>{eyebrow}</div>
        <div style={{ ...mono, fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>{title}</div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>{body}</div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={onPrimary} style={primaryBtnStyle}>{primaryLabel}</button>
        {secondaryLabel && onSecondary && (
          <button type="button" onClick={onSecondary} style={secondaryBtnStyle}>{secondaryLabel}</button>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={metricCardStyle}>
      <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ ...mono, fontSize: 20, fontWeight: 700, color: tone }}>{value}</div>
    </div>
  );
}

function ReviewPill({
  label,
  background,
  color,
}: {
  label: string;
  background: string;
  color: string;
}) {
  return (
    <span style={{
      ...mono,
      fontSize: 11,
      fontWeight: 700,
      padding: "4px 8px",
      borderRadius: 999,
      background,
      color,
      display: "inline-flex",
      alignItems: "center",
    }}>
      {label}
    </span>
  );
}

function BreakdownSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={breakdownSectionStyle}>
      <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.06em" }}>
        {title.toUpperCase()}
      </div>
      {children}
    </div>
  );
}

function RuleRow({ text }: { text: string }) {
  return (
    <div style={ruleRowStyle}>
      <span style={{ ...mono, fontSize: 14, color: "var(--signal-core)" }}>•</span>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>{text}</span>
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

function levelPillStyle(level: SibtBadgeLevel): React.CSSProperties {
  const colors: Record<SibtBadgeLevel, { bg: string; fg: string }> = {
    beginner: { bg: "rgba(5, 173, 152, 0.12)", fg: "var(--signal-core)" },
    intermediate: { bg: "rgba(245, 166, 35, 0.12)", fg: "var(--warning)" },
    expert: { bg: "rgba(232, 93, 108, 0.12)", fg: "var(--negative)" },
  };

  return {
    ...mono,
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: 999,
    background: colors[level].bg,
    color: colors[level].fg,
  };
}

const heroStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 8,
  border: "1px solid rgba(5, 173, 152, 0.25)",
  background: "linear-gradient(180deg, rgba(5, 173, 152, 0.08), rgba(5, 173, 152, 0.02))",
};

const metricCardStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const actionTileStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 14,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const infoBoxStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const trackRowStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const badgePathStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const badgeLevelStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
};

const journalRowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const reviewNoteStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--text-secondary)",
  lineHeight: 1.6,
  padding: "10px 12px",
  borderRadius: 8,
  background: "rgba(148, 163, 184, 0.08)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
};

const ruleRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  padding: 10,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const breakdownSectionStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
};

const progressBarStyle: React.CSSProperties = {
  width: "100%",
  height: 8,
  borderRadius: 999,
  background: "rgba(148, 163, 184, 0.18)",
  overflow: "hidden",
};

const progressFillStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg, rgba(5, 173, 152, 0.9), rgba(5, 173, 152, 0.45))",
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

function hasStructuredReview(entry: TradeJournalEntry): boolean {
  const review = entry.review;
  return Boolean(
    review?.executionQuality
      || review?.thesisOutcome
      || review?.reviewedAt
      || review?.nextAction?.trim()
      || review?.notes?.trim(),
  );
}

function getReviewTimestamp(entry: TradeJournalEntry): number {
  const reviewedAt = entry.review?.reviewedAt ?? entry.exit?.date ?? entry.date;
  return new Date(reviewedAt).getTime();
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function formatSignedPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function scoreTone(value: number): string {
  if (value >= 70) return "var(--positive)";
  if (value >= 40) return "var(--warning)";
  return "var(--negative)";
}

function pluralize(count: number, noun: string): string {
  return `${noun}${count === 1 ? "" : "s"}`;
}

function formatThesisOutcome(outcome: "worked" | "mixed" | "failed"): string {
  if (outcome === "worked") return "Thesis Worked";
  if (outcome === "mixed") return "Thesis Mixed";
  return "Thesis Failed";
}

function executionQualityStyle(grade: "A" | "B" | "C"): { bg: string; fg: string } {
  if (grade === "A") {
    return { bg: "rgba(5, 173, 152, 0.14)", fg: "var(--positive)" };
  }
  if (grade === "B") {
    return { bg: "rgba(245, 166, 35, 0.14)", fg: "var(--warning)" };
  }
  return { bg: "rgba(232, 93, 108, 0.14)", fg: "var(--negative)" };
}

function thesisOutcomeStyle(outcome: "worked" | "mixed" | "failed"): { bg: string; fg: string } {
  if (outcome === "worked") {
    return { bg: "rgba(5, 173, 152, 0.14)", fg: "var(--positive)" };
  }
  if (outcome === "mixed") {
    return { bg: "rgba(245, 166, 35, 0.14)", fg: "var(--warning)" };
  }
  return { bg: "rgba(232, 93, 108, 0.14)", fg: "var(--negative)" };
}
