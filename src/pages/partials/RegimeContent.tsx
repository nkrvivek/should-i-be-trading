/**
 * Market Regime & Fragility content — extracted from RegimePage.
 * Used as a sub-tab within SignalsPage.
 */

import { MarketStateCard } from "../../components/regime/MarketStateCard";
import { PillarScoreCard } from "../../components/regime/PillarScore";
import { SignalCard } from "../../components/regime/SignalCard";
import { FSIGauge } from "../../components/regime/FSIGauge";
import VCGPanel from "../../components/regime/VCGPanel";
import CTAPanel from "../../components/regime/CTAPanel";
import { useRegimeMonitor } from "../../hooks/useRegimeMonitor";
import { useAuthStore } from "../../stores/authStore";
import { hasFeature } from "../../lib/featureGates";

export default function RegimeContent() {
  const { regime, loading, error, refresh } = useRegimeMonitor();
  const effectiveTier = useAuthStore((s) => s.effectiveTier);
  const tier = effectiveTier();
  const isPro = hasFeature(tier, "regime_detail");

  return (
    <div>
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
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            US EQUITY MARKET &middot; SPX
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 600, color: "var(--text-primary)", margin: "4px 0" }}>
            Market Regime & Fragility Monitor
          </div>
          <a href="/risk" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--signal-core)", textDecoration: "underline" }}>
            Important Disclaimer
          </a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={refresh}
            disabled={loading}
            style={{
              fontFamily: "var(--font-mono)", fontSize: 13, padding: "6px 12px",
              border: "1px solid var(--border-dim)", borderRadius: 4,
              background: "var(--bg-panel)", color: "var(--text-primary)",
              cursor: loading ? "default" : "pointer", opacity: loading ? 0.5 : 1,
            }}
          >
            &#8635; REFRESH
          </button>
          {regime && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
              {new Date(regime.timestamp).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {loading && !regime && (
        <div style={{ padding: 32, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-muted)" }}>
          Loading regime data from FRED + Finnhub...
        </div>
      )}

      {error && !regime && (
        <div style={{ padding: 12, borderRadius: 4, border: "1px solid var(--fault)", background: "color-mix(in srgb, var(--fault) 8%, transparent)", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fault)", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {regime && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MarketStateCard regime={regime} />
          <FSIGauge fsi={regime.fsi} />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {regime.pillars.map((p) => (
              <PillarScoreCard key={p.name} pillar={p} />
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
            {regime.signals.map((s) => (
              <SignalCard key={s.id} signal={s} showInterpretation={isPro} />
            ))}
          </div>
          {isPro && <VCGPanel />}
          {isPro && <CTAPanel />}
          {!isPro && (
            <div style={{ padding: 16, borderRadius: 4, border: "1px solid var(--signal-core)", background: "color-mix(in srgb, var(--signal-core) 5%, transparent)", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-primary)", marginBottom: 4 }}>
                Unlock detailed signal interpretations and AI regime analysis
              </div>
              <a href="/pricing" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--signal-core)", textDecoration: "underline" }}>
                Upgrade to Pro
              </a>
            </div>
          )}
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "8px 0" }}>
            Analytical tool only. Not investment advice. Data from FRED and Finnhub.
          </div>
        </div>
      )}
    </div>
  );
}
