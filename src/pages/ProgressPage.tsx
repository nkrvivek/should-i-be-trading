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
                <MetricCard label="Open Reviews" value={`${openTrades.length}`} tone="var(--warning)" />
                <MetricCard label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} tone={stats.winRate >= 50 ? "var(--positive)" : "var(--negative)"} />
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
                title={openTrades.length ? `${openTrades.length} trades need follow-up` : "Keep the review loop tight"}
                body={openTrades.length
                  ? "Open trades are still part of the process. Review them against the original thesis, risk, and exit plan."
                  : "No open journal items right now. The next step is either logging a trade or reviewing a completed setup."}
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

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 0.75fr)", gap: 16 }}>
          <Panel title="Recent Journal Entries">
            {recentTrades.length === 0 ? (
              <EmptyState text="No journal entries yet. Log trades and review them to build real badge progress." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recentTrades.map((entry) => (
                  <div key={entry.id} style={journalRowStyle}>
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
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
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
