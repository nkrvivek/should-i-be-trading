import { TerminalShell } from "../components/layout/TerminalShell";

export function RiskDisclosurePage() {
  return (
    <TerminalShell cri={null}>
      <div style={{ maxWidth: 700, margin: "0 auto", fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 2 }}>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 24 }}>
          Risk Disclosure
        </h1>

        <Section title="1. Not a Registered Investment Adviser">
          SIBT ("Should I Be Trading?") is not a registered investment adviser, broker-dealer, or financial
          planner under the laws of any jurisdiction. The platform does not provide personalized investment
          advice, financial planning, or recommendations to buy, sell, or hold any security.
        </Section>

        <Section title="2. Not Investment Advice">
          All content, data, analysis, signals, verdicts, and outputs displayed by SIBT are for informational
          and educational purposes only. Nothing on this platform constitutes a recommendation, solicitation,
          or offer to buy or sell any security, derivative, or financial instrument. The "TRADE," "CAUTION,"
          and "NO TRADE" verdicts are analytical outputs based on quantitative models and do not constitute
          advice to execute or refrain from executing any trade.
        </Section>

        <Section title="3. Trading Risk">
          Trading in securities, options, futures, and other financial instruments involves substantial risk
          of loss and is not suitable for all investors. Options trading is especially risky. You may lose
          your entire investment. Before trading, you should carefully consider your financial situation,
          investment objectives, and risk tolerance. If you are uncertain, consult a qualified financial
          professional in your jurisdiction.
        </Section>

        <Section title="4. Past Performance">
          Past performance of any signal, indicator, strategy, backtest result, or analytical model does not
          guarantee or indicate future results. Historical data may not reflect current or future market
          conditions. Backtested results are hypothetical and subject to inherent limitations.
        </Section>

        <Section title="5. AI Analysis Limitations">
          SIBT uses artificial intelligence (Claude by Anthropic) to generate market briefings and analysis.
          AI-generated content may contain errors, hallucinations, or outdated information. AI models are
          not financial advisers and cannot account for your individual circumstances. AI outputs should
          not be the sole basis for any investment decision.
        </Section>

        <Section title="6. Data Accuracy">
          Market data displayed on SIBT is sourced from third-party providers including Interactive Brokers,
          Unusual Whales, FRED, Finnhub, and SEC EDGAR. This data may be delayed, incomplete, or inaccurate.
          SIBT makes no warranty regarding the accuracy, completeness, or timeliness of any data displayed.
          Always verify critical data with your broker before executing trades.
        </Section>

        <Section title="7. BYOK Liability">
          SIBT operates on a "Bring Your Own Key" (BYOK) model. You are solely responsible for the API
          keys and brokerage credentials you provide. You are responsible for any costs incurred through
          API usage, data fees, trading commissions, and losses resulting from trades executed through
          your brokerage account.
        </Section>

        <Section title="8. Insider and Congressional Trading Data">
          Insider trading data is sourced from SEC Form 4 filings and congressional trading data from
          STOCK Act disclosures. This data is public information. The display of insider or congressional
          trading activity does not constitute a recommendation to follow those trades. Insider and
          congressional traders may have different investment horizons, risk tolerances, and information
          than you.
        </Section>

        <Section title="9. Automated Trading">
          If you use automated trading features, you acknowledge that: (a) automated systems can execute
          trades faster than you can intervene; (b) software bugs, network failures, and market volatility
          can cause unexpected losses; (c) you are solely responsible for monitoring your automated
          strategies; (d) the kill switch should be tested before enabling live automation; (e) SIBT is
          not responsible for any orders placed by automated strategies you configure.
        </Section>

        <Section title="10. No Fiduciary Relationship">
          Your use of SIBT does not create a fiduciary relationship, advisory relationship, or any other
          special relationship between you and SIBT. SIBT has no duty to act in your best interest.
        </Section>

        <Section title="11. Jurisdiction">
          SIBT is available globally but may not be suitable for use in all jurisdictions. You are
          responsible for ensuring that your use of SIBT complies with all applicable laws and regulations
          in your jurisdiction. If securities trading or the use of analytical tools like SIBT is
          prohibited or restricted in your jurisdiction, do not use SIBT.
        </Section>

        <Section title="12. Consult a Professional">
          Before making any investment decision, consult a registered financial adviser, tax professional,
          or legal counsel in your jurisdiction. Do not rely solely on SIBT or any single source of
          information for your investment decisions.
        </Section>

        <div style={{
          marginTop: 32,
          padding: 16,
          background: "var(--bg-panel-raised)",
          border: "1px solid var(--border-dim)",
          borderRadius: 4,
          textAlign: "center",
        }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            By using SIBT, you acknowledge that you have read, understood, and agree to this Risk Disclosure.
          </p>
        </div>
      </div>
    </TerminalShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>
        {title}
      </h2>
      <p>{children}</p>
    </div>
  );
}
