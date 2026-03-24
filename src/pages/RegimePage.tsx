/**
 * Market Regime & Fragility Monitor — Full page view.
 * Free tier: pillar scores + signal values. Pro: full interpretations + AI analysis.
 */

import { TerminalShell } from "../components/layout/TerminalShell";
import { MarketStateCard } from "../components/regime/MarketStateCard";
import { PillarScoreCard } from "../components/regime/PillarScore";
import { SignalCard } from "../components/regime/SignalCard";
import { FSIGauge } from "../components/regime/FSIGauge";
import { useRegimeMonitor } from "../hooks/useRegimeMonitor";
import { useAuthStore } from "../stores/authStore";
import { hasFeature } from "../lib/featureGates";

export default function RegimePage() {
  const { regime, loading, error, refresh } = useRegimeMonitor();
  const effectiveTier = useAuthStore((s) => s.effectiveTier);
  const tier = effectiveTier();
  const isPro = hasFeature(tier, "regime_detail");

  return (
    <TerminalShell>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            US EQUITY MARKET &middot; SPX
          </div>
          <h1 style={{ fontFamily: "var(--font-sans)", fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: "4px 0" }}>
            Market Regime & Fragility Monitor
          </h1>
          <a
            href="/risk"
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--signal-core)", textDecoration: "underline" }}
          >
            Important Disclaimer
          </a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={refresh}
            disabled={loading}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              padding: "6px 12px",
              border: "1px solid var(--border-dim)",
              borderRadius: 4,
              background: "var(--bg-panel)",
              color: "var(--text-primary)",
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            &#8635; REFRESH
          </button>
          {regime && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
              {new Date(regime.timestamp).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Loading / Error */}
      {loading && !regime && (
        <div style={{ padding: 32, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
          Loading regime data from FRED + Finnhub...
        </div>
      )}

      {error && !regime && (
        <div
          style={{
            padding: 12,
            borderRadius: 4,
            border: "1px solid var(--fault)",
            background: "color-mix(in srgb, var(--fault) 8%, transparent)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fault)",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {regime && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Hero: Market State */}
          <MarketStateCard regime={regime} />

          {/* FSI Gauge */}
          <FSIGauge fsi={regime.fsi} />

          {/* Pillar Scores */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {regime.pillars.map((p) => (
              <PillarScoreCard key={p.name} pillar={p} />
            ))}
          </div>

          {/* Signal Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: 12,
            }}
          >
            {regime.signals.map((s) => (
              <SignalCard key={s.id} signal={s} showInterpretation={isPro} />
            ))}
          </div>

          {/* Pro upsell for non-pro users */}
          {!isPro && (
            <div
              style={{
                padding: 16,
                borderRadius: 4,
                border: "1px solid var(--signal-core)",
                background: "color-mix(in srgb, var(--signal-core) 5%, transparent)",
                textAlign: "center",
              }}
            >
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-primary)", marginBottom: 4 }}>
                Unlock detailed signal interpretations and AI regime analysis
              </div>
              <a
                href="/pricing"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--signal-core)",
                  textDecoration: "underline",
                }}
              >
                Upgrade to Pro
              </a>
            </div>
          )}

          {/* Disclaimer */}
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-muted)", textAlign: "center", padding: "8px 0" }}>
            Analytical tool only. Not investment advice. Data from FRED and Finnhub. Past performance does not indicate future results.
            Contact: hello@sibt.ai
          </div>
        </div>
      )}
    </TerminalShell>
  );
}
