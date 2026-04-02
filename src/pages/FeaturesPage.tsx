import { useNavigate } from "react-router-dom";
import { TerminalShell } from "../components/layout/TerminalShell";
import { FEATURES, TIER_COLORS } from "../content/features";

export function FeaturesPage() {
  const navigate = useNavigate();

  return (
    <TerminalShell cri={null}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
            Features
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto" }}>
            Institutional-grade trading intelligence for retail traders. From free market signals to technical overlays, AI analysis, and automated execution.
          </div>
        </div>

        {FEATURES.map((feature, i) => (
          <div
            key={i}
            style={{
              marginBottom: 32,
              padding: 24,
              background: "var(--bg-panel)",
              border: "1px solid var(--border-dim)",
              borderRadius: 4,
              display: "grid",
              gridTemplateColumns: i % 2 === 0 ? "1fr 1fr" : "1fr 1fr",
              gap: 24,
            }}
          >
            <div style={{ order: i % 2 === 0 ? 0 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                  {feature.title}
                </span>
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: `${TIER_COLORS[feature.tier]}22`,
                  color: TIER_COLORS[feature.tier],
                  fontWeight: 600,
                }}>
                  {feature.tier}
                </span>
              </div>

              <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 16px" }}>
                {feature.description}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {feature.details.map((d, j) => (
                  <div key={j} style={{ display: "flex", gap: 8, fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)" }}>
                    <span style={{ color: TIER_COLORS[feature.tier], flexShrink: 0 }}>{"\u2713"}</span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ order: i % 2 === 0 ? 1 : 0 }}>
              <pre style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.5,
                color: "var(--text-secondary)",
                background: "var(--bg-panel-raised)",
                border: "1px solid var(--border-dim)",
                borderRadius: 4,
                padding: 16,
                margin: 0,
                overflow: "auto",
                whiteSpace: "pre",
              }}>
                {feature.mockup}
              </pre>
            </div>
          </div>
        ))}

        {/* CTA */}
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/learn")}
              style={{
                padding: "12px 28px",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                fontWeight: 600,
                background: "transparent",
                color: "var(--signal-core)",
                border: "1px solid var(--signal-core)",
                borderRadius: 4,
                cursor: "pointer",
                letterSpacing: "0.03em",
              }}
            >
              EXPLORE FREE LEARNING
            </button>
          <button
            onClick={() => navigate("/pricing")}
            style={{
              padding: "12px 28px",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 600,
              background: "var(--signal-core)",
              color: "var(--bg-base)",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              letterSpacing: "0.03em",
            }}
          >
            START 14-DAY FREE TRIAL
          </button>
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
            Free plan forever. New accounts also get a 14-day Pro trial with no card required.
          </p>
        </div>
      </div>
    </TerminalShell>
  );
}
