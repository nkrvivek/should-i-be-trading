import { useState } from "react";
import { exaSearch, type ExaResult } from "../../api/exaClient";
import { isSupabaseConfigured } from "../../lib/supabase";

export function ResearchPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExaResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAccess = isSupabaseConfigured();

  const handleSearch = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (!query.trim() || loading) return;

    if (!hasAccess) {
      setError("Sign in and configure your Exa API key in Settings, or the server-side proxy will handle it automatically.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await exaSearch(query.trim());
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(e); } }}
          placeholder="Research a ticker or topic..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "6px 12px",
            background: "var(--bg-panel-raised)",
            border: "1px solid var(--border-dim)",
            borderRadius: 4,
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          style={{
            padding: "6px 16px",
            background: "var(--accent-bg)",
            border: "none",
            borderRadius: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--accent-text)",
            cursor: loading ? "default" : "pointer",
            opacity: loading || !query.trim() ? 0.5 : 1,
          }}
        >
          SEARCH
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {loading && (
          <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
            Searching...
          </div>
        )}
        {error && (
          <div style={{ padding: 12, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--negative)", background: "rgba(232,93,108,0.08)", borderRadius: 4, border: "1px solid rgba(232,93,108,0.2)" }}>
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
                fontSize: 14,
                fontWeight: 500,
                color: "var(--signal-core)",
                textDecoration: "none",
              }}
            >
              {r.title}
            </a>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", margin: "4px 0" }}>
              {r.publishedDate ? new Date(r.publishedDate).toLocaleDateString() : ""} {r.score ? `| Score: ${r.score.toFixed(2)}` : ""}
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {r.text?.slice(0, 200)}{r.text && r.text.length > 200 ? "..." : ""}
            </div>
          </div>
        ))}
        {!loading && results.length === 0 && !error && (
          <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
            {hasAccess
              ? "Search for market news, company research, or trading topics via Exa."
              : "Sign in to enable authenticated Exa research through the server-side proxy."}
          </div>
        )}
      </div>
    </div>
  );
}
