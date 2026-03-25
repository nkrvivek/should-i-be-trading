#!/usr/bin/env -S npx tsx
/**
 * Sync SIBT email templates to Supabase Auth.
 *
 * Reads templates from supabase/functions/_shared/email.ts (single source of truth)
 * and pushes them to Supabase via the Management API.
 *
 * Usage:
 *   npx tsx scripts/sync-email-templates.ts
 *
 * Required env vars:
 *   SUPABASE_PROJECT_REF  — Project reference (e.g. "abcdefghijkl")
 *   SB_MGMT_TOKEN — Management API token from https://supabase.com/dashboard/account/tokens
 *
 * Or pass them as arguments:
 *   npx tsx scripts/sync-email-templates.ts --ref=abcdefghijkl --token=sbp_xxx
 *
 * What it does:
 *   1. Generates HTML from the shared email.ts template system
 *   2. PATCHes /v1/projects/{ref}/config/auth with the template subjects + bodies
 *   3. Reports success/failure for each template type
 */

// ── Parse args ───────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg?.split("=").slice(1).join("=");
}

// Credentials only needed for actual sync (not preview/dry-run)
const projectRef = getArg("ref") || process.env.SUPABASE_PROJECT_REF;
const accessToken = getArg("token") || process.env.SB_MGMT_TOKEN;

function requireCredentials() {
  if (!projectRef || !accessToken) {
    console.error("Missing required config.\n");
    console.error("Set env vars:");
    console.error("  SUPABASE_PROJECT_REF=your-project-ref");
    console.error("  SB_MGMT_TOKEN=sbp_xxx\n");
    console.error("Or pass as arguments:");
    console.error("  npx tsx scripts/sync-email-templates.ts --ref=xxx --token=sbp_xxx");
    process.exit(1);
  }
}

// ── Build templates using the shared email system ────────────────
// We import the template functions dynamically since they're Deno-style .ts
// Instead, we'll evaluate them inline to avoid Deno import issues

const BRAND = {
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
};

function emailHeader(): string {
  return `
    <div style="text-align: center; margin-bottom: 32px;">
      <img src="${BRAND.logo}" alt="${BRAND.name}" width="48" height="48" style="display: block; margin: 0 auto 8px; border-radius: 8px;" />
      <div style="font-family: ${BRAND.fonts.mono}; font-size: 24px; font-weight: 700; color: ${BRAND.colors.accent}; letter-spacing: 2px;">${BRAND.name}</div>
      <div style="font-size: 12px; color: ${BRAND.colors.muted}; margin-top: 4px;">${BRAND.tagline}</div>
    </div>`;
}

function emailButton(href: string, label: string): string {
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${href}" style="display: inline-block; padding: 12px 32px; background: ${BRAND.colors.accent}; color: ${BRAND.colors.bg}; font-family: ${BRAND.fonts.mono}; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 4px; letter-spacing: 0.5px;">
        ${label}
      </a>
    </div>`;
}

function emailFooter(): string {
  return `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid ${BRAND.colors.border}; font-size: 12px; color: ${BRAND.colors.dark}; text-align: center;">
      <p style="margin: 0 0 8px;">&copy; ${new Date().getFullYear()} ${BRAND.tagline} &middot; <a href="${BRAND.domain}" style="color: ${BRAND.colors.accent}; text-decoration: none;">sibt.ai</a></p>
      <p style="margin: 0 0 8px;">
        <a href="${BRAND.domain}/terms" style="color: ${BRAND.colors.accent}; text-decoration: none;">Terms</a> &middot;
        <a href="${BRAND.domain}/privacy" style="color: ${BRAND.colors.accent}; text-decoration: none;">Privacy</a> &middot;
        <a href="${BRAND.domain}/risk" style="color: ${BRAND.colors.accent}; text-decoration: none;">Risk Disclosure</a>
      </p>
      <p style="margin: 0; font-size: 11px;">${BRAND.name} is an analytical tool. Not investment advice.</p>
    </div>`;
}

function emailLayout(bodyContent: string): string {
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

function emailDisclaimer(text: string): string {
  return `<p style="font-size: 11px; color: ${BRAND.colors.dim}; margin-top: 24px;">${text}</p>`;
}

// ── Template definitions ─────────────────────────────────────────
// These match the Supabase auth config keys

interface TemplateConfig {
  subject: string;
  content: string; // Supabase calls the body "content" in the API
}

const templates: Record<string, TemplateConfig> = {
  // MAILER_TEMPLATES_CONFIRMATION
  confirm: {
    subject: "Welcome to SIBT — Confirm your email",
    content: emailLayout(`
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">Confirm your email</h1>
      <p style="font-size: 15px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 16px;">
        Welcome to SIBT. Click below to confirm your email and start your <span style="color: ${BRAND.colors.accent}; font-weight: 600;">14-day Pro trial</span>.
      </p>
      ${emailButton("{{ .ConfirmationURL }}", "CONFIRM EMAIL")}
      ${emailDisclaimer("If you didn't sign up for SIBT, you can safely ignore this email.")}
    `),
  },

  // MAILER_TEMPLATES_MAGIC_LINK
  magiclink: {
    subject: "SIBT — Your login link",
    content: emailLayout(`
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">Log in to SIBT</h1>
      <p style="font-size: 15px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 16px;">
        Click below to log in to your SIBT dashboard.
      </p>
      ${emailButton("{{ .ConfirmationURL }}", "LOG IN")}
      ${emailDisclaimer("This link expires in 24 hours. If you didn't request this, ignore this email.")}
    `),
  },

  // MAILER_TEMPLATES_RECOVERY
  recovery: {
    subject: "SIBT — Reset your password",
    content: emailLayout(`
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">Reset your password</h1>
      <p style="font-size: 15px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 16px;">
        Click below to reset your SIBT password.
      </p>
      ${emailButton("{{ .ConfirmationURL }}", "RESET PASSWORD")}
      ${emailDisclaimer("If you didn't request a password reset, ignore this email. Your password won't change.")}
    `),
  },

  // MAILER_TEMPLATES_INVITE
  invite: {
    subject: "You've been invited to SIBT",
    content: emailLayout(`
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">You're invited to SIBT</h1>
      <p style="font-size: 15px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 16px;">
        You've been invited to join SIBT — a Bloomberg Terminal-style market dashboard with AI analysis. Click below to accept and create your account.
      </p>
      ${emailButton("{{ .ConfirmationURL }}", "ACCEPT INVITE")}
      ${emailDisclaimer("If you weren't expecting this invitation, you can safely ignore this email.")}
    `),
  },

  // MAILER_TEMPLATES_EMAIL_CHANGE
  email_change: {
    subject: "SIBT — Confirm email change",
    content: emailLayout(`
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">Confirm your new email</h1>
      <p style="font-size: 15px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 16px;">
        Click below to confirm changing your SIBT email address.
      </p>
      ${emailButton("{{ .ConfirmationURL }}", "CONFIRM EMAIL CHANGE")}
      ${emailDisclaimer("If you didn't request this change, contact us at ${BRAND.email}.")}
    `),
  },
};

// ── Supabase Management API config key mapping ──────────────────
// See: https://supabase.com/docs/reference/api/v1#tag/config/patch/v1/projects/{ref}/config/auth
const TEMPLATE_KEY_MAP: Record<string, { subject: string; content: string }> = {
  confirm: {
    subject: "MAILER_TEMPLATES_CONFIRMATION_SUBJECT",
    content: "MAILER_TEMPLATES_CONFIRMATION_CONTENT",
  },
  magiclink: {
    subject: "MAILER_TEMPLATES_MAGIC_LINK_SUBJECT",
    content: "MAILER_TEMPLATES_MAGIC_LINK_CONTENT",
  },
  recovery: {
    subject: "MAILER_TEMPLATES_RECOVERY_SUBJECT",
    content: "MAILER_TEMPLATES_RECOVERY_CONTENT",
  },
  invite: {
    subject: "MAILER_TEMPLATES_INVITE_SUBJECT",
    content: "MAILER_TEMPLATES_INVITE_CONTENT",
  },
  email_change: {
    subject: "MAILER_TEMPLATES_EMAIL_CHANGE_SUBJECT",
    content: "MAILER_TEMPLATES_EMAIL_CHANGE_CONTENT",
  },
};

// ── Sync ─────────────────────────────────────────────────────────
async function syncTemplates() {
  console.log(`\nSyncing email templates to Supabase project: ${projectRef}\n`);

  // Build the config payload
  const configPayload: Record<string, string> = {};

  for (const [key, template] of Object.entries(templates)) {
    const mapping = TEMPLATE_KEY_MAP[key];
    if (!mapping) {
      console.warn(`  ⚠ No API key mapping for template: ${key}, skipping`);
      continue;
    }
    configPayload[mapping.subject] = template.subject;
    configPayload[mapping.content] = template.content;
    console.log(`  Prepared: ${key} (${template.subject})`);
  }

  console.log(`\nPushing ${Object.keys(configPayload).length / 2} templates...`);

  const url = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(configPayload),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`\nFailed to sync templates (HTTP ${res.status}):`);
    console.error(body);
    process.exit(1);
  }

  console.log("\nAll templates synced successfully!");
  console.log("Verify at: https://supabase.com/dashboard/project/" + projectRef + "/auth/templates");
}

// ── Preview mode ─────────────────────────────────────────────────
if (args.includes("--preview")) {
  console.log("Preview mode — printing generated HTML for each template:\n");
  for (const [key, template] of Object.entries(templates)) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Template: ${key}`);
    console.log(`Subject: ${template.subject}`);
    console.log("=".repeat(60));
    console.log(template.content);
  }
  process.exit(0);
}

// ── Dry run mode ─────────────────────────────────────────────────
if (args.includes("--dry-run")) {
  console.log("Dry run — templates that would be synced:\n");
  for (const [key, template] of Object.entries(templates)) {
    const mapping = TEMPLATE_KEY_MAP[key];
    console.log(`  ${key}:`);
    console.log(`    Subject: ${template.subject}`);
    console.log(`    API keys: ${mapping?.subject}, ${mapping?.content}`);
    console.log(`    HTML length: ${template.content.length} chars`);
  }
  console.log("\nRun without --dry-run to push to Supabase.");
  process.exit(0);
}

requireCredentials();
syncTemplates().catch(console.error);
