import { useState } from "react";
import { TerminalShell } from "../components/layout/TerminalShell";
import { Panel } from "../components/layout/Panel";
import { useEarningsCalendar, type EarningsEntry } from "../hooks/useEarningsCalendar";

const HOUR_LABELS: Record<string, { label: string; color: string }> = {
  bmo: { label: "PRE-MKT", color: "var(--warning)" },
  amc: { label: "AFTER-MKT", color: "var(--signal-deep)" },
  dmh: { label: "DURING", color: "var(--text-muted)" },
  "": { label: "TBD", color: "var(--text-muted)" },
};

const SECTOR_COLORS: Record<string, string> = {
  Technology: "#3B82F6",
  Financials: "#10B981",
  Healthcare: "#EC4899",
  Consumer: "#F59E0B",
  Energy: "#EF4444",
  Communication: "#06B6D4",
  Industrials: "#6366F1",
  Utilities: "#84CC16",
  "Consumer Staples": "#8B5CF6",
  Other: "var(--text-muted)",
};

function formatRevenue(n: number | null): string {
  if (n == null) return "---";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function formatEps(n: number | null): string {
  if (n == null) return "---";
  return `$${n.toFixed(2)}`;
}

function getEarningsExpectation(e: EarningsEntry): { label: string; color: string } {
  if (e.epsActual != null && e.epsEstimate != null) {
    const surprise = ((e.epsActual - e.epsEstimate) / Math.abs(e.epsEstimate)) * 100;
    if (surprise > 10) return { label: `BEAT +${surprise.toFixed(0)}%`, color: "var(--positive)" };
    if (surprise > 0) return { label: `BEAT +${surprise.toFixed(0)}%`, color: "var(--positive)" };
    if (surprise < -10) return { label: `MISS ${surprise.toFixed(0)}%`, color: "var(--negative)" };
    if (surprise < 0) return { label: `MISS ${surprise.toFixed(0)}%`, color: "var(--negative)" };
    return { label: "IN-LINE", color: "var(--neutral)" };
  }
  // Upcoming — estimate expectation
  return { label: "UPCOMING", color: "var(--text-muted)" };
}

function groupByWeek(entries: EarningsEntry[]): { weekLabel: string; entries: EarningsEntry[] }[] {
  const groups = new Map<string, EarningsEntry[]>();
  for (const e of entries) {
    const date = new Date(e.date + "T12:00:00");
    const monday = new Date(date);
    monday.setDate(date.getDate() - date.getDay() + 1);
    const key = monday.toISOString().split("T")[0];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  return Array.from(groups.entries()).map(([key, entries]) => {
    const monday = new Date(key + "T12:00:00");
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const weekLabel = `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${friday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    return { weekLabel, entries: entries.sort((a, b) => a.date.localeCompare(b.date)) };
  });
}

export function EarningsPage() {
  const { earnings, loading, error, refresh } = useEarningsCalendar(6);
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [hourFilter, setHourFilter] = useState<string | null>(null);

  // Get unique sectors
  const sectors = [...new Set(earnings.map((e) => e.sector ?? "Other"))].sort();

  // Apply filters
  const filtered = earnings.filter((e) => {
    if (sectorFilter && e.sector !== sectorFilter) return false;
    if (hourFilter && e.hour !== hourFilter) return false;
    return true;
  });

  const weeks = groupByWeek(filtered);

  // Summary stats
  const thisWeek = filtered.filter((e) => {
    const d = new Date(e.date + "T12:00:00");
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / 86400000;
    return diff >= 0 && diff <= 7;
  });

  return (
    <TerminalShell>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header */}
        <div style={{
          padding: "12px 16px",
          background: "var(--bg-panel)",
          border: "1px solid var(--border-dim)",
          borderRadius: 4,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{
                fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700,
                color: "var(--text-primary)", margin: 0,
              }}>
                Earnings Calendar
              </h2>
              <p style={{
                fontFamily: "var(--font-sans)", fontSize: 11,
                color: "var(--text-muted)", margin: "4px 0 0",
              }}>
                Upcoming earnings for {earnings.length} major stocks across {sectors.length} sectors.
                {thisWeek.length > 0 && ` ${thisWeek.length} reporting this week.`}
              </p>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
              Next 6 weeks
            </div>
          </div>
        </div>

        {/* Sector filter chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <FilterChip
            label="ALL"
            active={!sectorFilter}
            onClick={() => setSectorFilter(null)}
            color="var(--signal-core)"
          />
          {sectors.map((s) => (
            <FilterChip
              key={s}
              label={s.toUpperCase()}
              count={earnings.filter((e) => e.sector === s).length}
              active={sectorFilter === s}
              onClick={() => setSectorFilter(sectorFilter === s ? null : s)}
              color={SECTOR_COLORS[s] ?? "var(--text-muted)"}
            />
          ))}
        </div>

        {/* Hour filter */}
        <div style={{ display: "flex", gap: 6 }}>
          <FilterChip label="ALL HOURS" active={!hourFilter} onClick={() => setHourFilter(null)} color="var(--text-secondary)" />
          <FilterChip label="PRE-MARKET" active={hourFilter === "bmo"} onClick={() => setHourFilter(hourFilter === "bmo" ? null : "bmo")} color="var(--warning)" />
          <FilterChip label="AFTER-MARKET" active={hourFilter === "amc"} onClick={() => setHourFilter(hourFilter === "amc" ? null : "amc")} color="var(--signal-deep)" />
        </div>

        {error && (
          <div style={{ padding: "8px 12px", background: "rgba(232, 93, 108, 0.1)", border: "1px solid var(--negative)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--negative)" }}>
            {error}
          </div>
        )}

        {/* Weekly groupings */}
        {loading && earnings.length === 0 ? (
          <Panel title="Loading...">
            <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
              Fetching earnings calendar...
            </div>
          </Panel>
        ) : (
          weeks.map(({ weekLabel, entries }) => (
            <Panel key={weekLabel} title={`Week of ${weekLabel}`} onRefresh={refresh} loading={loading}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                    <Th>Date</Th>
                    <Th>Ticker</Th>
                    <Th>Sector</Th>
                    <Th>When</Th>
                    <Th align="right">EPS Est</Th>
                    <Th align="right">Rev Est</Th>
                    <Th align="right">EPS Act</Th>
                    <Th>Result</Th>
                    <Th>Analyst</Th>
                    <Th>Track</Th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => {
                    const expectation = getEarningsExpectation(e);
                    const hourCfg = HOUR_LABELS[e.hour] ?? HOUR_LABELS[""];
                    return (
                      <tr key={`${e.symbol}-${i}`} style={{ borderBottom: "1px solid var(--border-dim)", height: 32 }}>
                        <td style={{ padding: "0 8px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                          {new Date(e.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </td>
                        <td style={{ padding: "0 8px", fontWeight: 700, color: "var(--text-primary)" }}>
                          {e.symbol}
                        </td>
                        <td style={{ padding: "0 8px" }}>
                          <span style={{
                            display: "inline-block", padding: "1px 6px", borderRadius: 999,
                            fontSize: 9, color: SECTOR_COLORS[e.sector ?? "Other"],
                            border: `1px solid ${SECTOR_COLORS[e.sector ?? "Other"]}`,
                          }}>
                            {e.sector}
                          </span>
                        </td>
                        <td style={{ padding: "0 8px" }}>
                          <span style={{
                            display: "inline-block", padding: "1px 6px", borderRadius: 999,
                            fontSize: 9, fontWeight: 600, color: hourCfg.color,
                            border: `1px solid ${hourCfg.color}`,
                          }}>
                            {hourCfg.label}
                          </span>
                        </td>
                        <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                          {formatEps(e.epsEstimate)}
                        </td>
                        <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                          {formatRevenue(e.revenueEstimate)}
                        </td>
                        <td style={{ padding: "0 8px", textAlign: "right", fontWeight: 600, color: e.epsActual != null ? (e.epsActual >= (e.epsEstimate ?? 0) ? "var(--positive)" : "var(--negative)") : "var(--text-muted)" }}>
                          {formatEps(e.epsActual)}
                        </td>
                        <td style={{ padding: "0 8px" }}>
                          <span style={{
                            display: "inline-block", padding: "1px 6px", borderRadius: 999,
                            fontSize: 9, fontWeight: 600, color: expectation.color,
                            border: `1px solid ${expectation.color}`,
                          }}>
                            {expectation.label}
                          </span>
                        </td>
                        {/* Analyst consensus */}
                        <td style={{ padding: "0 8px" }}>
                          {e.analyst ? (
                            <span style={{
                              display: "inline-block", padding: "1px 6px", borderRadius: 999,
                              fontSize: 9, fontWeight: 600,
                              color: e.analyst.buyPct >= 70 ? "var(--positive)" : e.analyst.buyPct >= 40 ? "var(--warning)" : "var(--negative)",
                              border: `1px solid ${e.analyst.buyPct >= 70 ? "var(--positive)" : e.analyst.buyPct >= 40 ? "var(--warning)" : "var(--negative)"}`,
                            }}>
                              {e.analyst.signal} ({e.analyst.buyPct.toFixed(0)}%)
                            </span>
                          ) : (
                            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>---</span>
                          )}
                        </td>
                        {/* EPS track record */}
                        <td style={{ padding: "0 8px" }}>
                          {e.epsSurprises && e.epsSurprises.length > 0 ? (
                            <div style={{ display: "flex", gap: 2 }}>
                              {e.epsSurprises.slice(0, 4).map((s, si) => (
                                <span
                                  key={si}
                                  title={`Q${s.quarter} ${s.year}: ${s.surprisePercent > 0 ? "+" : ""}${s.surprisePercent.toFixed(1)}%`}
                                  style={{
                                    display: "inline-block", width: 8, height: 8, borderRadius: 2,
                                    background: s.surprisePercent > 0 ? "var(--positive)" : s.surprisePercent < 0 ? "var(--negative)" : "var(--text-muted)",
                                    opacity: 0.8,
                                  }}
                                />
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>---</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Panel>
          ))
        )}

        {filtered.length === 0 && !loading && (
          <Panel title="No Earnings">
            <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
              No major earnings found for the selected filters.
            </div>
          </Panel>
        )}

        {/* Disclaimer */}
        <div style={{
          padding: "8px 12px", fontFamily: "var(--font-sans)", fontSize: 10,
          color: "var(--text-muted)", fontStyle: "italic",
          borderTop: "1px solid var(--border-dim)",
        }}>
          Earnings data from Finnhub. EPS and revenue estimates are consensus analyst forecasts.
          Results and expectations are for informational purposes only and do not constitute investment advice.
        </div>
      </div>
    </TerminalShell>
  );
}

function FilterChip({ label, count, active, onClick, color }: {
  label: string; count?: number; active: boolean; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "3px 10px", borderRadius: 999,
        fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600,
        color: active ? "#000" : color,
        background: active ? color : "transparent",
        border: `1px solid ${color}`,
        cursor: "pointer",
        opacity: active ? 1 : 0.7,
      }}
    >
      {label}
      {count != null && <span style={{ opacity: 0.7 }}>({count})</span>}
    </button>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th style={{
      padding: "4px 8px", textAlign: align, fontWeight: 500, fontSize: 9,
      color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      {children}
    </th>
  );
}
