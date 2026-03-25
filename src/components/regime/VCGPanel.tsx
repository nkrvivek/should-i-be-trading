import { useState, useEffect } from "react";

interface VCGData {
  scan_time: string;
  market_open: boolean;
  credit_proxy: string;
  signal: {
    vcg: number;
    vcg_adj: number;
    residual: number;
    beta1_vvix: number;
    beta2_vix: number;
    vix: number;
    vvix: number;
    credit_price: number;
    credit_5d_return_pct: number;
    tier: string | null;
    vvix_severity: string;
    regime: string;
    interpretation: string;
    attribution: {
      vvix_pct: number;
      vix_pct: number;
    };
  };
  history: { date: string; vcg: number; vcg_adj: number; residual: number; vix: number; vvix: number; hyg: number }[];
}

const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
const header: React.CSSProperties = { ...mono, fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: "var(--text-secondary, #64748b)" };
const panel: React.CSSProperties = { background: "var(--bg-panel, #fff)", border: "1px solid var(--border-dim, #e2e8f0)", borderRadius: 4, padding: 16, marginBottom: 16 };

export default function VCGPanel() {
  const [data, setData] = useState<VCGData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const radonUrl = localStorage.getItem("sibt_radon_api") || "http://localhost:8321";

  const scan = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${radonUrl}/vcg/scan`, { method: "POST" });
      if (!res.ok) throw new Error(`Radon ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "VCG scan failed");
    }
    setLoading(false);
  };

  useEffect(() => { scan(); }, []);

  const s = data?.signal;
  const regimeColor = s?.interpretation === "NORMAL" ? "var(--signal-core)"
    : s?.interpretation === "CAUTION" ? "var(--warn)"
    : s?.interpretation === "ELEVATED" ? "var(--fault)"
    : "var(--text-secondary)";

  return (
    <div style={panel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <span style={header}>VCG Signal</span>
          <span style={{ ...mono, fontSize: 10, color: "var(--text-secondary)", marginLeft: 8 }}>Volatility-Credit Gap</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {s && (
            <span style={{ ...mono, fontSize: 10, padding: "2px 10px", background: regimeColor, color: "#fff", borderRadius: 4, fontWeight: 600 }}>
              {s.regime}
            </span>
          )}
          <span style={{ ...mono, fontSize: 10, color: "var(--text-secondary)" }}>{data?.credit_proxy}</span>
          <button onClick={scan} disabled={loading} style={{ ...mono, fontSize: 11, padding: "4px 12px", border: "1px solid var(--border-dim)", borderRadius: 4, background: "none", cursor: "pointer" }}>
            {loading ? "..." : "SCAN"}
          </button>
        </div>
      </div>

      {error && <div style={{ color: "var(--fault)", ...mono, fontSize: 12, marginBottom: 12 }}>{error}</div>}

      {s && (
        <>
          {/* Signal Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { label: "VCG Z-SCORE", value: s.vcg.toFixed(2), color: s.vcg < -1 ? "var(--fault)" : s.vcg > 1 ? "var(--signal-core)" : undefined },
              { label: "VCG ADJ (PANIC-ADJ)", value: s.vcg_adj.toFixed(2), sub: s.vcg_adj === s.vcg ? "NO SUPPRESSION" : "PANIC ADJUSTED" },
              { label: "CREDIT 5D RETURN", value: `${s.credit_5d_return_pct.toFixed(2)}%`, color: s.credit_5d_return_pct < 0 ? "var(--fault)" : "var(--signal-core)", sub: `${data.credit_proxy} @ $${s.credit_price.toFixed(2)}` },
              { label: "RESIDUAL", value: s.residual.toFixed(6), sub: "MODEL \u03B5" },
            ].map((m) => (
              <div key={m.label} style={{ padding: 12, background: "var(--bg-panel-raised, #f8fafc)", borderRadius: 4 }}>
                <div style={{ ...header, fontSize: 10 }}>{m.label}</div>
                <div style={{ ...mono, fontSize: 22, fontWeight: 700, color: m.color, marginTop: 4 }}>{m.value}</div>
                {m.sub && <div style={{ ...mono, fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>{m.sub}</div>}
              </div>
            ))}
          </div>

          {/* Signal Detail */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 12, background: "var(--bg-panel-raised, #f8fafc)", borderRadius: 4 }}>
              <div style={{ ...header, fontSize: 10, marginBottom: 8 }}>Severity</div>
              <div style={{ display: "flex", justifyContent: "space-between", ...mono, fontSize: 12, marginBottom: 4 }}>
                <span>VVIX Severity</span>
                <span style={{ color: s.vvix_severity === "extreme" ? "var(--fault)" : "var(--text-secondary)", fontWeight: 600 }}>{s.vvix_severity.toUpperCase()}</span>
              </div>
              <div style={{ ...mono, fontSize: 11, color: "var(--text-secondary)" }}>VVIX {s.vvix.toFixed(2)} | VIX {s.vix.toFixed(2)}</div>
            </div>

            <div style={{ padding: 12, background: "var(--bg-panel-raised, #f8fafc)", borderRadius: 4 }}>
              <div style={{ ...header, fontSize: 10, marginBottom: 8 }}>Attribution</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <div style={{ flex: s.attribution.vvix_pct, height: 8, background: "#3b82f6", borderRadius: 2 }} />
                <span style={{ ...mono, fontSize: 10 }}>VVIX {s.attribution.vvix_pct}%</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: s.attribution.vix_pct, height: 8, background: "var(--signal-core)", borderRadius: 2 }} />
                <span style={{ ...mono, fontSize: 10 }}>VIX {s.attribution.vix_pct}%</span>
              </div>
            </div>
          </div>

          {/* History Table */}
          {data.history && data.history.length > 0 && (
            <div>
              <div style={{ ...header, fontSize: 10, marginBottom: 8 }}>VCG HISTORY (20D)</div>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", ...mono, fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                      {["Date", "VCG", "VCG Adj", "Residual", "VIX", "VVIX", data.credit_proxy].map((h) => (
                        <th key={h} style={{ ...header, fontSize: 9, padding: "4px 8px", textAlign: "right" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.slice(0, 20).map((h) => (
                      <tr key={h.date} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                        <td style={{ padding: "4px 8px", textAlign: "right" }}>{h.date}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right", color: h.vcg < 0 ? "var(--fault)" : "var(--signal-core)" }}>{h.vcg > 0 ? "+" : ""}{h.vcg.toFixed(2)}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right" }}>{h.vcg_adj > 0 ? "+" : ""}{h.vcg_adj.toFixed(2)}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right" }}>{h.residual.toFixed(6)}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right" }}>{h.vix.toFixed(2)}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right" }}>{h.vvix.toFixed(2)}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right" }}>{h.hyg.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!s && !loading && <div style={{ ...mono, fontSize: 12, color: "var(--text-secondary)", textAlign: "center", padding: 24 }}>Connect Radon to view VCG signal data</div>}
    </div>
  );
}
