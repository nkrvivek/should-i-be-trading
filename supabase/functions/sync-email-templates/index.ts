import { getCorsHeaders } from "../_shared/auth.ts";
import {
  BRAND,
  emailLayout,
  emailButton,
  emailDisclaimer,
} from "../_shared/email.ts";

/**
 * Edge function to sync all auth email templates to Supabase.
 *
 * Reads SB_MGMT_TOKEN from secrets and derives the project ref
 * from SUPABASE_URL, so no manual config is needed.
 *
 * Usage:
 *   curl -X POST https://<ref>.supabase.co/functions/v1/sync-email-templates \
 *     -H "Authorization: Bearer <service_role_key>"
 *
 * Or via supabase CLI:
 *   supabase functions invoke sync-email-templates
 *
 * Requires secret:
 *   SB_MGMT_TOKEN — Management API token from
 *     https://supabase.com/dashboard/account/tokens
 */

// ── Template definitions ─────────────────────────────────────────

interface TemplateConfig {
  subject: string;
  content: string;
  apiSubjectKey: string;
  apiContentKey: string;
}

const templates: TemplateConfig[] = [
  {
    subject: "Welcome to SIBT — Confirm your email",
    content: emailLayout(`
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">Confirm your email</h1>
      <p style="font-size: 15px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 16px;">
        Welcome to SIBT. Click below to confirm your email and start your <span style="color: ${BRAND.colors.accent}; font-weight: 600;">14-day Pro trial</span>.
      </p>
      ${emailButton("{{ .ConfirmationURL }}", "CONFIRM EMAIL")}
      ${emailDisclaimer("If you didn't sign up for SIBT, you can safely ignore this email.")}
    `),
    apiSubjectKey: "MAILER_TEMPLATES_CONFIRMATION_SUBJECT",
    apiContentKey: "MAILER_TEMPLATES_CONFIRMATION_CONTENT",
  },
  {
    subject: "SIBT — Your login link",
    content: emailLayout(`
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">Log in to SIBT</h1>
      <p style="font-size: 15px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 16px;">
        Click below to log in to your SIBT dashboard.
      </p>
      ${emailButton("{{ .ConfirmationURL }}", "LOG IN")}
      ${emailDisclaimer("This link expires in 24 hours. If you didn't request this, ignore this email.")}
    `),
    apiSubjectKey: "MAILER_TEMPLATES_MAGIC_LINK_SUBJECT",
    apiContentKey: "MAILER_TEMPLATES_MAGIC_LINK_CONTENT",
  },
  {
    subject: "SIBT — Reset your password",
    content: emailLayout(`
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">Reset your password</h1>
      <p style="font-size: 15px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 16px;">
        Click below to reset your SIBT password.
      </p>
      ${emailButton("{{ .ConfirmationURL }}", "RESET PASSWORD")}
      ${emailDisclaimer("If you didn't request a password reset, ignore this email. Your password won't change.")}
    `),
    apiSubjectKey: "MAILER_TEMPLATES_RECOVERY_SUBJECT",
    apiContentKey: "MAILER_TEMPLATES_RECOVERY_CONTENT",
  },
  {
    subject: "You've been invited to SIBT",
    content: emailLayout(`
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">You're invited to SIBT</h1>
      <p style="font-size: 15px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 16px;">
        You've been invited to join SIBT — a Bloomberg Terminal-style market dashboard with AI analysis.
        Click below to accept and create your account.
      </p>
      ${emailButton("{{ .ConfirmationURL }}", "ACCEPT INVITE")}
      ${emailDisclaimer("If you weren't expecting this invitation, you can safely ignore this email.")}
    `),
    apiSubjectKey: "MAILER_TEMPLATES_INVITE_SUBJECT",
    apiContentKey: "MAILER_TEMPLATES_INVITE_CONTENT",
  },
  {
    subject: "SIBT — Confirm email change",
    content: emailLayout(`
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">Confirm your new email</h1>
      <p style="font-size: 15px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 16px;">
        Click below to confirm changing your SIBT email address.
      </p>
      ${emailButton("{{ .ConfirmationURL }}", "CONFIRM EMAIL CHANGE")}
      ${emailDisclaimer("If you didn't request this change, contact us at hello@sibt.ai.")}
    `),
    apiSubjectKey: "MAILER_TEMPLATES_EMAIL_CHANGE_SUBJECT",
    apiContentKey: "MAILER_TEMPLATES_EMAIL_CHANGE_CONTENT",
  },
];

// ── Auth ─────────────────────────────────────────────────────────

const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function isAdminOrServiceRole(req: Request): boolean {
  const secret = req.headers.get("x-admin-secret");
  if (ADMIN_SECRET && secret === ADMIN_SECRET) return true;

  const authHeader = req.headers.get("Authorization");
  if (authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) return true;

  return false;
}

// ── Handler ──────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  // Admin-only endpoint
  if (!isAdminOrServiceRole(req)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized. This endpoint requires admin credentials." }),
      { status: 403, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  try {
    // Get Management API token from secrets
    const accessToken = Deno.env.get("SB_MGMT_TOKEN");
    if (!accessToken) {
      return new Response(
        JSON.stringify({
          error: "SB_MGMT_TOKEN not set. Add it via: supabase secrets set SB_MGMT_TOKEN=sbp_xxx",
        }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Extract project ref from SUPABASE_URL (https://<ref>.supabase.co)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const refMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (!refMatch) {
      return new Response(
        JSON.stringify({ error: "Could not extract project ref from SUPABASE_URL" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }
    const projectRef = refMatch[1];

    // Build config payload
    const configPayload: Record<string, string> = {};
    const synced: string[] = [];

    for (const t of templates) {
      configPayload[t.apiSubjectKey] = t.subject;
      configPayload[t.apiContentKey] = t.content;
      synced.push(t.subject);
    }

    // PATCH auth config via Management API
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
      return new Response(
        JSON.stringify({ error: `Management API error (${res.status})`, details: body }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        synced: true,
        templates: synced,
        project: projectRef,
        count: templates.length,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
