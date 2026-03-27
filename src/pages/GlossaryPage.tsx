import { useState, useMemo } from "react";
import { TerminalShell } from "../components/layout/TerminalShell";
import { GLOSSARY, GLOSSARY_CATEGORIES, type GlossaryEntry } from "../lib/glossary";

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

const difficultyColors: Record<string, { bg: string; color: string; label: string }> = {
  beginner: { bg: "rgba(5, 173, 152, 0.12)", color: "var(--positive)", label: "BEGINNER" },
  intermediate: { bg: "rgba(234, 179, 8, 0.12)", color: "var(--warning)", label: "INTERMEDIATE" },
  advanced: { bg: "rgba(232, 93, 108, 0.12)", color: "var(--negative)", label: "ADVANCED" },
};

export function GlossaryPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
      next.has(term) ? next.delete(term) : next.add(term);
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

  return (
    <TerminalShell cri={null}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ ...mono, fontSize: 24, fontWeight: 700, marginBottom: 8 }}>LEARN</h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 600 }}>
            Every term, concept, and metric used in SIBT — explained simply. From beginner basics to advanced institutional concepts.
          </p>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 80+ trading terms..."
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
      </div>
    </TerminalShell>
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
