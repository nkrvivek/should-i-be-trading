import { useState, useEffect } from "react";

interface FlowEntry {
  ticker: string;
  position: string;
  direction: string;
  flow_direction: string;
  flow_label: string;
  flow_class: string;
  strength: number;
  buy_ratio: number;
  daily_buy_ratios: { date: string; buy_ratio: number | null }[];
  note: string;
}

interface FlowData {
  analysis_time: string;
  positions_scanned: number;
  supports: FlowEntry[];
  against: FlowEntry[];
  watch: FlowEntry[];
  neutral: FlowEntry[];
  action_items?: string[];
}

const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
const header: React.CSSProperties = { ...mono, fontSize: 14, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: "var(--text-secondary, #64748b)" };
const panel: React.CSSProperties = { background: "var(--bg-panel, #fff)", border: "1px solid var(--border-dim, #e2e8f0)", borderRadius: 4, padding: 16, marginBottom: 16 };

export default function FlowAnalysisPanel() {
  const [data, setData] = useState<FlowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const radonUrl = localStorage.getItem("sibt_radon_api") || "http://localhost:8321";

  const scan = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${radonUrl}/flow-analysis`, { method: "POST" });
      if (!res.ok) throw new Error(`Radon ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Flow analysis failed");
    }
    setLoading(false);
  };

  useEffect(() => {
    // Try to load cached data on mount
    fetch(`${radonUrl}/flow-analysis`, { method: "POST", signal: AbortSignal.timeout(10_000) })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setData(d))
      .catch(() => { /* Radon not running — expected in prod */ });
  }, [radonUrl]);

  if (!data && !loading && !error) {
    return (
      <div style={panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={header}>Flow Analysis</span>
          <button onClick={scan} style={{ ...mono, fontSize: 13, padding: "4px 14px", background: "var(--signal-core)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
            SCAN FLOW
          </button>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 12 }}>
          Analyzes dark pool flow for/against your portfolio positions. Requires Radon + IB Gateway.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={header}>Flow Analysis</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {data && <span style={{ ...mono, fontSize: 12, color: "var(--text-secondary)" }}>{new Date(data.analysis_time).toLocaleTimeString()}</span>}
          <button onClick={scan} disabled={loading} style={{ ...mono, fontSize: 13, padding: "4px 14px", border: "1px solid var(--border-dim)", borderRadius: 4, background: "none", cursor: "pointer" }}>
            {loading ? "SCANNING..." : "REFRESH"}
          </button>
        </div>
      </div>

      {error && <div style={{ ...panel, background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" }}>{error}</div>}

      {data && (
        <>
          {/* Action Items */}
          {data.action_items && data.action_items.length > 0 && (
            <div style={{ ...panel, borderLeft: "3px solid var(--warn, #F5A623)" }}>
              <div style={{ ...header, color: "var(--warn)", marginBottom: 8 }}>Action Items</div>
              {data.action_items.map((item, i) => (
                <div key={i} style={{ ...mono, fontSize: 14, marginBottom: 4 }}>• {item}</div>
              ))}
            </div>
          )}

          {/* Supports */}
          <FlowSection title="Flow Supports Position" entries={data.supports} color="var(--signal-core, #05AD98)" emptyText="No supporting flow detected" />

          {/* Against */}
          <FlowSection title="Flow Against Position" entries={data.against} color="var(--fault, #E85D6C)" emptyText="No opposing flow detected" />

          {/* Watch */}
          <FlowSection title="Watch" entries={data.watch} color="var(--warn, #F5A623)" emptyText="" />

          {/* Neutral */}
          <FlowSection title="Neutral / Low Signal" entries={data.neutral} color="var(--text-secondary)" emptyText="" />
        </>
      )}
    </div>
  );
}

function FlowSection({ title, entries, color, emptyText }: { title: string; entries: FlowEntry[]; color: string; emptyText: string }) {
  if (!entries.length && !emptyText) return null;

  return (
    <div style={{ ...panel }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ ...header, color }}>{title}</span>
        <span style={{ ...mono, fontSize: 12, padding: "2px 8px", border: `1px solid ${color}`, borderRadius: 4, color }}>{entries.length} POSITIONS</span>
      </div>

      {!entries.length ? (
        <div style={{ ...mono, fontSize: 14, color: "var(--text-secondary)", padding: "8px 0" }}>• {emptyText}</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", ...mono, fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
              {["Ticker", "Position", "Flow", "Strength", "Note"].map((h) => (
                <th key={h} style={{ ...header, padding: "6px 10px", textAlign: "left", fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.ticker} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                <td style={{ padding: "8px 10px", fontWeight: 700 }}>{e.ticker}</td>
                <td style={{ padding: "8px 10px" }}>{e.position}</td>
                <td style={{ padding: "8px 10px" }}>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    background: e.flow_class === "accum" ? "rgba(5, 173, 152, 0.1)" : e.flow_class === "distrib" ? "rgba(232, 93, 108, 0.1)" : "#f1f5f9",
                    color: e.flow_class === "accum" ? "var(--signal-core)" : e.flow_class === "distrib" ? "var(--fault)" : "var(--text-secondary)",
                    border: `1px solid ${e.flow_class === "accum" ? "var(--signal-core)" : e.flow_class === "distrib" ? "var(--fault)" : "var(--border-dim)"}`,
                  }}>
                    {e.flow_label}
                  </span>
                </td>
                <td style={{ padding: "8px 10px" }}>
                  <StrengthBar value={e.strength} ratios={e.daily_buy_ratios} />
                </td>
                <td style={{ padding: "8px 10px", color: "var(--text-secondary)" }}>{e.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StrengthBar({ value, ratios }: { value: number; ratios: { date: string; buy_ratio: number | null }[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", gap: 2 }}>
        {ratios.slice(-5).map((r, i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 16,
              borderRadius: 1,
              background: r.buy_ratio == null ? "#e2e8f0"
                : r.buy_ratio > 0.55 ? "var(--signal-core)"
                : r.buy_ratio < 0.45 ? "var(--fault)"
                : "var(--text-secondary)",
              opacity: r.buy_ratio == null ? 0.3 : 0.8,
            }}
          />
        ))}
      </div>
      <span style={{ ...mono, fontSize: 13 }}>{value.toFixed(1)}</span>
    </div>
  );
}
