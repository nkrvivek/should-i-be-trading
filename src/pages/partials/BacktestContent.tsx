/**
 * Signal Backtester content — extracted from BacktestPage.
 * Used as a sub-tab within SignalsPage.
 */

import { useState } from "react";
import { useBacktest } from "../../hooks/useBacktest";
import { useAuthStore } from "../../stores/authStore";
import { hasFeature } from "../../lib/featureGates";

type Period = "3M" | "6M" | "1Y";

function signalColor(signal: string): string {
  if (signal === "TRADE") return "#05AD98";
  if (signal === "CAUTION") return "#F5A623";
  return "#E85D6C";
}

export default function BacktestContent() {
  const effectiveTier = useAuthStore((s) => s.effectiveTier);
  const tier = effectiveTier();
  const canAccessFull = hasFeature(tier, "backtester_full");
  const canAccessBasic = hasFeature(tier, "backtester_basic");

  const [period, setPeriod] = useState<Period>(canAccessFull ? "1Y" : "3M");
  const { result, loading, error, dataAvailable, refresh } = useBacktest(period);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>Signal Backtester</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Historical performance of SIBT traffic light signals vs buy-and-hold SPY
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {(["3M", "6M", "1Y"] as Period[]).map((p) => {
            const disabled = !canAccessBasic || (p !== "3M" && !canAccessFull);
            return (
              <button
                key={p}
                onClick={() => !disabled && setPeriod(p)}
                disabled={disabled}
                style={{
                  padding: "4px 12px", borderRadius: 4, border: "1px solid var(--border-dim)",
                  background: period === p ? "var(--signal-core)" : "var(--bg-panel)",
                  color: period === p ? "var(--bg-base)" : disabled ? "var(--text-muted)" : "var(--text-primary)",
                  fontFamily: "var(--font-mono)", fontSize: 13,
                  cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
                }}
              >
                {p}{disabled ? " (Pro)" : ""}
              </button>
            );
          })}
          <button onClick={refresh} disabled={loading} style={{ padding: "4px 12px", borderRadius: 4, border: "1px solid var(--border-dim)", background: "var(--bg-panel)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: 13, cursor: "pointer" }}>
            &#8635;
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: 32, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-muted)" }}>
          Computing backtest results...
        </div>
      )}

      {error && (
        <div style={{ padding: 12, borderRadius: 4, border: "1px solid var(--fault)", background: "color-mix(in srgb, var(--fault) 8%, transparent)", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fault)", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {!loading && !error && !dataAvailable && (
        <div style={{ padding: 32, textAlign: "center", background: "var(--bg-panel)", border: "1px solid var(--border-dim)", borderRadius: 4 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, color: "var(--text-primary)", marginBottom: 8 }}>Recording market data...</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
            SIBT is recording daily market scores for backtesting. Check back in a few days once we have enough data points.
          </div>
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Hero Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <StatCard label="SIBT Return" value={`${result.sibtReturn >= 0 ? "+" : ""}${result.sibtReturn}%`} color={result.sibtReturn >= 0 ? "#05AD98" : "#E85D6C"} detail={`Following TRADE signals only (${period})`} />
            <StatCard label="Buy & Hold SPY" value={`${result.buyHoldReturn >= 0 ? "+" : ""}${result.buyHoldReturn}%`} color={result.buyHoldReturn >= 0 ? "#05AD98" : "#E85D6C"} detail="Holding SPY every day" />
            <StatCard label="Outperformance" value={`${result.outperformance >= 0 ? "+" : ""}${result.outperformance}%`} color={result.outperformance >= 0 ? "#05AD98" : "#E85D6C"} detail="SIBT minus buy-and-hold" />
            <StatCard label="Win Rate" value={`${result.winRate}%`} color={result.winRate >= 55 ? "#05AD98" : result.winRate >= 45 ? "#F5A623" : "#E85D6C"} detail={`Of ${result.tradeDays} TRADE days`} />
            <StatCard label="Max Drawdown" value={`${result.maxDrawdown}%`} color={result.maxDrawdown > -5 ? "#05AD98" : result.maxDrawdown > -10 ? "#F5A623" : "#E85D6C"} detail="Worst peak-to-trough" />
            <StatCard label="Avg Win / Loss" value={`+${result.avgWinDay}% / ${result.avgLoseDay}%`} color="var(--text-primary)" detail="Average day returns" />
          </div>

          {/* Signal Distribution */}
          <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-dim)", borderRadius: 4, padding: 16 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Signal Distribution ({result.totalDays} trading days)
            </div>
            <div style={{ display: "flex", gap: 2, height: 24, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ flex: result.tradeDays, background: "#05AD98", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {result.tradeDays > 5 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#fff" }}>TRADE {result.tradeDays}</span>}
              </div>
              <div style={{ flex: result.cautionDays, background: "#F5A623", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {result.cautionDays > 5 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#fff" }}>CAUTION {result.cautionDays}</span>}
              </div>
              <div style={{ flex: result.noTradeDays, background: "#E85D6C", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {result.noTradeDays > 5 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#fff" }}>NO TRADE {result.noTradeDays}</span>}
              </div>
            </div>
          </div>

          {/* Equity Curve */}
          {result.equityCurve.length > 0 && (
            <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-dim)", borderRadius: 4, padding: 16 }}>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                Equity Curve ($100 starting)
              </div>
              <EquityCurve data={result.equityCurve} />
              <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#05AD98" }}>&#9632; SIBT Strategy</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#94a3b8" }}>&#9632; Buy & Hold SPY</span>
              </div>
            </div>
          )}

          {/* Daily Returns Table */}
          <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-dim)", borderRadius: 4, padding: 16, overflow: "auto" }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Recent Signals (last 20 days)
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                  <th style={{ textAlign: "left", padding: "4px 8px", color: "var(--text-muted)", fontSize: 11 }}>DATE</th>
                  <th style={{ textAlign: "center", padding: "4px 8px", color: "var(--text-muted)", fontSize: 11 }}>SIGNAL</th>
                  <th style={{ textAlign: "right", padding: "4px 8px", color: "var(--text-muted)", fontSize: 11 }}>SCORE</th>
                  <th style={{ textAlign: "right", padding: "4px 8px", color: "var(--text-muted)", fontSize: 11 }}>VIX</th>
                  <th style={{ textAlign: "right", padding: "4px 8px", color: "var(--text-muted)", fontSize: 11 }}>SPY</th>
                  <th style={{ textAlign: "right", padding: "4px 8px", color: "var(--text-muted)", fontSize: 11 }}>SPY CHG</th>
                </tr>
              </thead>
              <tbody>
                {result.dailyReturns.slice(-20).reverse().map((d) => (
                  <tr key={d.date} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                    <td style={{ padding: "4px 8px", color: "var(--text-secondary)" }}>{d.date}</td>
                    <td style={{ padding: "4px 8px", textAlign: "center" }}>
                      <span style={{ color: signalColor(d.signal), fontWeight: 600 }}>{d.signal}</span>
                    </td>
                    <td style={{ padding: "4px 8px", textAlign: "right", color: "var(--text-secondary)" }}>{d.marketScore}</td>
                    <td style={{ padding: "4px 8px", textAlign: "right", color: "var(--text-secondary)" }}>{d.vix?.toFixed(1)}</td>
                    <td style={{ padding: "4px 8px", textAlign: "right", color: "var(--text-secondary)" }}>{d.spyClose?.toFixed(2)}</td>
                    <td style={{ padding: "4px 8px", textAlign: "right", color: d.spyChange >= 0 ? "#05AD98" : "#E85D6C" }}>
                      {d.spyChange >= 0 ? "+" : ""}{d.spyChange.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "8px 0", lineHeight: 1.6 }}>
            Past performance does not guarantee future results. Not investment advice.
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, detail }: { label: string; value: string; color: string; detail: string }) {
  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-dim)", borderRadius: 4, padding: 16 }}>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{detail}</div>
    </div>
  );
}

function EquityCurve({ data }: { data: { date: string; sibt: number; buyHold: number }[] }) {
  if (data.length < 2) return null;
  const W = 800, H = 200, PAD = 8;
  const allValues = data.flatMap((d) => [d.sibt, d.buyHold]);
  const minVal = Math.min(...allValues) * 0.98;
  const maxVal = Math.max(...allValues) * 1.02;
  const range = maxVal - minVal || 1;
  const toX = (i: number) => PAD + ((W - PAD * 2) / (data.length - 1)) * i;
  const toY = (v: number) => H - PAD - ((v - minVal) / range) * (H - PAD * 2);
  const sibtPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(d.sibt)}`).join(" ");
  const bhPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(d.buyHold)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 250 }}>
      <line x1={PAD} y1={toY(100)} x2={W - PAD} y2={toY(100)} stroke="var(--border-dim)" strokeDasharray="4" />
      <text x={PAD + 2} y={toY(100) - 4} fontFamily="var(--font-mono)" fontSize={8} fill="var(--text-muted)">$100</text>
      <path d={bhPath} fill="none" stroke="#94a3b8" strokeWidth={1.5} opacity={0.6} />
      <path d={sibtPath} fill="none" stroke="#05AD98" strokeWidth={2} />
      {data.length > 0 && (
        <>
          <text x={W - PAD} y={toY(data[data.length - 1].sibt) - 6} fontFamily="var(--font-mono)" fontSize={9} fill="#05AD98" textAnchor="end">${data[data.length - 1].sibt.toFixed(0)}</text>
          <text x={W - PAD} y={toY(data[data.length - 1].buyHold) + 12} fontFamily="var(--font-mono)" fontSize={9} fill="#94a3b8" textAnchor="end">${data[data.length - 1].buyHold.toFixed(0)}</text>
        </>
      )}
    </svg>
  );
}
