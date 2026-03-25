/**
 * Insider & Congressional trading content — extracted from InsiderPage.
 * Used as a sub-tab within ResearchPage.
 */

import { InsiderActivityPanel } from "../../components/insider/InsiderActivityPanel";
import { InsiderMarketOverview } from "../../components/insider/InsiderMarketOverview";
import { CongressTradingPanel } from "../../components/congress/CongressTradingPanel";

export default function InsiderContent() {
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
        <h2
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Insider & Congressional Trading
        </h2>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--text-muted)",
            margin: "4px 0 0",
          }}
        >
          SEC Form 4 filings and STOCK Act disclosures. Track what corporate insiders and Congress are buying and selling.
        </p>
      </div>

      {/* Individual ticker search + Congress trades side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <InsiderActivityPanel />
        <CongressTradingPanel />
      </div>

      {/* Full-width market overview scan */}
      <InsiderMarketOverview />
    </div>
  );
}
