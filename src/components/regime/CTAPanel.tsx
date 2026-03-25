import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

interface CFTCContract {
  name: string;
  category: string;
  code: string;
  latest: {
    date: string;
    netSpeculative: number;
    netCommercial: number;
    openInterest: number;
    specLong: number;
    specShort: number;
    netPctOI: number;
    weeklyChange: number;
    posture: string;
  };
  history: {
    date: string;
    netSpeculative: number;
    netCommercial: number;
    openInterest: number;
  }[];
}

interface CFTCData {
  source: string;
  lastReport: string;
  contracts: CFTCContract[];
}

const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
const headerStyle: React.CSSProperties = { ...mono, fontSize: 14, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: "var(--text-secondary, #64748b)" };
const panelStyle: React.CSSProperties = { background: "var(--bg-panel, #fff)", border: "1px solid var(--border-dim, #e2e8f0)", borderRadius: 4, padding: 16, marginBottom: 16 };

export default function CTAPanel() {
  const [data, setData] = useState<CFTCData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => { fetchCFTC(); }, []);

  const fetchCFTC = async () => {
    setLoading(true);
    setError("");
    try {
      if (isSupabaseConfigured()) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const session = await supabase.auth.getSession();
        const token = session.data?.session?.access_token;

        const headers: Record<string, string> = { "apikey": anonKey };
        if (token) headers["x-user-token"] = token;

        const res = await fetch(`${supabaseUrl}/functions/v1/cftc?weeks=8`, { headers });
        if (!res.ok) throw new Error(`CFTC ${res.status}`);
        setData(await res.json());
      } else {
        // Direct call (local dev)
        const res = await fetch("https://publicreporting.cftc.gov/resource/jun7-fc8e.json?$limit=5");
        if (!res.ok) throw new Error("CFTC API unavailable");
        setData(null); // Need edge function for processing
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "CFTC fetch failed");
    }
    setLoading(false);
  };

  const categories = data ? [...new Set(data.contracts.map((c) => c.category))] : [];
  const filtered = data?.contracts.filter((c) => activeCategory === "all" || c.category === activeCategory) ?? [];

  // SPX posture for hero
  const spx = data?.contracts.find((c) => c.name.includes("S&P 500"));
  const postureColor = (p: string) =>
    p.includes("HEAVY SHORT") ? "var(--fault, #E85D6C)"
    : p.includes("SHORT") ? "#f97316"
    : p.includes("HEAVY LONG") ? "var(--signal-core, #05AD98)"
    : p.includes("LONG") ? "#22c55e"
    : "var(--text-secondary)";

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <span style={headerStyle}>Institutional Positioning</span>
          <span style={{ ...mono, fontSize: 12, color: "var(--text-secondary)", marginLeft: 8 }}>CFTC Commitments of Traders</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {data && <span style={{ ...mono, fontSize: 12, color: "var(--text-secondary)" }}>Report: {data.lastReport}</span>}
          <button onClick={fetchCFTC} disabled={loading} style={{ ...mono, fontSize: 13, padding: "4px 12px", border: "1px solid var(--border-dim)", borderRadius: 4, background: "none", cursor: "pointer" }}>
            {loading ? "..." : "REFRESH"}
          </button>
        </div>
      </div>

      {error && <div style={{ color: "var(--fault)", ...mono, fontSize: 14, marginBottom: 12 }}>{error}</div>}

      {data && (
        <>
          {/* Hero: SPX Posture + Key Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
            {spx && (
              <div style={{ padding: 12, background: "var(--bg-panel-raised, #f8fafc)", borderRadius: 4 }}>
                <div style={{ ...headerStyle, fontSize: 12 }}>S&P 500 POSTURE</div>
                <div style={{ ...mono, fontSize: 18, fontWeight: 700, color: postureColor(spx.latest.posture), marginTop: 4 }}>
                  {spx.latest.posture}
                </div>
                <div style={{ ...mono, fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                  Net: {(spx.latest.netSpeculative / 1000).toFixed(1)}K contracts
                </div>
              </div>
            )}
            {data.contracts.filter((c) => ["E-Mini Nasdaq 100", "UST 10Y Note", "Gold"].includes(c.name)).map((c) => (
              <div key={c.code} style={{ padding: 12, background: "var(--bg-panel-raised, #f8fafc)", borderRadius: 4 }}>
                <div style={{ ...headerStyle, fontSize: 12 }}>{c.name.toUpperCase()}</div>
                <div style={{ ...mono, fontSize: 18, fontWeight: 700, color: postureColor(c.latest.posture), marginTop: 4 }}>
                  {c.latest.posture}
                </div>
                <div style={{ ...mono, fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                  {c.latest.netPctOI > 0 ? "+" : ""}{c.latest.netPctOI.toFixed(1)}% of OI
                </div>
              </div>
            ))}
          </div>

          {/* Category Tabs */}
          <div style={{ display: "flex", gap: 0, marginBottom: 12, borderBottom: "1px solid var(--border-dim)" }}>
            {["all", ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  ...mono, fontSize: 13, padding: "6px 14px", border: "none",
                  borderBottom: activeCategory === cat ? "2px solid var(--signal-core)" : "2px solid transparent",
                  background: "none", color: activeCategory === cat ? "var(--signal-core)" : "var(--text-secondary)",
                  cursor: "pointer", textTransform: "uppercase", fontWeight: activeCategory === cat ? 600 : 400,
                }}
              >
                {cat} ({cat === "all" ? data.contracts.length : data.contracts.filter((c) => c.category === cat).length})
              </button>
            ))}
          </div>

          {/* Positioning Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", ...mono, fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  {["Contract", "Posture", "Net Spec", "% of OI", "Wk Chg", "Spec Long", "Spec Short", "Comm Net", "OI"].map((h) => (
                    <th key={h} style={{ ...headerStyle, fontSize: 11, padding: "6px 8px", textAlign: h === "Contract" ? "left" : "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const l = c.latest;
                  return (
                    <tr key={c.code} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                      <td style={{ padding: "6px 8px", fontWeight: 500 }}>{c.name}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                          color: postureColor(l.posture),
                          background: l.posture.includes("SHORT") ? "rgba(232, 93, 108, 0.1)" : l.posture.includes("LONG") ? "rgba(5, 173, 152, 0.1)" : "#f1f5f9",
                        }}>
                          {l.posture}
                        </span>
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: l.netSpeculative >= 0 ? "var(--signal-core)" : "var(--fault)" }}>
                        {(l.netSpeculative / 1000).toFixed(1)}K
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: l.netPctOI >= 0 ? "var(--signal-core)" : "var(--fault)", fontWeight: Math.abs(l.netPctOI) > 10 ? 700 : 400 }}>
                        {l.netPctOI > 0 ? "+" : ""}{l.netPctOI.toFixed(1)}%
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: l.weeklyChange >= 0 ? "var(--signal-core)" : "var(--fault)" }}>
                        {l.weeklyChange > 0 ? "+" : ""}{(l.weeklyChange / 1000).toFixed(1)}K
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{(l.specLong / 1000).toFixed(1)}K</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{(l.specShort / 1000).toFixed(1)}K</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: l.netCommercial >= 0 ? "var(--signal-core)" : "var(--fault)" }}>
                        {(l.netCommercial / 1000).toFixed(1)}K
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{(l.openInterest / 1000).toFixed(0)}K</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Source attribution */}
          <div style={{ ...mono, fontSize: 11, color: "var(--text-secondary)", marginTop: 12, borderTop: "1px solid var(--border-dim)", paddingTop: 8 }}>
            Source: CFTC Commitments of Traders (weekly, Tuesday data released Friday). Speculative = non-commercial traders (hedge funds, CTAs). Commercial = hedgers.
          </div>
        </>
      )}

      {!data && !loading && !error && (
        <div style={{ ...mono, fontSize: 14, color: "var(--text-secondary)", textAlign: "center", padding: 24 }}>
          Loading CFTC institutional positioning data...
        </div>
      )}
    </div>
  );
}
