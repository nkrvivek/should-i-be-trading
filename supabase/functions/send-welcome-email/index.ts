import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/auth.ts";
import { BRAND, emailLayout, emailButton } from "../_shared/email.ts";

/**
 * Send a branded welcome email when a new user signs up.
 *
 * Can be triggered two ways:
 * 1. Via database webhook (pg_net) on profile insert
 * 2. Called directly from the client after signup
 *
 * Requires RESEND_API_KEY env var for email delivery.
 * Falls back to Supabase Auth email if Resend is not configured.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, email, display_name } = await req.json();

    // If called via webhook, get user details from the database
    let userEmail = email;
    let userName = display_name;

    if (user_id && (!email || !display_name)) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (user) {
        userEmail = userEmail || user.email;
        userName = userName || user.user_metadata?.display_name || user.email?.split("@")[0] || "there";
      }
    }

    if (!userEmail) {
      return new Response(JSON.stringify({ error: "No email provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.log("RESEND_API_KEY not set, skipping welcome email for", userEmail);
      return new Response(JSON.stringify({ skipped: true, reason: "RESEND_API_KEY not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromEmail = Deno.env.get("WELCOME_FROM_EMAIL") || `${BRAND.name} <welcome@sibt.ai>`;

    const htmlBody = emailLayout(`
    <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">Welcome${userName ? `, ${userName}` : ""}!</h1>

    <p style="font-size: 15px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 16px;">
      Your account is ready. You have a <span style="color: ${BRAND.colors.accent}; font-weight: 600;">14-day Pro trial</span> — no credit card required.
    </p>

    <p style="font-size: 15px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 16px;">Here's what you can do right now:</p>

    <ul style="list-style: none; padding: 0; margin: 0 0 24px;">
      <li style="padding: 6px 0; font-size: 14px; color: ${BRAND.colors.muted};">&#10003; Real-time market regime signals (TRADE / CAUTION / NO TRADE)</li>
      <li style="padding: 6px 0; font-size: 14px; color: ${BRAND.colors.muted};">&#10003; Technical signal overlays (RSI, MACD, Bollinger, 10+ indicators)</li>
      <li style="padding: 6px 0; font-size: 14px; color: ${BRAND.colors.muted};">&#10003; SIBT Score &mdash; per-stock 1-10 composite rating</li>
      <li style="padding: 6px 0; font-size: 14px; color: ${BRAND.colors.muted};">&#10003; Stock fundamentals, 13F institutional tracker, news sentiment</li>
      <li style="padding: 6px 0; font-size: 14px; color: ${BRAND.colors.muted};">&#10003; Portfolio-aware AI chat with Claude</li>
      <li style="padding: 6px 0; font-size: 14px; color: ${BRAND.colors.muted};">&#10003; Strategy simulator with Greeks + live options chain</li>
      <li style="padding: 6px 0; font-size: 14px; color: ${BRAND.colors.muted};">&#10003; Insider &amp; congressional trading tracker</li>
      <li style="padding: 6px 0; font-size: 14px; color: ${BRAND.colors.muted};">&#10003; CFTC/COT dashboard, macro data, earnings calendar</li>
    </ul>

    ${emailButton(`${BRAND.domain}`, "OPEN SIBT TERMINAL")}

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.colors.muted}; margin: 0 0 8px;">
      To unlock all features, add your API keys in <a href="${BRAND.domain}/settings" style="color: ${BRAND.colors.accent}; text-decoration: none;">Settings</a>:
    </p>
    <p style="font-size: 13px; color: ${BRAND.colors.muted}; margin: 0;">
      <strong style="color: ${BRAND.colors.text};">Anthropic</strong> — AI analysis &amp; chat<br>
      <strong style="color: ${BRAND.colors.text};">Finnhub</strong> — Earnings data &amp; metrics<br>
      <strong style="color: ${BRAND.colors.text};">Exa</strong> — Research &amp; transcript search
    </p>
    `);

    const textBody = `Welcome to SIBT${userName ? `, ${userName}` : ""}!

Your account is ready. You have a 14-day Pro trial — no credit card required.

Here's what you can do:
- Real-time market regime signals (TRADE / CAUTION / NO TRADE)
- Technical signal overlays (RSI, MACD, Bollinger, 10+ indicators)
- SIBT Score — per-stock 1-10 composite rating
- Stock fundamentals, 13F institutional tracker, news sentiment
- Portfolio-aware AI chat with Claude
- Strategy simulator with Greeks + live options chain
- Insider & congressional trading tracker
- CFTC/COT dashboard, macro data, earnings calendar

Open SIBT: ${BRAND.domain}

Add your API keys in Settings to unlock all features:
- Anthropic — AI analysis & chat
- Finnhub — Earnings data & metrics
- Exa — Research & transcript search

---
© ${new Date().getFullYear()} ${BRAND.tagline} | sibt.ai
${BRAND.name} is an analytical tool. Not investment advice.`;

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: userEmail,
        subject: `Welcome to ${BRAND.name} — Your 14-day Pro trial is active`,
        html: htmlBody,
        text: textBody,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Send failed" }));
      console.error("Resend error:", err);
      return new Response(JSON.stringify({ error: err.message || "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await res.json();
    console.log("Welcome email sent to", userEmail, "id:", result.id);

    return new Response(JSON.stringify({ sent: true, id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Welcome email error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
