/**
 * Technical Signal Overlays Panel
 *
 * Per-stock technical analysis with:
 * - Signal summary (bullish/bearish/neutral with score)
 * - Individual indicator signals (RSI, MACD, MAs, Bollinger, Stochastic, ATR)
 * - Support/Resistance levels
 * - Mini indicator charts (sparkline-style)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCandles, type Resolution } from "../../hooks/useCandles";
import {
  generateTechnicalSignals,
  detectSupportResistance,
  computeRSI,
  computeMACD,
  computeBollingerBands,
  computeStochastic,
  computeATR,
  type TechnicalSignal,
  type TechnicalAnalysis,
  type SRLevel,
  type OHLCV,
} from "../../lib/technicalIndicators";

/* ─── Main Panel ─────────────────────────────────────── */

export function TechnicalSignalPanel() {
  const { candles, loading, error, fetchCandles } = useCandles();
  const [symbol, setSymbol] = useState("");
  const [resolution, setResolution] = useState<Resolution>("D");
  const [activeSymbol, setActiveSymbol] = useState("");

  const handleSearch = useCallback(() => {
    const s = symbol.trim().toUpperCase();
    if (!s) return;
    setActiveSymbol(s);
    fetchCandles(s, resolution);
  }, [symbol, resolution, fetchCandles]);

  // Re-fetch when resolution changes (if we have a symbol)
  useEffect(() => {
    if (activeSymbol) fetchCandles(activeSymbol, resolution);
  }, [resolution]); // eslint-disable-line react-hooks/exhaustive-deps

  const analysis = useMemo(() => {
    if (candles.length < 30) return null;
    return generateTechnicalSignals(candles);
  }, [candles]);

  const srLevels = useMemo(() => {
    if (candles.length < 30) return [];
    return detectSupportResistance(candles);
  }, [candles]);

  const currentPrice = candles.length > 0 ? candles[candles.length - 1].c : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", background: "var(--bg-panel)", border: "1px solid var(--border-dim)", borderRadius: 4 }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          Technical Signal Overlays
        </h2>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
          Real-time technical indicator analysis with auto-detected support/resistance levels and signal scoring.
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Enter ticker..."
          style={{
            padding: "6px 10px", fontFamily: "var(--font-mono)", fontSize: 13,
            color: "var(--text-primary)", background: "var(--bg-base)",
            border: "1px solid var(--border-dim)", borderRadius: 4, outline: "none", width: 120,
          }}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !symbol.trim()}
          style={{
            padding: "6px 12px", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600,
            color: "#000", background: "var(--signal-core)", border: "none", borderRadius: 4,
            cursor: loading ? "default" : "pointer", opacity: loading || !symbol.trim() ? 0.5 : 1,
          }}
        >
          ANALYZE
        </button>

        {/* Resolution picker */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["D", "W", "60", "15"] as Resolution[]).map((r) => (
            <button
              key={r}
              onClick={() => setResolution(r)}
              style={{
                padding: "4px 10px", borderRadius: 999, fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
                color: resolution === r ? "#000" : "var(--text-muted)",
                background: resolution === r ? "var(--signal-core)" : "transparent",
                border: `1px solid ${resolution === r ? "var(--signal-core)" : "var(--border-dim)"}`,
                cursor: "pointer",
              }}
            >
              {r === "D" ? "DAILY" : r === "W" ? "WEEKLY" : r === "60" ? "1H" : "15M"}
            </button>
          ))}
        </div>

        {/* Quick tickers */}
        <div style={{ display: "flex", gap: 4 }}>
          {["SPY", "AAPL", "TSLA", "NVDA", "QQQ"].map((t) => (
            <button
              key={t}
              onClick={() => { setSymbol(t); setActiveSymbol(t); fetchCandles(t, resolution); }}
              style={{
                padding: "3px 8px", borderRadius: 999, fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
                color: "var(--text-muted)", background: "transparent", border: "1px solid var(--border-dim)", cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: "8px 12px", background: "rgba(232, 93, 108, 0.1)", border: "1px solid var(--negative)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--negative)" }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ padding: 32, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
          Analyzing {activeSymbol}...
        </div>
      )}

      {analysis && currentPrice !== null && !loading && (
        <>
          {/* Overall Score Card */}
          <OverallScoreCard analysis={analysis} symbol={activeSymbol} price={currentPrice} />

          {/* Signal Grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
          }}>
            {/* Signals List */}
            <div style={{
              background: "var(--bg-panel)", border: "1px solid var(--border-dim)", borderRadius: 6, overflow: "hidden",
            }}>
              <div style={{
                padding: "8px 12px", borderBottom: "1px solid var(--border-dim)",
                fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                Indicator Signals
              </div>
              <div style={{ maxHeight: 400, overflow: "auto" }}>
                {analysis.signals.map((sig, i) => (
                  <SignalRow key={i} signal={sig} />
                ))}
              </div>
            </div>

            {/* Support / Resistance */}
            <div style={{
              background: "var(--bg-panel)", border: "1px solid var(--border-dim)", borderRadius: 6, overflow: "hidden",
            }}>
              <div style={{
                padding: "8px 12px", borderBottom: "1px solid var(--border-dim)",
                fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                Support & Resistance
              </div>
              {srLevels.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                  Insufficient data for S/R detection
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {srLevels.map((level, i) => (
                    <SRRow key={i} level={level} currentPrice={currentPrice} />
                  ))}
                </div>
              )}

              {/* Mini Charts */}
              {candles.length > 30 && (
                <div style={{ borderTop: "1px solid var(--border-dim)", padding: 12 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase" }}>
                    Indicator Sparklines
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <MiniIndicatorChart candles={candles} type="rsi" label="RSI (14)" />
                    <MiniIndicatorChart candles={candles} type="macd" label="MACD" />
                    <MiniIndicatorChart candles={candles} type="stochastic" label="Stoch %K" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bollinger Band Position + ATR */}
          <BollingerATRBar candles={candles} currentPrice={currentPrice} />
        </>
      )}

      {!analysis && !loading && !error && (
        <div style={{ padding: 48, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
          Enter a ticker to see technical signal analysis with auto-detected support/resistance levels.
        </div>
      )}

      <div style={{ padding: "8px 12px", fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", borderTop: "1px solid var(--border-dim)" }}>
        Technical signals are computed from historical price data via Finnhub. Indicators are lagging by nature. Not investment advice.
      </div>
    </div>
  );
}

/* ─── Sub-Components ─────────────────────────────────── */

function OverallScoreCard({ analysis, symbol, price }: { analysis: TechnicalAnalysis; symbol: string; price: number }) {
  const color = analysis.overallSignal === "bullish" ? "var(--positive)" : analysis.overallSignal === "bearish" ? "var(--negative)" : "var(--warning)";
  const label = analysis.overallSignal.toUpperCase();
  const bullish = analysis.signals.filter((s) => s.signal === "bullish").length;
  const bearish = analysis.signals.filter((s) => s.signal === "bearish").length;
  const neutral = analysis.signals.filter((s) => s.signal === "neutral").length;

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center",
      padding: "16px 20px", background: "var(--bg-panel)", border: `1px solid ${color}`,
      borderRadius: 6, borderLeftWidth: 4,
    }}>
      {/* Score circle */}
      <div style={{
        width: 64, height: 64, borderRadius: "50%", border: `3px solid ${color}`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>
          {Math.abs(analysis.overallScore)}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", marginTop: 1 }}>
          {analysis.overallScore > 0 ? "BULL" : analysis.overallScore < 0 ? "BEAR" : "NEUT"}
        </div>
      </div>

      {/* Info */}
      <div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
          {symbol} <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>${price.toFixed(2)}</span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color, marginTop: 2 }}>
          {label}
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.4 }}>
          {analysis.summary}
        </div>
      </div>

      {/* Signal counts */}
      <div style={{ display: "flex", gap: 12 }}>
        <SignalCountBadge count={bullish} label="BULL" color="var(--positive)" />
        <SignalCountBadge count={neutral} label="NEUT" color="var(--warning)" />
        <SignalCountBadge count={bearish} label="BEAR" color="var(--negative)" />
      </div>
    </div>
  );
}

function SignalCountBadge({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color }}>
        {count}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.05em" }}>
        {label}
      </div>
    </div>
  );
}

function SignalRow({ signal }: { signal: TechnicalSignal }) {
  const color = signal.signal === "bullish" ? "var(--positive)" : signal.signal === "bearish" ? "var(--negative)" : "var(--text-muted)";
  const icon = signal.signal === "bullish" ? "\u25B2" : signal.signal === "bearish" ? "\u25BC" : "\u25C6";

  return (
    <div style={{
      display: "flex", gap: 10, alignItems: "center", padding: "8px 12px",
      borderBottom: "1px solid var(--border-dim)",
    }}>
      {/* Signal icon */}
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color, minWidth: 16, textAlign: "center" }}>
        {icon}
      </span>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
            {signal.indicator}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
            {signal.value}
          </span>
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.3 }}>
          {signal.description}
        </div>
      </div>

      {/* Strength bar */}
      <div style={{ width: 40, height: 4, background: "var(--border-dim)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          width: `${signal.strength}%`, height: "100%", background: color, borderRadius: 2,
        }} />
      </div>
    </div>
  );
}

function SRRow({ level, currentPrice }: { level: SRLevel; currentPrice: number }) {
  const distance = ((level.price - currentPrice) / currentPrice) * 100;
  const color = level.type === "support" ? "var(--positive)" : "var(--negative)";
  const strengthDots = "\u2588".repeat(level.strength) + "\u2591".repeat(5 - level.strength);

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "6px 12px", borderBottom: "1px solid var(--border-dim)",
    }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
          padding: "2px 6px", borderRadius: 999, color,
          background: level.type === "support" ? "rgba(5, 173, 152, 0.1)" : "rgba(232, 93, 108, 0.1)",
          border: `1px solid ${color}`,
        }}>
          {level.type === "support" ? "SUP" : "RES"}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          ${level.price.toFixed(2)}
        </span>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
          {distance > 0 ? "+" : ""}{distance.toFixed(1)}%
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "1px", color }}>
          {strengthDots}
        </span>
      </div>
    </div>
  );
}

/* ─── Mini Indicator Charts ──────────────────────────── */

function MiniIndicatorChart({ candles, type, label }: { candles: OHLCV[]; type: "rsi" | "macd" | "stochastic"; label: string }) {
  const closes = candles.map((c) => c.c);
  const n = 60; // Last 60 data points

  let values: number[] = [];
  let refLine: number | null = null;
  let refLine2: number | null = null;

  if (type === "rsi") {
    // Compute rolling RSI for last N periods
    for (let i = Math.max(15, closes.length - n); i <= closes.length; i++) {
      values.push(computeRSI(closes.slice(0, i), 14));
    }
    refLine = 70;
    refLine2 = 30;
  } else if (type === "macd") {
    const macd = computeMACD(closes);
    const hist = macd.histogram.filter((v): v is number => v !== null);
    values = hist.slice(-n);
  } else if (type === "stochastic") {
    const stoch = computeStochastic(candles);
    values = stoch.k.filter((v): v is number => v !== null).slice(-n);
    refLine = 80;
    refLine2 = 20;
  }

  if (values.length < 5) return null;

  const w = 200;
  const h = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });

  const lastVal = values[values.length - 1];
  const color = type === "macd"
    ? lastVal > 0 ? "var(--positive)" : "var(--negative)"
    : lastVal > 70 ? "var(--negative)" : lastVal < 30 ? "var(--positive)" : "var(--signal-core)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", minWidth: 60 }}>
        {label}
      </span>
      <svg width={w} height={h} style={{ overflow: "visible" }}>
        {/* Reference lines */}
        {refLine !== null && (
          <line
            x1={0} y1={h - ((refLine - min) / range) * h}
            x2={w} y2={h - ((refLine - min) / range) * h}
            stroke="var(--border-dim)" strokeDasharray="3,3" strokeWidth={0.5}
          />
        )}
        {refLine2 !== null && (
          <line
            x1={0} y1={h - ((refLine2 - min) / range) * h}
            x2={w} y2={h - ((refLine2 - min) / range) * h}
            stroke="var(--border-dim)" strokeDasharray="3,3" strokeWidth={0.5}
          />
        )}
        {/* Line */}
        <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth={1.5} />
      </svg>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color, minWidth: 40, textAlign: "right" }}>
        {lastVal.toFixed(type === "macd" ? 2 : 0)}
      </span>
    </div>
  );
}

/* ─── Bollinger / ATR Bar ────────────────────────────── */

function BollingerATRBar({ candles, currentPrice }: { candles: OHLCV[]; currentPrice: number }) {
  const closes = candles.map((c) => c.c);
  const bb = computeBollingerBands(closes, 20, 2);
  const atrArr = computeATR(candles, 14);

  const upper = bb.upper[bb.upper.length - 1];
  const lower = bb.lower[bb.lower.length - 1];
  const mid = bb.middle[bb.middle.length - 1];
  const bw = bb.bandwidth[bb.bandwidth.length - 1];
  const atr = atrArr.filter((v): v is number => v !== null);
  const lastATR = atr.length > 0 ? atr[atr.length - 1] : null;

  if (upper === null || lower === null || mid === null) return null;

  const bbPosition = ((currentPrice - lower) / (upper - lower)) * 100;

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
    }}>
      {/* Bollinger Band Position */}
      <div style={{
        padding: "12px 16px", background: "var(--bg-panel)", border: "1px solid var(--border-dim)", borderRadius: 6,
      }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
          Bollinger Band Position
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>
          <span>${lower.toFixed(2)}</span>
          <span>${mid.toFixed(2)}</span>
          <span>${upper.toFixed(2)}</span>
        </div>
        {/* Band bar */}
        <div style={{ position: "relative", height: 8, background: "var(--border-dim)", borderRadius: 4 }}>
          <div style={{
            position: "absolute", left: `${Math.max(0, Math.min(100, bbPosition))}%`,
            top: -2, width: 12, height: 12, borderRadius: "50%",
            background: bbPosition > 80 ? "var(--negative)" : bbPosition < 20 ? "var(--positive)" : "var(--signal-core)",
            transform: "translateX(-50%)", border: "2px solid var(--bg-panel)",
          }} />
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginTop: 6, textAlign: "center" }}>
          {bbPosition.toFixed(0)}% <span style={{ fontSize: 10, color: "var(--text-muted)" }}>BW: {bw?.toFixed(1)}%</span>
        </div>
      </div>

      {/* ATR */}
      {lastATR !== null && (
        <div style={{
          padding: "12px 16px", background: "var(--bg-panel)", border: "1px solid var(--border-dim)", borderRadius: 6,
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
            Average True Range (14)
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
            ${lastATR.toFixed(2)}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            {((lastATR / currentPrice) * 100).toFixed(2)}% of price
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Suggested stop: ${(currentPrice - 2 * lastATR).toFixed(2)} (2x ATR)
          </div>
        </div>
      )}
    </div>
  );
}

export default TechnicalSignalPanel;
