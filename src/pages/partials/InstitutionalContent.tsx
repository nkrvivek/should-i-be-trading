/**
 * Institutional 13F tracker — follow hedge fund positions.
 * Shows top filers, their latest filings, and search functionality.
 * Used as a sub-tab within ResearchPage.
 */

import { useCallback, useEffect, useState } from "react";
import { Panel } from "../../components/layout/Panel";
import {
  getTopFilers,
  getHoldings,
  type InstitutionalFiler,
  type FilerHoldings,
} from "../../api/sec13fClient";
import { isSupabaseConfigured } from "../../lib/supabase";

export default function InstitutionalContent() {
  const [filers, setFilers] = useState<InstitutionalFiler[]>([]);
  const [selectedFiler, setSelectedFiler] = useState<InstitutionalFiler | null>(null);
  const [holdings, setHoldings] = useState<FilerHoldings | null>(null);
  const [loading, setLoading] = useState(false);
  const [filersLoading, setFilersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  // Load top filers on mount
  useEffect(() => {
    if (!configured) return;
    getTopFilers()
      .then(setFilers)
      .catch(() => setFilers([]))
      .finally(() => setFilersLoading(false));
  }, [configured]);

  const loadHoldings = useCallback(async (filer: InstitutionalFiler) => {
    setSelectedFiler(filer);
    setLoading(true);
    setError(null);
    try {
      const data = await getHoldings(filer.cik);
      setHoldings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load holdings");
      setHoldings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  if (!configured) {
    return (
      <Panel title="Institutional Tracker">
        <div style={{ padding: 24, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
          Institutional tracker requires Supabase configuration.
        </div>
      </Panel>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          background: "var(--bg-panel)",
          border: "1px solid var(--border-dim)",
          borderRadius: 4,
        }}
      >
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          13F Institutional Tracker
        </h2>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
          Follow the smart money. Track quarterly 13F filings from top hedge funds and institutional investors.
          Institutions managing over $100M must disclose their equity holdings within 45 days of quarter end.
        </p>
      </div>

      {error && (
        <div style={{ padding: "8px 12px", background: "rgba(232, 93, 108, 0.1)", border: "1px solid var(--negative)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--negative)" }}>
          {error}
        </div>
      )}

      {/* Two-column layout: filers list + filing detail */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, minHeight: 500 }}>
        {/* Left: Filer List */}
        <Panel title="Top Institutional Filers" loading={filersLoading}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {filers.map((filer) => {
              const isSelected = selectedFiler?.cik === filer.cik;
              return (
                <button
                  key={filer.cik}
                  onClick={() => loadHoldings(filer)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    background: isSelected ? "rgba(5, 173, 152, 0.08)" : "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--border-dim)",
                    borderLeft: isSelected ? "3px solid var(--signal-core)" : "3px solid transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    transition: "background 0.15s",
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: isSelected ? "var(--signal-core)" : "var(--text-primary)" }}>
                      {filer.name}
                    </div>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {filer.manager}
                    </div>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
                    CIK {filer.cik}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* Right: Filing Detail */}
        <Panel title={selectedFiler ? `${selectedFiler.name} — Filings` : "Select a Filer"} loading={loading}>
          {!selectedFiler && (
            <div style={{ padding: 32, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
              Select an institutional filer from the list to view their latest 13F filings.
              <br /><br />
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                13F filings reveal what hedge funds are buying and selling each quarter.
                Changes in position sizes can signal conviction or concern.
              </span>
            </div>
          )}

          {holdings && selectedFiler && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Filer info */}
              <div style={{ padding: "8px 12px", background: "var(--bg-base)", borderRadius: 4, border: "1px solid var(--border-dim)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                      {holdings.name || selectedFiler.name}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                      CIK: {holdings.cik}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                      Latest Filing: {holdings.latestFilingDate || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Filing History */}
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", padding: "0 4px" }}>
                Recent 13F Filings
              </div>

              {holdings.filings.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                      <Th>Form</Th>
                      <Th>Filing Date</Th>
                      <Th>Accession</Th>
                      <Th align="center">View</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.filings.map((f, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-dim)", height: 36 }}>
                        <td style={{ padding: "0 8px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 700,
                              color: f.form.includes("/A") ? "var(--warning)" : "var(--signal-core)",
                              border: `1px solid ${f.form.includes("/A") ? "var(--warning)" : "var(--signal-core)"}`,
                            }}
                          >
                            {f.form}
                          </span>
                        </td>
                        <td style={{ padding: "0 8px", color: "var(--text-primary)", fontWeight: 600 }}>
                          {formatDate(f.filingDate)}
                        </td>
                        <td style={{ padding: "0 8px", color: "var(--text-muted)", fontSize: 11 }}>
                          {f.accession}
                        </td>
                        <td style={{ padding: "0 8px", textAlign: "center" }}>
                          <a
                            href={`https://www.sec.gov/Archives/edgar/data/${holdings.cik.replace(/^0+/, "")}/${f.accession.replace(/-/g, "")}/${f.document}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontFamily: "var(--font-mono)",
                              fontSize: 11,
                              fontWeight: 600,
                              color: "var(--info)",
                              border: "1px solid var(--info)",
                              textDecoration: "none",
                            }}
                          >
                            SEC EDGAR
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
                  No recent 13F filings found for this filer.
                </div>
              )}

              {/* Educational callout */}
              <div
                style={{
                  padding: "10px 12px",
                  background: "rgba(5, 173, 152, 0.05)",
                  border: "1px solid rgba(5, 173, 152, 0.2)",
                  borderRadius: 4,
                }}
              >
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--signal-core)", marginBottom: 4 }}>
                  HOW TO READ 13F FILINGS
                </div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  <strong>New positions</strong> signal conviction in a thesis.{" "}
                  <strong>Increased positions</strong> show doubling down.{" "}
                  <strong>Reduced positions</strong> may mean profit-taking or changing outlook.{" "}
                  <strong>Sold out</strong> positions indicate thesis completion or loss of conviction.{" "}
                  Note: 13F filings are delayed 45 days after quarter end — positions may have changed since filing.
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* Disclaimer */}
      <div style={{ padding: "8px 12px", fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", borderTop: "1px solid var(--border-dim)" }}>
        Data from SEC EDGAR (public domain). 13F filings are reported quarterly with a 45-day delay.
        Institutional holdings shown may no longer reflect current positions. Not investment advice.
      </div>
    </div>
  );
}

/* ─── Sub-components ───────────────────────────────── */

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) {
  return (
    <th style={{ padding: "4px 8px", textAlign: align, fontWeight: 500, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {children}
    </th>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}
