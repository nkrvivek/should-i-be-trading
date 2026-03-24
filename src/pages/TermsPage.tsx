import { TerminalShell } from "../components/layout/TerminalShell";

export function TermsPage() {
  return (
    <TerminalShell cri={null}>
      <div style={{ maxWidth: 700, margin: "0 auto", fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 2 }}>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 24 }}>
          Terms of Service
        </h1>

        <Section title="1. Acceptance of Terms">
          By accessing or using SIBT ("Should I Be Trading?"), you agree to be bound by these Terms of Service.
          If you do not agree, do not use the platform.
        </Section>

        <Section title="2. Description of Service">
          SIBT is a self-service analytical platform that provides market data visualization, regime analysis,
          portfolio tracking, and AI-assisted research tools. Users provide their own brokerage credentials
          and API keys to activate features.
        </Section>

        <Section title="3. Not Investment Advice">
          SIBT does not provide investment advice, recommendations, or financial planning services. The platform
          provides tools and data for informational purposes only. All trading and investment decisions are made
          solely by the user. SIBT is not a registered investment adviser, broker-dealer, or financial planner
          under any jurisdiction.
        </Section>

        <Section title="4. User Responsibilities">
          You are solely responsible for: (a) your investment and trading decisions; (b) the security of your
          API keys and brokerage credentials; (c) compliance with applicable laws and regulations; (d) any
          losses incurred through the use of the platform.
        </Section>

        <Section title="5. API Keys and Credentials">
          You provide your own API keys and brokerage credentials to access third-party services through SIBT.
          Your credentials are encrypted and stored securely. SIBT does not have access to your brokerage
          accounts beyond the permissions you explicitly grant.
        </Section>

        <Section title="6. Risk Disclosure">
          Trading in securities, options, and derivatives involves substantial risk of loss. Options trading
          is especially risky and is not suitable for all investors. Past performance of any signal, indicator,
          strategy, or backtested result does not guarantee future results.
        </Section>

        <Section title="7. No Warranty">
          SIBT is provided "as is" without warranty of any kind. We do not guarantee the accuracy, completeness,
          or timeliness of any data displayed. Market data is sourced from third-party providers and may be
          delayed or inaccurate.
        </Section>

        <Section title="8. Limitation of Liability">
          In no event shall SIBT be liable for any direct, indirect, incidental, special, consequential, or
          punitive damages arising from your use of the platform, including but not limited to trading losses.
        </Section>

        <Section title="9. Automated Trading">
          If you use automated trading features, you acknowledge that: (a) you have configured all rules and
          parameters yourself; (b) you are responsible for monitoring automated strategies; (c) the kill switch
          is available at all times; (d) SIBT is not responsible for any orders placed by automated strategies.
        </Section>

        <Section title="10. Subscription Billing">
          Paid plans (Pro, Enterprise) are billed on a recurring basis (monthly or annually) through Stripe.
          Your subscription will automatically renew at the end of each billing period unless you cancel before
          the renewal date. You can cancel anytime from the Settings page or through the Stripe Customer Portal.
          Cancellation takes effect at the end of the current billing period. No partial refunds for unused time.
        </Section>

        <Section title="11. Free Trial">
          New accounts receive a 14-day Pro trial with no credit card required. You have full access to
          Pro features during the trial period. When the trial expires, your account reverts to the Free
          tier. To continue using Pro features, you must subscribe through the pricing page. No automatic
          charges will occur.
        </Section>

        <Section title="12. Price Changes">
          We reserve the right to change subscription prices. Existing subscribers will be notified at least
          30 days before any price increase takes effect. Price changes apply to the next billing cycle after
          the notification period.
        </Section>

        <Section title="13. Refund Policy">
          Due to the digital nature of the service and immediate access to premium features, we do not offer
          refunds for subscription payments. The 14-day free trial serves as your evaluation period.
          If you experience technical issues preventing access, contact us at hello@sibt.ai.
        </Section>

        <Section title="14. Changes to Terms">
          We reserve the right to modify these terms at any time. Continued use of the platform constitutes
          acceptance of modified terms.
        </Section>
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
