import { useState, useMemo } from "react";
import { TerminalShell } from "../components/layout/TerminalShell";
import { GLOSSARY, GLOSSARY_CATEGORIES } from "../lib/glossary";

export function GlossaryPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return GLOSSARY.filter((entry) => {
      const matchesSearch = !search ||
        entry.term.toLowerCase().includes(search.toLowerCase()) ||
        entry.definition.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !activeCategory || entry.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  return (
    <TerminalShell cri={null}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Glossary
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", marginBottom: 20 }}>
          Every term used in SIBT, explained. Click any term to learn more.
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search terms..."
          style={{
            width: "100%",
            padding: "8px 12px",
            background: "var(--bg-panel-raised)",
            border: "1px solid var(--border-dim)",
            borderRadius: 4,
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-primary)",
            outline: "none",
            marginBottom: 12,
          }}
        />

        {/* Category filters */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 20 }}>
          <CategoryPill
            label="All"
            active={!activeCategory}
            onClick={() => setActiveCategory(null)}
          />
          {GLOSSARY_CATEGORIES.map((cat) => (
            <CategoryPill
              key={cat}
              label={cat}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            />
          ))}
        </div>

        {/* Entries */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((entry) => (
            <div
              key={entry.term}
              style={{
                padding: "12px 16px",
                background: "var(--bg-panel)",
                border: "1px solid var(--border-dim)",
                borderRadius: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--signal-core)" }}>
                  {entry.term}
                </span>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  padding: "1px 6px",
                  borderRadius: 999,
                  background: "var(--bg-panel-raised)",
                  color: "var(--text-muted)",
                }}>
                  {entry.category}
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {entry.definition}
              </div>
              {entry.example && (
                <div style={{
                  marginTop: 6,
                  padding: "4px 8px",
                  background: "var(--bg-panel-raised)",
                  borderRadius: 4,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--text-muted)",
                }}>
                  {entry.example}
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
              No terms match "{search}"
            </div>
          )}
        </div>
      </div>
    </TerminalShell>
  );
}

function CategoryPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "3px 10px",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
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
