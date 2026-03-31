import { useMemo, useState } from "react";
import { ALL_LEARNING_LESSONS, LEARNING_TRACKS, type LearningLesson } from "../../lib/academy";
import { computeLearningStats } from "../../lib/learningProgress";
import { SIBT_BADGE_PATHS } from "../../lib/learningBadges";
import { useLearningAcademy } from "../../hooks/useLearningAcademy";

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

export function AcademyView({ onOpenGlossary }: { onOpenGlossary: () => void }) {
  const { progress, markLessonComplete, saveReminderPrefs, loading: academyLoading, persistence } = useLearningAcademy();

  const stats = useMemo(
    () => computeLearningStats(progress, ALL_LEARNING_LESSONS.length),
    [progress],
  );

  const nextLesson = useMemo(
    () => ALL_LEARNING_LESSONS.find((lesson) => !progress.completedLessons[lesson.slug]) ?? ALL_LEARNING_LESSONS[0],
    [progress.completedLessons],
  );
  const nextTrack = useMemo(
    () => LEARNING_TRACKS.find((track) => track.lessons.some((lesson) => lesson.slug === nextLesson?.slug)) ?? LEARNING_TRACKS[0],
    [nextLesson],
  );
  const [selectedTrackSlug, setSelectedTrackSlug] = useState(nextTrack?.slug ?? LEARNING_TRACKS[0]?.slug ?? "");
  const [selectedLessonSlug, setSelectedLessonSlug] = useState(nextLesson?.slug ?? LEARNING_TRACKS[0]?.lessons[0]?.slug ?? "");

  const activeTrack = useMemo(() => {
    return LEARNING_TRACKS.find((track) => track.slug === selectedTrackSlug)
      ?? nextTrack
      ?? LEARNING_TRACKS[0];
  }, [nextTrack, selectedTrackSlug]);
  const activeLesson = useMemo(() => {
    return activeTrack?.lessons.find((lesson) => lesson.slug === selectedLessonSlug)
      ?? activeTrack?.lessons.find((lesson) => !progress.completedLessons[lesson.slug])
      ?? activeTrack?.lessons[0]
      ?? null;
  }, [activeTrack, progress.completedLessons, selectedLessonSlug]);
  const activeTrackProgress = useMemo(() => {
    if (!activeTrack) return { completed: 0, total: 0 };
    const completed = activeTrack.lessons.filter((lesson) => progress.completedLessons[lesson.slug]).length;
    return { completed, total: activeTrack.lessons.length };
  }, [activeTrack, progress.completedLessons]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 28 }}>
      <div
        style={{
          padding: 18,
          borderRadius: 8,
          border: "1px solid var(--border-dim)",
          background: "linear-gradient(180deg, rgba(5,173,152,0.08), rgba(15,23,42,0.6))",
        }}
      >
        <div style={{ ...mono, fontSize: 12, color: "var(--signal-core)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>
          FREE-TIER LEARNING HUB
        </div>
        <div style={{ ...mono, fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
          Learn the product, then learn the trade.
        </div>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0, maxWidth: 720 }}>
          Start with market regime and stock workflows, then move into options, spreads, broker order entry, ETFs, forex, futures, and commodity basics.
          SIBT badges reward completion, simulation, and trade review discipline. They should never reward reckless short-term P&amp;L.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <AcademyStatCard label="Lessons" value={`${ALL_LEARNING_LESSONS.length}`} sublabel="Free curriculum" tone="var(--text-primary)" />
        <AcademyStatCard label="Completed" value={`${stats.completedCount}`} sublabel="Sessions finished" tone="var(--signal-core)" />
        <AcademyStatCard label="Streak" value={`${stats.currentStreak}d`} sublabel="Consecutive learning days" tone="var(--warning)" />
        <AcademyStatCard label="This Week" value={`${stats.thisWeekSessions}/${stats.weeklyTarget}`} sublabel="Weekly session goal" tone="var(--positive)" />
      </div>

      {activeTrack && activeLesson && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr)", gap: 16 }}>
          <div style={{ ...academyPanelStyle, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
              Course Paths
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>
              Pick one track, work the lessons in order, then move into the related simulator or trading workflow after each concept is clear.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {LEARNING_TRACKS.map((track) => {
                const completed = track.lessons.filter((lesson) => progress.completedLessons[lesson.slug]).length;
                const isActive = track.slug === activeTrack.slug;
                return (
                  <button
                    key={track.slug}
                    onClick={() => {
                      setSelectedTrackSlug(track.slug);
                      const firstIncomplete = track.lessons.find((lesson) => !progress.completedLessons[lesson.slug]);
                      setSelectedLessonSlug(firstIncomplete?.slug ?? track.lessons[0]?.slug ?? "");
                    }}
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderRadius: 8,
                      border: `1px solid ${isActive ? "var(--signal-core)" : "var(--border-dim)"}`,
                      background: isActive ? "rgba(5, 173, 152, 0.08)" : "var(--bg-panel-raised)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{track.title}</span>
                      <span style={levelPillStyle(track.level)}>{track.level.toUpperCase()}</span>
                    </div>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 8 }}>
                      {track.audience}
                    </div>
                    <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)" }}>
                      {completed}/{track.lessons.length} lessons complete
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ ...academyPanelStyle, borderColor: "rgba(5, 173, 152, 0.4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                <div>
                  <div style={{ ...mono, fontSize: 12, color: "var(--signal-core)", fontWeight: 700, marginBottom: 4 }}>
                    ACTIVE COURSE
                  </div>
                  <div style={{ ...mono, fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
                    {activeTrack.title}
                  </div>
                </div>
                <div style={{ ...mono, fontSize: 12, color: "var(--text-muted)", alignSelf: "flex-start" }}>
                  {activeTrackProgress.completed}/{activeTrackProgress.total} complete
                </div>
              </div>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, marginTop: 0 }}>
                {activeTrack.description}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <FlowStepCard step="1" label="Learn" body="Read the concept in plain English so the order ticket makes sense before you click anything live." />
                <FlowStepCard step="2" label="Practice" body="Use the simulator or walkthrough to see payoff, assignment, and risk behavior before execution." />
                <FlowStepCard step="3" label="Apply" body="Open the relevant SIBT workflow only after you understand the setup, risk, and what to check next." />
              </div>
            </div>

            <div style={{ ...academyPanelStyle, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                Course Sequence
              </div>
              {activeTrack.lessons.map((lesson, index) => {
                const isActive = lesson.slug === activeLesson.slug;
                const isComplete = Boolean(progress.completedLessons[lesson.slug]);
                return (
                  <button
                    key={lesson.slug}
                    onClick={() => setSelectedLessonSlug(lesson.slug)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "34px minmax(0, 1fr) auto",
                      gap: 10,
                      alignItems: "center",
                      textAlign: "left",
                      padding: 12,
                      borderRadius: 8,
                      border: `1px solid ${isActive ? "var(--signal-core)" : "var(--border-dim)"}`,
                      background: isActive ? "rgba(5, 173, 152, 0.08)" : "var(--bg-panel-raised)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{
                      ...mono,
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isComplete ? "rgba(5, 173, 152, 0.15)" : "rgba(148, 163, 184, 0.15)",
                      color: isComplete ? "var(--signal-core)" : "var(--text-muted)",
                      fontWeight: 700,
                    }}>
                      {isComplete ? "✓" : index + 1}
                    </div>
                    <div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{lesson.title}</span>
                        <span style={stagePillStyle(lesson.format)}>{academyStageLabel(lesson.format)}</span>
                      </div>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        {lesson.description}
                      </div>
                    </div>
                    <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {lesson.durationMinutes} min
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ ...academyPanelStyle, background: "linear-gradient(180deg, rgba(15,23,42,0.45), rgba(15,23,42,0.7))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                <div>
                  <div style={{ ...mono, fontSize: 12, color: "var(--signal-core)", fontWeight: 700, marginBottom: 4 }}>
                    CURRENT STEP
                  </div>
                  <div style={{ ...mono, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                    {activeLesson.title}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={riskPillStyle(activeLesson.riskLevel)}>{activeLesson.riskLevel.toUpperCase()} RISK</span>
                  <span style={stagePillStyle(activeLesson.format)}>{academyStageLabel(activeLesson.format)}</span>
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 12 }}>
                {activeLesson.description}
              </div>
              <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
                {activeLesson.market.toUpperCase()} • {activeLesson.durationMinutes} MINUTES
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                  WHAT YOU SHOULD KNOW BEFORE MOVING ON
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6 }}>
                  {activeLesson.outcomes.map((outcome) => (
                    <li key={outcome}>{outcome}</li>
                  ))}
                </ul>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => void markLessonComplete(activeLesson.slug)}
                  style={progress.completedLessons[activeLesson.slug] ? secondarySmallBtn : primarySmallBtn}
                >
                  {progress.completedLessons[activeLesson.slug] ? "SESSION COMPLETE" : "MARK SESSION COMPLETE"}
                </button>
                {activeLesson.simulatorRoute && (
                  <a href={activeLesson.simulatorRoute} style={linkChipStyle}>
                    PRACTICE IN SIMULATOR
                  </a>
                )}
                {activeLesson.followUpRoute && (
                  <a href={activeLesson.followUpRoute} style={linkChipStyle}>
                    OPEN TRADING WORKFLOW
                  </a>
                )}
                <button onClick={onOpenGlossary} style={{ ...linkChipStyle, background: "transparent", cursor: "pointer" }}>
                  REVIEW GLOSSARY TERMS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
        <div style={academyPanelStyle}>
          <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            Continue Learning
          </div>
          <div style={{ ...mono, fontSize: 16, fontWeight: 700, color: "var(--signal-core)", marginBottom: 6 }}>
            {nextLesson?.title ?? "All lessons completed"}
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 10 }}>
            {nextLesson?.description ?? "You have completed the current curriculum. Keep reviewing badge paths and glossary concepts."}
          </div>
          <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
            {academyLoading
              ? "Syncing academy progress..."
              : persistence === "account"
                ? `Synced to account • ${progress.reminders.timezone}`
                : `Local-only progress • ${progress.reminders.timezone}`}
          </div>
          {nextLesson && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => void markLessonComplete(nextLesson.slug)} style={primarySmallBtn}>
                MARK SESSION COMPLETE
              </button>
              {nextLesson.simulatorRoute && <a href={nextLesson.simulatorRoute} style={linkChipStyle}>OPEN SIMULATOR</a>}
              {nextLesson.followUpRoute && <a href={nextLesson.followUpRoute} style={linkChipStyle}>OPEN WORKFLOW</a>}
            </div>
          )}
        </div>

        <div style={academyPanelStyle}>
          <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            Reminder Plan
          </div>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55, marginTop: 0 }}>
            {persistence === "account"
              ? "Reminder preferences are synced to your account. Email nudges now use the backend reminder pipeline."
              : "Reminder preferences are local until you sign in. Email nudges require an account."}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={settingRowStyle}>
              <span>Cadence</span>
              <select value={progress.reminders.cadence} onChange={(event) => void saveReminderPrefs({ cadence: event.target.value as "daily" | "weekly" })} style={settingsSelectStyle}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
            <label style={settingRowStyle}>
              <span>Weekly goal</span>
              <select value={progress.reminders.weeklyTarget} onChange={(event) => void saveReminderPrefs({ weeklyTarget: Number(event.target.value) })} style={settingsSelectStyle}>
                {[2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>{value} sessions</option>
                ))}
              </select>
            </label>
            <label style={settingRowStyle}>
              <span>Reminder hour</span>
              <select value={progress.reminders.preferredHour} onChange={(event) => void saveReminderPrefs({ preferredHour: Number(event.target.value) })} style={settingsSelectStyle}>
                {[9, 12, 16, 18, 20].map((value) => (
                  <option key={value} value={value}>{value}:00</option>
                ))}
              </select>
            </label>
            {progress.reminders.cadence === "weekly" && (
              <label style={settingRowStyle}>
                <span>Reminder day</span>
                <select value={progress.reminders.preferredWeekday} onChange={(event) => void saveReminderPrefs({ preferredWeekday: Number(event.target.value) })} style={settingsSelectStyle}>
                  {[
                    { label: "Sunday", value: 0 },
                    { label: "Monday", value: 1 },
                    { label: "Tuesday", value: 2 },
                    { label: "Wednesday", value: 3 },
                    { label: "Thursday", value: 4 },
                    { label: "Friday", value: 5 },
                    { label: "Saturday", value: 6 },
                  ].map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            )}
            <label style={checkboxRowStyle}>
              <input type="checkbox" checked={progress.reminders.browserEnabled} onChange={(event) => void saveReminderPrefs({ browserEnabled: event.target.checked })} />
              <span>Browser learning reminders</span>
            </label>
            <label style={checkboxRowStyle}>
              <input type="checkbox" checked={progress.reminders.emailOptIn} onChange={(event) => void saveReminderPrefs({ emailOptIn: event.target.checked })} />
              <span>Email streak nudges</span>
            </label>
            <label style={checkboxRowStyle}>
              <input type="checkbox" checked={progress.reminders.paused} onChange={(event) => void saveReminderPrefs({ paused: event.target.checked })} />
              <span>Pause all learning reminders</span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <div style={{ ...mono, fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
          Full Track Library
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {LEARNING_TRACKS.map((track) => (
            <div key={track.slug} style={academyPanelStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <div style={{ ...mono, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{track.title}</div>
                <span style={levelPillStyle(track.level)}>{track.level.toUpperCase()}</span>
              </div>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 0 }}>
                {track.description}
              </p>
              <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
                {track.lessons.length} lessons
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {track.lessons.map((lesson) => {
                  const isComplete = Boolean(progress.completedLessons[lesson.slug]);
                  return (
                    <div key={lesson.slug} style={{ border: "1px solid var(--border-dim)", borderRadius: 6, padding: 10, background: "var(--bg-panel-raised)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                        <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{lesson.title}</div>
                        <span style={riskPillStyle(lesson.riskLevel)}>{lesson.riskLevel.toUpperCase()}</span>
                      </div>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 8 }}>
                        {lesson.description}
                      </div>
                      <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                        {lesson.durationMinutes} min • {lesson.format.toUpperCase()} • {lesson.market.toUpperCase()}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={() => void markLessonComplete(lesson.slug)} style={isComplete ? secondarySmallBtn : primarySmallBtn}>
                          {isComplete ? "COMPLETED" : "MARK COMPLETE"}
                        </button>
                        {lesson.simulatorRoute && <a href={lesson.simulatorRoute} style={linkChipStyle}>SIMULATOR</a>}
                        {lesson.followUpRoute && <a href={lesson.followUpRoute} style={linkChipStyle}>OPEN TOOL</a>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ ...mono, fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
          SIBT Badge Paths
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {SIBT_BADGE_PATHS.map((path) => (
            <div key={path.market} style={academyPanelStyle}>
              <div style={{ ...mono, fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                {path.title}
              </div>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 0 }}>
                {path.description}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {path.levels.map((level) => (
                  <div key={level.level} style={{ border: "1px solid var(--border-dim)", borderRadius: 6, padding: 10, background: "var(--bg-panel-raised)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{level.label}</span>
                      <span style={levelPillStyle(level.level)}>{level.level.toUpperCase()}</span>
                    </div>
                    <ul style={{ margin: "0 0 8px 18px", padding: 0, color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.55 }}>
                      {level.requirements.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    {level.liveTradeRequirement && (
                      <div style={{ ...mono, fontSize: 11, color: "var(--warning)", marginBottom: 4 }}>
                        Live trade review: {level.liveTradeRequirement}
                      </div>
                    )}
                    {level.note && (
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45 }}>
                        {level.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AcademyStatCard({ label, value, sublabel, tone }: { label: string; value: string; sublabel: string; tone: string }) {
  return (
    <div style={academyPanelStyle}>
      <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>{label.toUpperCase()}</div>
      <div style={{ ...mono, fontSize: 24, fontWeight: 700, color: tone, marginBottom: 4 }}>{value}</div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)" }}>{sublabel}</div>
    </div>
  );
}

function FlowStepCard({ step, label, body }: { step: string; label: string; body: string }) {
  return (
    <div style={{ border: "1px solid var(--border-dim)", borderRadius: 8, padding: 12, background: "var(--bg-panel-raised)" }}>
      <div style={{ ...mono, fontSize: 11, color: "var(--signal-core)", fontWeight: 700, marginBottom: 6 }}>STEP {step}</div>
      <div style={{ ...mono, fontSize: 13, color: "var(--text-primary)", fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55 }}>{body}</div>
    </div>
  );
}

const academyPanelStyle: React.CSSProperties = {
  padding: 16,
  background: "var(--bg-panel)",
  border: "1px solid var(--border-dim)",
  borderRadius: 8,
};

const primarySmallBtn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 4,
  border: "none",
  background: "var(--signal-core)",
  color: "var(--bg-base)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};

const secondarySmallBtn: React.CSSProperties = {
  ...primarySmallBtn,
  background: "rgba(5, 173, 152, 0.12)",
  color: "var(--signal-core)",
  border: "1px solid var(--signal-core)",
};

const linkChipStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 4,
  border: "1px solid var(--border-dim)",
  color: "var(--text-secondary)",
  textDecoration: "none",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
};

const settingsSelectStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: 4,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
};

const settingRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--text-secondary)",
};

const checkboxRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  color: "var(--text-secondary)",
};

function levelPillStyle(level: "beginner" | "intermediate" | "advanced" | "expert"): React.CSSProperties {
  const colors =
    level === "beginner"
      ? { bg: "rgba(5, 173, 152, 0.12)", color: "var(--positive)" }
      : level === "intermediate"
        ? { bg: "rgba(234, 179, 8, 0.12)", color: "var(--warning)" }
        : { bg: "rgba(232, 93, 108, 0.12)", color: "var(--negative)" };

  return { ...mono, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: colors.bg, color: colors.color };
}

function riskPillStyle(level: "low" | "medium" | "high" | "varies"): React.CSSProperties {
  const colors =
    level === "low"
      ? { bg: "rgba(5, 173, 152, 0.12)", color: "var(--positive)" }
      : level === "medium"
        ? { bg: "rgba(234, 179, 8, 0.12)", color: "var(--warning)" }
        : level === "high"
          ? { bg: "rgba(232, 93, 108, 0.12)", color: "var(--negative)" }
          : { bg: "rgba(96, 165, 250, 0.12)", color: "var(--info)" };

  return { ...mono, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 999, background: colors.bg, color: colors.color };
}

function academyStageLabel(format: LearningLesson["format"]): string {
  if (format === "simulation") return "PRACTICE";
  if (format === "walkthrough") return "APPLY";
  return "LEARN";
}

function stagePillStyle(format: LearningLesson["format"]): React.CSSProperties {
  const colors =
    format === "simulation"
      ? { bg: "rgba(96, 165, 250, 0.12)", color: "var(--info)" }
      : format === "walkthrough"
        ? { bg: "rgba(234, 179, 8, 0.12)", color: "var(--warning)" }
        : { bg: "rgba(5, 173, 152, 0.12)", color: "var(--positive)" };

  return { ...mono, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 999, background: colors.bg, color: colors.color };
}
