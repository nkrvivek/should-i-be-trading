import { useState } from "react";
import { exaSearch, type ExaResult } from "../../api/exaClient";

export function ResearchPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExaResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    try {
      const data = await exaSearch(query.trim());
      setResults(data.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
      <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Research a ticker or topic..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "6px 12px",
            background: "var(--bg-panel-raised)",
            border: "1px solid var(--border-dim)",
            borderRadius: 4,
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          style={{
            padding: "6px 16px",
            background: "var(--accent-bg)",
            border: "none",
            borderRadius: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 500,
            color: "var(--accent-text)",
            cursor: loading ? "default" : "pointer",
            opacity: loading || !query.trim() ? 0.5 : 1,
          }}
        >
          SEARCH
        </button>
      </form>

      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {loading && (
          <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
            Searching...
          </div>
        )}
        {error && (
          <div style={{ padding: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--negative)" }}>
            {error}
          </div>
        )}
        {results.map((r, i) => (
          <div
            key={i}
            style={{
              padding: "8px 12px",
              background: "var(--bg-panel)",
              border: "1px solid var(--border-dim)",
              borderRadius: 4,
            }}
          >
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--signal-core)",
                textDecoration: "none",
              }}
            >
              {r.title}
            </a>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", margin: "4px 0" }}>
              {r.publishedDate ? new Date(r.publishedDate).toLocaleDateString() : ""} | Score: {r.score.toFixed(2)}
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {r.text?.slice(0, 200)}{r.text && r.text.length > 200 ? "..." : ""}
            </div>
          </div>
        ))}
        {!loading && results.length === 0 && !error && (
          <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
            Search for market news, company research, or trading topics via Exa.
          </div>
        )}
      </div>
    </div>
  );
}
