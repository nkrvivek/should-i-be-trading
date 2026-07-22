import { useNavigate } from "react-router-dom";
import { TerminalShell } from "../components/layout/TerminalShell";
import { usePaperAccount } from "../hooks/usePaperAccount";
import { useAuthStore } from "../stores/authStore";
import { fmtUsdExact, fmtSignedUsd } from "../lib/format";
import {
  paperAccountValue,
  capMeterLabel,
  capMeterFraction,
  FREE_PAPER_TICKER_ALLOWLIST,
} from "../lib/paperUi";

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function PaperPage() {
  const navigate = useNavigate();
  const { effectiveTier } = useAuthStore();
  const { account, positions, fills, loading, provisioned, provisioning, error, provision } = usePaperAccount();
  const isFreeTier = effectiveTier() === "free";

  return (
    <TerminalShell cri={null}>
      <div style={{ maxWidth: 720, margin: "0 auto", width: "100%", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="heading-tight" style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
          Paper Trading
        </div>

        {error && (
          <div style={{ padding: 12, borderRadius: "var(--radius-sm)", background: "rgba(232, 93, 108, 0.1)", border: "1px solid var(--negative)", fontSize: 13, color: "var(--negative)" }}>
            {error}
          </div>
        )}

        {loading && !account && (
          <div className="skeleton-pulse" style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Loading paper account…
          </div>
        )}

        {!loading && !provisioned && (
          <div className="card" style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>
              Train on the real flow. No real money.
            </div>
            <p style={{ margin: 0, maxWidth: 440, fontSize: 14, lineHeight: 1.5, color: "var(--text-secondary)" }}>
              Every proposal, gate check, and council vote works the same way. Fills are simulated
              against live prices, so you can trust the flow before you trust it with cash.
            </p>
            <button
              className="btn btn-sm"
              disabled={provisioning}
              onClick={() => void provision()}
              style={{ marginTop: 8, background: "var(--accent-bg)", color: "var(--accent-text)", height: 40, padding: "0 20px", fontSize: 14 }}
            >
              {provisioning ? "Starting…" : "Start paper trading with $100K"}
            </button>
          </div>
        )}

        {account && (
          <>
            {/* Hero: account value */}
            <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Account value
              </span>
              <span className="num-tabular" style={{ fontFamily: "var(--font-mono)", fontSize: 40, fontWeight: 700, color: "var(--text-primary)" }}>
                {fmtUsdExact(paperAccountValue(account.cash_usd, positions.map((p) => ({ qty: p.qty, price: p.avg_price }))))}
              </span>
              <span className="num-tabular" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)" }}>
                {fmtSignedUsd(
                  paperAccountValue(account.cash_usd, positions.map((p) => ({ qty: p.qty, price: p.avg_price }))) -
                    account.starting_cash_usd,
                )}{" "}
                since {fmtUsdExact(account.starting_cash_usd)} start · {fmtUsdExact(account.cash_usd)} cash
              </span>
            </div>

            {/* Free-tier cap meter */}
            {isFreeTier && (
              <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>
                    {capMeterLabel(fills.filter((f) => isToday(f.filled_at)).length)}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ height: 24, padding: "0 8px", fontSize: 11 }}
                    onClick={() => navigate("/pricing")}
                  >
                    Upgrade for unlimited + live
                  </button>
                </div>
                <div style={{ height: 4, borderRadius: 999, background: "var(--bg-panel-raised)", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${capMeterFraction(fills.filter((f) => isToday(f.filled_at)).length) * 100}%`,
                      background: "var(--accent-bg)",
                    }}
                  />
                </div>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)" }}>
                  Free tier trades {FREE_PAPER_TICKER_ALLOWLIST.length} tickers: {FREE_PAPER_TICKER_ALLOWLIST.slice(0, 8).join(", ")}, and others.
                </span>
              </div>
            )}

            {/* Positions */}
            <div className="list-section">
              <div className="list-section-header">Positions</div>
              {positions.length === 0 && (
                <div style={{ padding: "14px 4px", fontSize: 13, color: "var(--text-muted)" }}>
                  No open positions yet. Approve a paper proposal to open one.
                </div>
              )}
              {positions.map((p) => (
                <div key={p.symbol} className="list-row">
                  <div className="list-row-main">
                    <span className="list-row-label">{p.symbol}</span>
                    <span className="list-row-sublabel">{p.qty} sh @ {fmtUsdExact(p.avg_price)}</span>
                  </div>
                  <div className="list-row-value">
                    <span className="num-tabular list-row-number">{fmtUsdExact(p.qty * p.avg_price)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent fills */}
            <div className="list-section">
              <div className="list-section-header">Recent fills</div>
              {fills.length === 0 && (
                <div style={{ padding: "14px 4px", fontSize: 13, color: "var(--text-muted)" }}>
                  No fills yet.
                </div>
              )}
              {fills.map((f, i) => (
                <div key={`${f.symbol}-${f.filled_at}-${i}`} className="list-row">
                  <div className="list-row-main">
                    <span className="list-row-label">{f.symbol}</span>
                    <span className="list-row-sublabel">{f.side.toUpperCase()} {f.qty} @ {fmtUsdExact(f.price)}</span>
                  </div>
                  <div className="list-row-value">
                    <span className="list-row-sublabel">{new Date(f.filled_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </TerminalShell>
  );
}
