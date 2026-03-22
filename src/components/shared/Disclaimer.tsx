type Props = {
  compact?: boolean;
};

export function Disclaimer({ compact = false }: Props) {
  if (compact) {
    return (
      <div style={{
        fontFamily: "var(--font-sans)",
        fontSize: 9,
        color: "var(--text-muted)",
        textAlign: "center",
        padding: "4px 16px",
      }}>
        SIBT is an analytical tool. Not investment advice. All trading decisions are your own responsibility.
      </div>
    );
  }

  return (
    <div style={{
      padding: 16,
      background: "var(--bg-panel-raised)",
      border: "1px solid var(--border-dim)",
      borderRadius: 4,
      fontFamily: "var(--font-sans)",
      fontSize: 11,
      color: "var(--text-secondary)",
      lineHeight: 1.8,
    }}>
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: "var(--text-primary)" }}>
        Important Disclaimer
      </div>
      <p>
        SIBT ("Should I Be Trading?") is an analytical tool that provides market data
        visualization, regime analysis, and portfolio tracking capabilities. It does <strong>not</strong> provide
        investment advice, recommendations, or financial planning services.
      </p>
      <p style={{ marginTop: 8 }}>
        All trading and investment decisions are made solely by the user. SIBT is not a registered
        investment adviser, broker-dealer, or financial planner. Past performance of any signal,
        indicator, or strategy does not guarantee future results.
      </p>
      <p style={{ marginTop: 8 }}>
        Trading in securities and derivatives involves substantial risk of loss and is not suitable
        for every investor. You should carefully consider whether trading is suitable for you in
        light of your financial condition. Never trade with money you cannot afford to lose.
      </p>
      <p style={{ marginTop: 8, fontStyle: "italic", color: "var(--text-muted)" }}>
        By using SIBT, you acknowledge that all investment decisions are your own and that you
        assume full responsibility for any losses incurred.
      </p>
    </div>
  );
}
