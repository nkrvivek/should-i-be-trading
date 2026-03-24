import { TerminalShell } from "../components/layout/TerminalShell";

export function PrivacyPage() {
  return (
    <TerminalShell cri={null}>
      <div style={{ maxWidth: 700, margin: "0 auto", fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 2 }}>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 24 }}>
          Privacy Policy
        </h1>

        <Section title="1. Data We Collect">
          We collect: (a) email address and display name for authentication; (b) API keys you provide for
          third-party integrations (stored encrypted); (c) watchlists, alert rules, and preferences you create;
          (d) usage analytics (page views, feature usage).
        </Section>

        <Section title="2. How We Use Your Data">
          Your data is used solely to provide SIBT's functionality. We do not sell, share, or distribute your
          personal information to third parties. API keys are used only to proxy requests to the respective
          services on your behalf.
        </Section>

        <Section title="3. Data Security">
          API keys and credentials are encrypted using AES-256-GCM before storage. All data is transmitted
          over HTTPS. We use Supabase Row Level Security to ensure users can only access their own data.
        </Section>

        <Section title="4. Third-Party Services">
          When you provide API keys, SIBT makes requests to third-party services (Interactive Brokers,
          Unusual Whales, Anthropic, Exa, etc.) on your behalf. These services have their own privacy
          policies. Your data is sent directly to these services using your own credentials.
        </Section>

        <Section title="5. Data Retention">
          Your data is retained as long as your account is active. You may delete your account and all
          associated data at any time through the Settings page. API keys are immediately purged upon deletion.
        </Section>

        <Section title="6. Your Rights">
          You have the right to: (a) access your personal data; (b) correct inaccurate data;
          (c) delete your account and data; (d) export your data; (e) revoke API key access at any time.
        </Section>

        <Section title="7. Payment Data">
          Payments are processed by Stripe. We do not store your credit card number or payment details.
          Stripe processes and stores your payment information in accordance with their privacy policy
          and PCI DSS compliance. We store only subscription metadata (plan type, billing interval,
          subscription status, renewal dates) to manage feature access.
        </Section>

        <Section title="8. Cookies and Local Storage">
          We use browser local storage for: (a) authentication tokens (Supabase); (b) theme preferences;
          (c) connection configuration (API URLs). We use Stripe.js cookies for payment processing.
          We do not use tracking cookies or third-party analytics.
        </Section>

        <Section title="9. Contact">
          For privacy inquiries, contact us at hello@sibt.ai.
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
