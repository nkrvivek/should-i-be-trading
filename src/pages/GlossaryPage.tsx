import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TerminalShell } from "../components/layout/TerminalShell";
import { ALL_LEARNING_LESSONS, LEARNING_TRACKS } from "../lib/academy";
import { GLOSSARY, GLOSSARY_CATEGORIES, type GlossaryEntry } from "../lib/glossary";
import {
  completeLesson,
  computeLearningStats,
  getLearningProgress,
  saveLearningProgress,
  updateReminderPrefs,
} from "../lib/learningProgress";
import { SIBT_BADGE_PATHS } from "../lib/learningBadges";

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

const difficultyColors: Record<string, { bg: string; color: string; label: string }> = {
  beginner: { bg: "rgba(5, 173, 152, 0.12)", color: "var(--positive)", label: "BEGINNER" },
  intermediate: { bg: "rgba(234, 179, 8, 0.12)", color: "var(--warning)", label: "INTERMEDIATE" },
  advanced: { bg: "rgba(232, 93, 108, 0.12)", color: "var(--negative)", label: "ADVANCED" },
};

export function GlossaryPage() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const deepLinkTerm = searchParams.get("term") ?? "";
  const startsInGlossary = Boolean(searchQuery || deepLinkTerm);
  const [activeView, setActiveView] = useState<"academy" | "glossary">(startsInGlossary ? "glossary" : "academy");
  const [search, setSearch] = useState(searchQuery);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(() => getLearningProgress());

  const stats = useMemo(
    () => computeLearningStats(progress, ALL_LEARNING_LESSONS.length),
    [progress],
  );

  const nextLesson = useMemo(
    () => ALL_LEARNING_LESSONS.find((lesson) => !progress.completedLessons[lesson.slug]) ?? ALL_LEARNING_LESSONS[0],
    [progress.completedLessons],
  );

  const filtered = useMemo(() => {
    return GLOSSARY.filter((entry) => {
      const matchesSearch = !search ||
        entry.term.toLowerCase().includes(search.toLowerCase()) ||
        entry.definition.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !activeCategory || entry.category === activeCategory;
      const matchesDifficulty = !activeDifficulty || entry.difficulty === activeDifficulty;
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [search, activeCategory, activeDifficulty]);

  const toggleExpand = (term: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(term)) { next.delete(term); } else { next.add(term); }
      return next;
    });
  };

  const scrollToTerm = (term: string) => {
    setSearch("");
    setActiveCategory(null);
    setActiveDifficulty(null);
    setExpanded((prev) => new Set(prev).add(term));
    setTimeout(() => {
      const el = document.getElementById(`glossary-${term.replace(/\s+/g, "-").toLowerCase()}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  useEffect(() => {
    setSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    saveLearningProgress(progress);
  }, [progress]);

  useEffect(() => {
    if (!deepLinkTerm) return;
    setActiveView("glossary");
    const matching = GLOSSARY.find((entry) => entry.term.toLowerCase() === deepLinkTerm.toLowerCase());
    if (!matching) return;
    setSearch(matching.term);
    setActiveCategory(null);
    setActiveDifficulty(null);
    setExpanded((prev) => new Set(prev).add(matching.term));
    setTimeout(() => {
      const el = document.getElementById(`glossary-${matching.term.replace(/\s+/g, "-").toLowerCase()}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, [deepLinkTerm]);

  return (
    <TerminalShell cri={null}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ ...mono, fontSize: 24, fontWeight: 700, marginBottom: 8 }}>LEARN</h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 600 }}>
            Free trading education inside SIBT: guided lessons, simulator-first strategy walkthroughs, badge paths, and the glossary that powers the rest of the product.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <LearnTabButton active={activeView === "academy"} onClick={() => setActiveView("academy")}>
            Academy
          </LearnTabButton>
          <LearnTabButton active={activeView === "glossary"} onClick={() => setActiveView("glossary")}>
            Glossary
          </LearnTabButton>
        </div>

        {activeView === "academy" && (
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
                {nextLesson && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => setProgress((current) => completeLesson(current, nextLesson.slug))}
                      style={primarySmallBtn}
                    >
                      MARK SESSION COMPLETE
                    </button>
                    {nextLesson.simulatorRoute && (
                      <a href={nextLesson.simulatorRoute} style={linkChipStyle}>
                        OPEN SIMULATOR
                      </a>
                    )}
                    {nextLesson.followUpRoute && (
                      <a href={nextLesson.followUpRoute} style={linkChipStyle}>
                        OPEN WORKFLOW
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div style={academyPanelStyle}>
                <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                  Reminder Plan
                </div>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55, marginTop: 0 }}>
                  Browser reminders can be part of the free tier now. Email streak nudges should be added as a backend phase after review.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={settingRowStyle}>
                    <span>Cadence</span>
                    <select
                      value={progress.reminders.cadence}
                      onChange={(event) => setProgress((current) => updateReminderPrefs(current, { cadence: event.target.value as "daily" | "weekly" }))}
                      style={settingsSelectStyle}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </label>
                  <label style={settingRowStyle}>
                    <span>Weekly goal</span>
                    <select
                      value={progress.reminders.weeklyTarget}
                      onChange={(event) => setProgress((current) => updateReminderPrefs(current, { weeklyTarget: Number(event.target.value) }))}
                      style={settingsSelectStyle}
                    >
                      {[2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>
                          {value} sessions
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={checkboxRowStyle}>
                    <input
                      type="checkbox"
                      checked={progress.reminders.browserEnabled}
                      onChange={(event) => setProgress((current) => updateReminderPrefs(current, { browserEnabled: event.target.checked }))}
                    />
                    <span>Browser learning reminders</span>
                  </label>
                  <label style={checkboxRowStyle}>
                    <input
                      type="checkbox"
                      checked={progress.reminders.emailOptIn}
                      onChange={(event) => setProgress((current) => updateReminderPrefs(current, { emailOptIn: event.target.checked }))}
                    />
                    <span>Email streak nudges when backend delivery is added</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <div style={{ ...mono, fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
                Learning Tracks
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
                              <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                                {lesson.title}
                              </div>
                              <span style={riskPillStyle(lesson.riskLevel)}>
                                {lesson.riskLevel.toUpperCase()}
                              </span>
                            </div>
                            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 8 }}>
                              {lesson.description}
                            </div>
                            <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                              {lesson.durationMinutes} min • {lesson.format.toUpperCase()} • {lesson.market.toUpperCase()}
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button
                                onClick={() => setProgress((current) => completeLesson(current, lesson.slug))}
                                style={isComplete ? secondarySmallBtn : primarySmallBtn}
                              >
                                {isComplete ? "COMPLETED" : "MARK COMPLETE"}
                              </button>
                              {lesson.simulatorRoute && (
                                <a href={lesson.simulatorRoute} style={linkChipStyle}>
                                  SIMULATOR
                                </a>
                              )}
                              {lesson.followUpRoute && (
                                <a href={lesson.followUpRoute} style={linkChipStyle}>
                                  OPEN TOOL
                                </a>
                              )}
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
        )}

        {activeView === "glossary" && (
          <>
        {/* Search */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search terms..."
            style={{
              width: "100%",
              padding: "10px 14px 10px 36px",
              background: "var(--bg-panel)",
              border: "1px solid var(--border-dim)",
              borderRadius: 6,
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14 }}>
            🔍
          </span>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ ...mono, fontSize: 11, color: "var(--text-muted)", alignSelf: "center", marginRight: 4 }}>CATEGORY:</span>
          <FilterPill label="All" active={!activeCategory} onClick={() => setActiveCategory(null)} />
          {GLOSSARY_CATEGORIES.map((cat) => (
            <FilterPill
              key={cat}
              label={cat}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <span style={{ ...mono, fontSize: 11, color: "var(--text-muted)", alignSelf: "center", marginRight: 4 }}>LEVEL:</span>
          <FilterPill label="All" active={!activeDifficulty} onClick={() => setActiveDifficulty(null)} />
          {(["beginner", "intermediate", "advanced"] as const).map((d) => (
            <FilterPill
              key={d}
              label={d.charAt(0).toUpperCase() + d.slice(1)}
              active={activeDifficulty === d}
              onClick={() => setActiveDifficulty(activeDifficulty === d ? null : d)}
            />
          ))}
        </div>

        {/* Count */}
        <div style={{ ...mono, fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          {filtered.length} term{filtered.length !== 1 ? "s" : ""}
          {search && ` matching "${search}"`}
          {activeCategory && ` in ${activeCategory}`}
        </div>

        {/* Entries */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((entry) => (
            <GlossaryCard
              key={entry.term}
              entry={entry}
              isExpanded={expanded.has(entry.term)}
              onToggle={() => toggleExpand(entry.term)}
              onRelatedClick={scrollToTerm}
            />
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: 48, textAlign: "center", ...mono, fontSize: 13, color: "var(--text-muted)" }}>
              No terms match "{search}"
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </TerminalShell>
  );
}

function LearnTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 999,
        border: `1px solid ${active ? "var(--signal-core)" : "var(--border-dim)"}`,
        background: active ? "rgba(5, 173, 152, 0.12)" : "transparent",
        color: active ? "var(--signal-core)" : "var(--text-secondary)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function AcademyStatCard({
  label,
  value,
  sublabel,
  tone,
}: {
  label: string;
  value: string;
  sublabel: string;
  tone: string;
}) {
  return (
    <div style={academyPanelStyle}>
      <div style={{ ...mono, fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>{label.toUpperCase()}</div>
      <div style={{ ...mono, fontSize: 24, fontWeight: 700, color: tone, marginBottom: 4 }}>{value}</div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)" }}>{sublabel}</div>
    </div>
  );
}

function GlossaryCard({
  entry,
  isExpanded,
  onToggle,
  onRelatedClick,
}: {
  entry: GlossaryEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onRelatedClick: (term: string) => void;
}) {
  const diff = entry.difficulty ? difficultyColors[entry.difficulty] : null;

  return (
    <div
      id={`glossary-${entry.term.replace(/\s+/g, "-").toLowerCase()}`}
      style={{
        background: "var(--bg-panel)",
        border: `1px solid ${isExpanded ? "var(--signal-core)" : "var(--border-dim)"}`,
        borderRadius: 6,
        overflow: "hidden",
        transition: "border-color 0.15s",
      }}
    >
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{
          ...mono, fontSize: 10, color: "var(--signal-core)",
          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.15s",
          flexShrink: 0,
        }}>
          ▶
        </span>
        <span style={{ ...mono, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>
          {entry.term}
        </span>
        <span style={{
          ...mono, fontSize: 10, padding: "2px 8px", borderRadius: 999,
          background: "var(--bg-panel-raised)", color: "var(--text-muted)",
          flexShrink: 0,
        }}>
          {entry.category}
        </span>
        {diff && (
          <span style={{
            ...mono, fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 999,
            background: diff.bg, color: diff.color, flexShrink: 0, letterSpacing: "0.03em",
          }}>
            {diff.label}
          </span>
        )}
        {entry.videoUrl && (
          <span style={{ fontSize: 12, flexShrink: 0 }} title="Has video explainer">▶️</span>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ padding: "0 16px 16px 32px" }}>
          {/* Definition */}
          <div style={{
            fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)",
            lineHeight: 1.7, marginBottom: entry.example || entry.videoUrl || entry.relatedTerms ? 12 : 0,
          }}>
            {entry.definition}
          </div>

          {/* Example */}
          {entry.example && (
            <div style={{
              padding: "8px 12px", marginBottom: 12,
              background: "var(--bg-panel-raised)", borderRadius: 4,
              borderLeft: "3px solid var(--signal-core)",
            }}>
              <div style={{ ...mono, fontSize: 10, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                EXAMPLE
              </div>
              <div style={{ ...mono, fontSize: 12, color: "var(--text-primary)", lineHeight: 1.5 }}>
                {entry.example}
              </div>
            </div>
          )}

          {/* Video */}
          {entry.videoUrl && (
            <div style={{ marginBottom: 12 }}>
              <a
                href={entry.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 4,
                  background: "rgba(255, 0, 0, 0.08)",
                  border: "1px solid rgba(255, 0, 0, 0.2)",
                  color: "var(--text-primary)",
                  textDecoration: "none", ...mono, fontSize: 12,
                }}
              >
                <span style={{ fontSize: 14 }}>▶️</span>
                Watch Video Explainer
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>↗</span>
              </a>
            </div>
          )}

          {/* Related Terms */}
          {entry.relatedTerms && entry.relatedTerms.length > 0 && (
            <div>
              <span style={{ ...mono, fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                RELATED:
              </span>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                {entry.relatedTerms.map((rt) => (
                  <button
                    key={rt}
                    onClick={() => onRelatedClick(rt)}
                    style={{
                      ...mono, fontSize: 11, padding: "2px 8px", borderRadius: 999,
                      background: "rgba(5, 173, 152, 0.08)",
                      border: "1px solid rgba(5, 173, 152, 0.3)",
                      color: "var(--signal-core)", cursor: "pointer",
                    }}
                  >
                    {rt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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

  return {
    ...mono,
    fontSize: 10,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 999,
    background: colors.bg,
    color: colors.color,
  };
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

  return {
    ...mono,
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: 999,
    background: colors.bg,
    color: colors.color,
  };
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "3px 10px",
        ...mono,
        fontSize: 11,
        fontWeight: 500,
        color: active ? "var(--signal-core)" : "var(--text-muted)",
        background: active ? "rgba(5, 173, 152, 0.1)" : "transparent",
        border: `1px solid ${active ? "var(--signal-core)" : "var(--border-dim)"}`,
        borderRadius: 999,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
