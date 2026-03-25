/**
 * Shared email template system for SIBT.
 *
 * Single source of truth for branding, layout, and styles.
 * Used by edge functions (welcome email) and the template sync script
 * (confirm signup, magic link, password reset).
 */

// ── Brand constants ──────────────────────────────────────────────
export const BRAND = {
  name: "SIBT",
  tagline: "Should I Be Trading?",
  domain: "https://sibt.ai",
  logo: "https://sibt.ai/logo-192.png",
  email: "hello@sibt.ai",
  colors: {
    bg: "#0a0f14",
    panel: "#0f1519",
    accent: "#05AD98",
    text: "#e2e8f0",
    muted: "#94a3b8",
    dim: "#64748b",
    border: "#1e293b",
    dark: "#475569",
  },
  fonts: {
    sans: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
    mono: "'IBM Plex Mono', 'SF Mono', monospace",
  },
} as const;

// ── Reusable HTML fragments ─────────────────────────────────────

/** Branded header with logo + SIBT text + tagline */
export function emailHeader(): string {
  return `
    <div style="text-align: center; margin-bottom: 32px;">
      <img src="${BRAND.logo}" alt="${BRAND.name}" width="48" height="48" style="display: block; margin: 0 auto 8px; border-radius: 8px;" />
      <div style="font-family: ${BRAND.fonts.mono}; font-size: 24px; font-weight: 700; color: ${BRAND.colors.accent}; letter-spacing: 2px;">${BRAND.name}</div>
      <div style="font-size: 12px; color: ${BRAND.colors.muted}; margin-top: 4px;">${BRAND.tagline}</div>
    </div>`;
}

/** CTA button */
export function emailButton(href: string, label: string): string {
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${href}" style="display: inline-block; padding: 12px 32px; background: ${BRAND.colors.accent}; color: ${BRAND.colors.bg}; font-family: ${BRAND.fonts.mono}; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 4px; letter-spacing: 0.5px;">
        ${label}
      </a>
    </div>`;
}

/** Footer with links */
export function emailFooter(includeYear = true): string {
  const year = includeYear ? new Date().getFullYear() : "{{ now | date \"2006\" }}";
  return `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid ${BRAND.colors.border}; font-size: 12px; color: ${BRAND.colors.dark}; text-align: center;">
      <p style="margin: 0 0 8px;">&copy; ${year} ${BRAND.tagline} &middot; <a href="${BRAND.domain}" style="color: ${BRAND.colors.accent}; text-decoration: none;">sibt.ai</a></p>
      <p style="margin: 0 0 8px;">
        <a href="${BRAND.domain}/terms" style="color: ${BRAND.colors.accent}; text-decoration: none;">Terms</a> &middot;
        <a href="${BRAND.domain}/privacy" style="color: ${BRAND.colors.accent}; text-decoration: none;">Privacy</a> &middot;
        <a href="${BRAND.domain}/risk" style="color: ${BRAND.colors.accent}; text-decoration: none;">Risk Disclosure</a>
      </p>
      <p style="margin: 0; font-size: 11px;">${BRAND.name} is an analytical tool. Not investment advice.</p>
    </div>`;
}

/** Wrap content in the standard email layout */
export function emailLayout(bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: ${BRAND.fonts.sans}; background: ${BRAND.colors.bg}; color: ${BRAND.colors.text}; margin: 0; padding: 0;">
  <div style="max-width: 520px; margin: 0 auto; padding: 32px 24px;">
    ${emailHeader()}
    ${bodyContent}
    ${emailFooter()}
  </div>
</body>
</html>`;
}

/** Small muted text block (for "ignore this email" disclaimers) */
export function emailDisclaimer(text: string): string {
  return `<p style="font-size: 11px; color: ${BRAND.colors.dim}; margin-top: 24px;">${text}</p>`;
}

// ── Auth templates (for Supabase Dashboard / Management API) ────

/**
 * These use Go template syntax: {{ .ConfirmationURL }}, {{ .Token }}, etc.
 * They are meant to be pushed to Supabase via the Management API.
 */
export const AUTH_TEMPLATES = {
  confirm: {
    subject: "Welcome to SIBT — Confirm your email",
    body: emailLayout(`
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">Confirm your email</h1>
      <p style="font-size: 15px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 16px;">
        Welcome to SIBT. Click below to confirm your email and start your <span style="color: ${BRAND.colors.accent}; font-weight: 600;">14-day Pro trial</span>.
      </p>
      ${emailButton("{{ .ConfirmationURL }}", "CONFIRM EMAIL")}
      ${emailDisclaimer("If you didn't sign up for SIBT, you can safely ignore this email.")}
    `),
  },

  magiclink: {
    subject: "SIBT — Your login link",
    body: emailLayout(`
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">Log in to SIBT</h1>
      <p style="font-size: 15px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 16px;">
        Click below to log in to your SIBT dashboard.
      </p>
      ${emailButton("{{ .ConfirmationURL }}", "LOG IN")}
      ${emailDisclaimer("This link expires in 24 hours. If you didn't request this, ignore this email.")}
    `),
  },

  recovery: {
    subject: "SIBT — Reset your password",
    body: emailLayout(`
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">Reset your password</h1>
      <p style="font-size: 15px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 16px;">
        Click below to reset your SIBT password.
      </p>
      ${emailButton("{{ .ConfirmationURL }}", "RESET PASSWORD")}
      ${emailDisclaimer("If you didn't request a password reset, ignore this email. Your password won't change.")}
    `),
  },

  invite: {
    subject: "You've been invited to SIBT",
    body: emailLayout(`
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">You're invited to SIBT</h1>
      <p style="font-size: 15px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 16px;">
        You've been invited to join SIBT — a Bloomberg Terminal-style market dashboard with AI analysis. Click below to accept and create your account.
      </p>
      ${emailButton("{{ .ConfirmationURL }}", "ACCEPT INVITE")}
      ${emailDisclaimer("If you weren't expecting this invitation, you can safely ignore this email.")}
    `),
  },

  email_change: {
    subject: "SIBT — Confirm email change",
    body: emailLayout(`
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">Confirm your new email</h1>
      <p style="font-size: 15px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 16px;">
        Click below to confirm changing your SIBT email address.
      </p>
      ${emailButton("{{ .ConfirmationURL }}", "CONFIRM EMAIL CHANGE")}
      ${emailDisclaimer("If you didn't request this change, contact us at ${BRAND.email}.")}
    `),
  },
} as const;
