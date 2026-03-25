import { useState, useEffect } from "react";

interface CTARow {
  underlying: string;
  position_today: number;
  position_yesterday: number;
  position_1m_ago: number;
  percentile_1m: number;
  percentile_3m: number;
  percentile_1y: number;
  z_score_3m: number;
}

interface CTAData {
  date: string;
  fetched_at: string;
  source: string;
  vol_targeting?: {
    implied_exposure_pct?: number;
    forced_reduction_pct?: number;
    est_selling_bn?: number;
  };
  posture?: string;
  squeeze_risk?: string;
  tables: {
    main: CTARow[];
    index?: CTARow[];
    commodity?: CTARow[];
    currency?: CTARow[];
  };
}

const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
const headerStyle: React.CSSProperties = { ...mono, fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: "var(--text-secondary, #64748b)" };
const panelStyle: React.CSSProperties = { background: "var(--bg-panel, #fff)", border: "1px solid var(--border-dim, #e2e8f0)", borderRadius: 4, padding: 16, marginBottom: 16 };

export default function CTAPanel() {
  const [data, setData] = useState<CTAData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"main" | "index" | "commodity" | "currency">("main");
  const radonUrl = localStorage.getItem("sibt_radon_url") || "http://localhost:3000";

  useEffect(() => {
    fetchCTA();
  }, []);

  const fetchCTA = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${radonUrl}/api/menthorq/cta`);
      if (!res.ok) throw new Error(`Radon ${res.status}`);
      const json = await res.json();
      setData(json.cta || json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "CTA fetch failed");
    }
    setLoading(false);
  };

  const spx = data?.tables?.main?.find((r) => r.underlying.includes("S&P 500"));
  const nq = data?.tables?.main?.find((r) => r.underlying.includes("Nasdaq"));

  // Derive posture from SPX percentile
  const posture = spx
    ? spx.percentile_3m <= 15 ? "HEAVY SHORT"
    : spx.percentile_3m <= 30 ? "SHORT"
    : spx.percentile_3m <= 50 ? "NEUTRAL"
    : spx.percentile_3m <= 70 ? "LONG"
    : "HEAVY LONG"
    : "UNKNOWN";

  const postureColor = posture.includes("SHORT") ? "var(--fault, #E85D6C)"
    : posture.includes("LONG") ? "var(--signal-core, #05AD98)"
    : "var(--text-secondary)";

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <span style={headerStyle}>CTA Positioning</span>
          <span style={{ ...mono, fontSize: 10, color: "var(--text-secondary)", marginLeft: 8 }}>Vol-Targeting Model</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {data && <span style={{ ...mono, fontSize: 10, color: "var(--text-secondary)" }}>{data.date}</span>}
          <button onClick={fetchCTA} disabled={loading} style={{ ...mono, fontSize: 11, padding: "4px 12px", border: "1px solid var(--border-dim)", borderRadius: 4, background: "none", cursor: "pointer" }}>
            {loading ? "..." : "REFRESH"}
          </button>
        </div>
      </div>

      {error && <div style={{ color: "var(--fault)", ...mono, fontSize: 12, marginBottom: 12 }}>{error}</div>}

      {data && (
        <>
          {/* Posture Badge + Key Metrics */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ padding: "4px 14px", borderRadius: 4, background: postureColor, color: "#fff", ...mono, fontSize: 11, fontWeight: 700 }}>
              {posture}
            </div>
            <span style={{ ...mono, fontSize: 11, color: "var(--text-secondary)" }}>CTA Equity Posture</span>
          </div>

          {/* SPX/NQ Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { label: "SPX 3M PCTILE", value: spx ? `${spx.percentile_3m}th` : "---", color: spx && spx.percentile_3m <= 20 ? "var(--fault)" : undefined },
              { label: "SPX 3M Z-SCORE", value: spx ? spx.z_score_3m.toFixed(2) : "---", color: spx && spx.z_score_3m < -1 ? "var(--fault)" : undefined },
              { label: "NQ 3M PCTILE", value: nq ? `${nq.percentile_3m}th` : "---", color: nq && nq.percentile_3m <= 20 ? "var(--fault)" : undefined },
              { label: "NQ 3M Z-SCORE", value: nq ? nq.z_score_3m.toFixed(2) : "---", color: nq && nq.z_score_3m < -1 ? "var(--fault)" : undefined },
            ].map((m) => (
              <div key={m.label} style={{ padding: 12, background: "var(--bg-panel-raised, #f8fafc)", borderRadius: 4 }}>
                <div style={{ ...headerStyle, fontSize: 10 }}>{m.label}</div>
                <div style={{ ...mono, fontSize: 22, fontWeight: 700, color: m.color, marginTop: 4 }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Stale warning */}
          {data.date && (() => {
            const dataDate = new Date(data.date);
            const today = new Date();
            const diffDays = Math.floor((today.getTime() - dataDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays > 1) {
              return (
                <div style={{ ...panelStyle, borderLeft: "3px solid var(--warn, #F5A623)", background: "rgba(245, 166, 35, 0.05)", marginBottom: 16 }}>
                  <div style={{ ...mono, fontSize: 11, color: "var(--warn)", fontWeight: 600 }}>CTA CACHE STALE</div>
                  <div style={{ ...mono, fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                    CTA positioning is stale. Expected {today.toISOString().slice(0, 10)}. Latest available {data.date}.
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Tab Navigation */}
          <div style={{ display: "flex", gap: 0, marginBottom: 12, borderBottom: "1px solid var(--border-dim)" }}>
            {(["main", "index", "commodity", "currency"] as const).map((t) => {
              const count = data.tables[t]?.length ?? 0;
              if (!count) return null;
              return (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  style={{
                    ...mono, fontSize: 11, padding: "6px 14px", border: "none",
                    borderBottom: activeTab === t ? "2px solid var(--signal-core)" : "2px solid transparent",
                    background: "none", color: activeTab === t ? "var(--signal-core)" : "var(--text-secondary)",
                    cursor: "pointer", textTransform: "uppercase", fontWeight: activeTab === t ? 600 : 400,
                  }}
                >
                  {t === "main" ? "Main Indices" : t} ({count})
                </button>
              );
            })}
          </div>

          {/* Table */}
          <CTATable rows={data.tables[activeTab] ?? []} />
        </>
      )}

      {!data && !loading && (
        <div style={{ ...mono, fontSize: 12, color: "var(--text-secondary)", textAlign: "center", padding: 24 }}>
          Connect Radon to view CTA positioning data. Requires MenthorQ integration.
        </div>
      )}
    </div>
  );
}

function CTATable({ rows }: { rows: CTARow[] }) {
  const cellColor = (val: number, isPercentile: boolean) => {
    if (isPercentile) {
      if (val <= 15) return "var(--fault)";
      if (val <= 30) return "#f97316";
      if (val >= 70) return "var(--signal-core)";
      return undefined;
    }
    if (val < -1.5) return "var(--fault)";
    if (val < -1) return "#f97316";
    if (val > 1) return "var(--signal-core)";
    return undefined;
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", ...mono, fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
            {["Underlying", "Today", "Yday", "1M Ago", "1M %ile", "3M %ile", "1Y %ile", "3M Z"].map((h) => (
              <th key={h} style={{ ...headerStyle, fontSize: 9, padding: "6px 8px", textAlign: h === "Underlying" ? "left" : "right" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.underlying} style={{ borderBottom: "1px solid var(--border-dim)" }}>
              <td style={{ padding: "6px 8px", fontWeight: 500 }}>{r.underlying}</td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: r.position_today < 0 ? "var(--fault)" : "var(--signal-core)" }}>
                {r.position_today.toFixed(2)}
              </td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: r.position_yesterday < 0 ? "var(--fault)" : "var(--signal-core)" }}>
                {r.position_yesterday.toFixed(2)}
              </td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: r.position_1m_ago < 0 ? "var(--fault)" : "var(--signal-core)" }}>
                {r.position_1m_ago.toFixed(2)}
              </td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: cellColor(r.percentile_1m, true) }}>{r.percentile_1m}</td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: cellColor(r.percentile_3m, true), fontWeight: r.percentile_3m <= 15 ? 700 : 400 }}>
                {r.percentile_3m}
              </td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: cellColor(r.percentile_1y, true) }}>{r.percentile_1y}</td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: cellColor(r.z_score_3m, false), fontWeight: Math.abs(r.z_score_3m) > 1.5 ? 700 : 400 }}>
                {r.z_score_3m.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
