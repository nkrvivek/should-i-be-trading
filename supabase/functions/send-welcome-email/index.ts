import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/auth.ts";

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

    const fromEmail = Deno.env.get("WELCOME_FROM_EMAIL") || "SIBT <welcome@sibt.ai>";

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0f14; color: #e2e8f0; margin: 0; padding: 0; }
    .container { max-width: 520px; margin: 0 auto; padding: 32px 24px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo-text { font-family: monospace; font-size: 28px; font-weight: 700; color: #05AD98; letter-spacing: 2px; }
    .subtitle { font-size: 14px; color: #94a3b8; margin-top: 4px; }
    h1 { font-size: 22px; font-weight: 600; color: #e2e8f0; margin: 0 0 16px; }
    p { font-size: 15px; line-height: 1.6; color: #94a3b8; margin: 0 0 16px; }
    .highlight { color: #05AD98; font-weight: 600; }
    .feature-list { list-style: none; padding: 0; margin: 0 0 24px; }
    .feature-list li { padding: 6px 0; font-size: 14px; color: #94a3b8; }
    .feature-list li::before { content: "\\2713 "; color: #05AD98; margin-right: 8px; }
    .cta { display: inline-block; padding: 12px 28px; background: #05AD98; color: #0a0f14; font-family: monospace; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 4px; letter-spacing: 0.5px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 12px; color: #475569; text-align: center; }
    .footer a { color: #05AD98; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://sibt.ai/logo-192.png" alt="SIBT" width="48" height="48" style="display: block; margin: 0 auto 8px; border-radius: 8px;" />
      <div class="logo-text">SIBT</div>
      <div class="subtitle">Should I Be Trading?</div>
    </div>

    <h1>Welcome${userName ? `, ${userName}` : ""}!</h1>

    <p>Your account is ready. You have a <span class="highlight">14-day Pro trial</span> — no credit card required.</p>

    <p>Here's what you can do right now:</p>

    <ul class="feature-list">
      <li>Real-time market regime signals (TRADE / CAUTION / NO TRADE)</li>
      <li>AI-powered market analysis with Claude</li>
      <li>Earnings calendar with AI summarization</li>
      <li>Insider &amp; congressional trading tracker</li>
      <li>TradingView charts with fullscreen mode</li>
      <li>AI stock screener (natural language)</li>
      <li>Strategy simulator with payoff visualizer</li>
      <li>Macro dashboard with FRED data</li>
    </ul>

    <p style="text-align: center; margin-bottom: 32px;">
      <a href="https://sibt.ai" class="cta">OPEN SIBT TERMINAL</a>
    </p>

    <p>To unlock all features, add your API keys in <a href="https://sibt.ai/settings" style="color: #05AD98; text-decoration: none;">Settings</a>:</p>
    <p style="font-size: 13px;">
      <strong style="color: #e2e8f0;">Anthropic</strong> — AI analysis &amp; chat<br>
      <strong style="color: #e2e8f0;">Finnhub</strong> — Earnings data &amp; metrics<br>
      <strong style="color: #e2e8f0;">Exa</strong> — Research &amp; transcript search
    </p>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Should I Be Trading? &middot; <a href="https://sibt.ai">sibt.ai</a></p>
      <p>
        <a href="https://sibt.ai/terms">Terms</a> &middot;
        <a href="https://sibt.ai/privacy">Privacy</a> &middot;
        <a href="https://sibt.ai/risk">Risk Disclosure</a>
      </p>
      <p style="margin-top: 8px;">SIBT is an analytical tool. Not investment advice.</p>
    </div>
  </div>
</body>
</html>`;

    const textBody = `Welcome to SIBT${userName ? `, ${userName}` : ""}!

Your account is ready. You have a 14-day Pro trial — no credit card required.

Here's what you can do:
- Real-time market regime signals (TRADE / CAUTION / NO TRADE)
- AI-powered market analysis with Claude
- Earnings calendar with AI summarization
- Insider & congressional trading tracker
- TradingView charts with fullscreen mode
- AI stock screener (natural language)
- Strategy simulator with payoff visualizer
- Macro dashboard with FRED data

Open SIBT: https://sibt.ai

Add your API keys in Settings to unlock all features:
- Anthropic — AI analysis & chat
- Finnhub — Earnings data & metrics
- Exa — Research & transcript search

---
© ${new Date().getFullYear()} Should I Be Trading? | sibt.ai
SIBT is an analytical tool. Not investment advice.`;

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
        subject: "Welcome to SIBT — Your 14-day Pro trial is active",
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
