/**
 * Options chain loader — fetches live options data from Tradier
 * and lets users pick contracts to populate simulator legs.
 *
 * Shows expirations dropdown → chain table with bid/ask/IV/OI → click to add.
 */

import { useCallback, useEffect, useState } from "react";
import {
  getExpirations,
  getOptionsChain,
  getQuote,
  midPrice,
  type TradierOption,
} from "../../api/tradierClient";
import { isSupabaseConfigured } from "../../lib/supabase";
import type { SimulatorLeg } from "../../lib/strategy/payoff";

interface Props {
  ticker: string;
  onPriceUpdate: (price: number) => void;
  onAddLeg: (leg: SimulatorLeg, iv: number) => void;
}

export function OptionsChainLoader({ ticker, onPriceUpdate, onAddLeg }: Props) {
  const [expirations, setExpirations] = useState<string[]>([]);
  const [selectedExp, setSelectedExp] = useState("");
  const [chain, setChain] = useState<TradierOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalls, setShowCalls] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(0);

  const configured = isSupabaseConfigured();

  // Fetch expirations + quote when ticker changes
  const fetchExpirations = useCallback(async () => {
    if (!ticker || !configured) return;
    setLoading(true);
    setError(null);
    try {
      const [exps, quote] = await Promise.all([
        getExpirations(ticker),
        getQuote(ticker),
      ]);
      setExpirations(exps);
      if (exps.length > 0) setSelectedExp(exps[0]);
      if (quote) {
        setCurrentPrice(quote.last);
        onPriceUpdate(quote.last);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [ticker, configured, onPriceUpdate]);

  // Fetch chain when expiration changes
  useEffect(() => {
    if (!selectedExp || !ticker || !configured) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const opts = await getOptionsChain(ticker, selectedExp);
        if (!cancelled) setChain(opts);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to fetch chain");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [selectedExp, ticker, configured]);

  const filteredChain = chain
    .filter((o) => o.option_type === (showCalls ? "call" : "put"))
    .sort((a, b) => a.strike - b.strike);

  const handleAddContract = (opt: TradierOption, action: "buy" | "sell") => {
    const leg: SimulatorLeg = {
      action,
      type: opt.option_type,
      qty: 1,
      strike: opt.strike,
      premium: Math.round(midPrice(opt) * 100) / 100,
    };
    const iv = opt.greeks?.mid_iv ?? 0.30;
    onAddLeg(leg, iv);
  };

  if (!configured) {
    return (
      <div style={{ padding: 12, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
        Configure Supabase to load live options data.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          background: "var(--bg-panel-raised)",
          borderBottom: "1px solid var(--border-dim)",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={headerLabel}>Live Options Chain</span>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={fetchExpirations}
            disabled={loading || !ticker}
            style={{
              padding: "4px 10px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              color: loading ? "var(--text-muted)" : "#000",
              background: loading ? "var(--border-dim)" : "var(--signal-core)",
              border: "none",
              borderRadius: 4,
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "LOADING..." : expirations.length > 0 ? "REFRESH" : "FETCH CHAIN"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "6px 12px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--negative)", background: "rgba(232,93,108,0.08)" }}>
          {error}
        </div>
      )}

      {expirations.length > 0 && (
        <>
          {/* Controls row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 12px",
              borderBottom: "1px solid var(--border-dim)",
              flexWrap: "wrap",
            }}
          >
            {/* Expiration picker */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>EXP:</span>
              <select
                value={selectedExp}
                onChange={(e) => setSelectedExp(e.target.value)}
                style={{
                  padding: "4px 8px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  background: "var(--bg-panel-raised)",
                  border: "1px solid var(--border-dim)",
                  borderRadius: 4,
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                {expirations.map((exp) => {
                  const d = new Date(exp + "T12:00:00");
                  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
                  return (
                    <option key={exp} value={exp}>
                      {exp} ({days}d)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Call/Put toggle */}
            <div style={{ display: "flex", gap: 0, borderRadius: 4, overflow: "hidden", border: "1px solid var(--border-dim)" }}>
              <ToggleBtn active={showCalls} onClick={() => setShowCalls(true)} label="CALLS" color="var(--positive)" />
              <ToggleBtn active={!showCalls} onClick={() => setShowCalls(false)} label="PUTS" color="var(--negative)" />
            </div>

            {/* Current price badge */}
            {currentPrice > 0 && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                {ticker} ${currentPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Chain Table */}
          <div style={{ maxHeight: 300, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-dim)", position: "sticky", top: 0, background: "var(--bg-panel)" }}>
                  <Th>Strike</Th>
                  <Th align="right">Bid</Th>
                  <Th align="right">Ask</Th>
                  <Th align="right">Mid</Th>
                  <Th align="right">IV</Th>
                  <Th align="right">Delta</Th>
                  <Th align="right">OI</Th>
                  <Th align="right">Vol</Th>
                  <Th align="center">Action</Th>
                </tr>
              </thead>
              <tbody>
                {filteredChain.map((opt) => {
                  const isATM = currentPrice > 0 && Math.abs(opt.strike - currentPrice) < currentPrice * 0.01;
                  const itm = showCalls
                    ? opt.strike < currentPrice
                    : opt.strike > currentPrice;

                  return (
                    <tr
                      key={opt.symbol}
                      style={{
                        borderBottom: "1px solid var(--border-dim)",
                        height: 28,
                        background: isATM ? "rgba(5, 173, 152, 0.06)" : itm ? "rgba(255,255,255,0.02)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "0 8px", fontWeight: isATM ? 700 : 600, color: isATM ? "var(--signal-core)" : "var(--text-primary)" }}>
                        ${opt.strike.toFixed(opt.strike % 1 === 0 ? 0 : 2)}
                        {isATM && <span style={{ fontSize: 9, marginLeft: 4, color: "var(--signal-core)" }}>ATM</span>}
                      </td>
                      <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>{opt.bid.toFixed(2)}</td>
                      <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-secondary)" }}>{opt.ask.toFixed(2)}</td>
                      <td style={{ padding: "0 8px", textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>{midPrice(opt).toFixed(2)}</td>
                      <td style={{ padding: "0 8px", textAlign: "right", color: ivColor(opt.greeks?.mid_iv) }}>
                        {opt.greeks?.mid_iv ? `${(opt.greeks.mid_iv * 100).toFixed(1)}%` : "—"}
                      </td>
                      <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-muted)" }}>
                        {opt.greeks?.delta?.toFixed(3) ?? "—"}
                      </td>
                      <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-muted)" }}>
                        {opt.open_interest?.toLocaleString() ?? "—"}
                      </td>
                      <td style={{ padding: "0 8px", textAlign: "right", color: "var(--text-muted)" }}>
                        {opt.volume?.toLocaleString() ?? "—"}
                      </td>
                      <td style={{ padding: "0 4px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                          <ActionBtn label="BUY" color="var(--positive)" onClick={() => handleAddContract(opt, "buy")} />
                          <ActionBtn label="SELL" color="var(--negative)" onClick={() => handleAddContract(opt, "sell")} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredChain.length === 0 && !loading && (
                  <tr>
                    <td colSpan={9} style={{ padding: 16, textAlign: "center", color: "var(--text-muted)" }}>
                      No options available for this expiration.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {expirations.length === 0 && !loading && !error && (
        <div style={{ padding: 16, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
          Enter a ticker above and click "FETCH CHAIN" to load live options data.
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────── */

const headerLabel: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) {
  return (
    <th style={{ padding: "4px 8px", textAlign: align, fontWeight: 500, fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {children}
    </th>
  );
}

function ToggleBtn({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "3px 12px",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 600,
        color: active ? "#000" : "var(--text-muted)",
        background: active ? color : "var(--bg-panel-raised)",
        border: "none",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function ActionBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "1px 6px",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 700,
        color,
        background: "transparent",
        border: `1px solid ${color}`,
        borderRadius: 3,
        cursor: "pointer",
        opacity: 0.8,
      }}
    >
      {label}
    </button>
  );
}

function ivColor(iv: number | undefined): string {
  if (iv == null) return "var(--text-muted)";
  if (iv > 0.6) return "var(--negative)";
  if (iv > 0.4) return "var(--warning)";
  return "var(--text-secondary)";
}
