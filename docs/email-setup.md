# SIBT Email Setup Guide

## Problem
Default Supabase emails say "Supabase Auth" and often land in spam.

## Solution: Custom SMTP + Branded Templates

### Step 1: Choose an SMTP Provider

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| **Resend** | 3,000 emails/month | Best for startups. Easy DNS setup. |
| **Postmark** | 100 emails/month | Excellent deliverability. |
| **SendGrid** | 100 emails/day | Widely used. |

Recommended: **Resend** (https://resend.com)

### Step 2: Configure SMTP in Supabase

1. Go to **Supabase Dashboard > Project Settings > Authentication > SMTP Settings**
2. Toggle **Enable Custom SMTP**
3. Enter your SMTP credentials:
   - **Sender email**: `hello@sibt.ai`
   - **Sender name**: `SIBT`
   - **Host**: (from your SMTP provider)
   - **Port**: 587
   - **Username**: (from provider)
   - **Password**: (from provider)
4. Save

### Step 3: Add DNS Records (Cloudflare)

Add these records in **Cloudflare Dashboard > DNS**:

**SPF Record:**
```
Type: TXT
Name: @
Content: v=spf1 include:_spf.resend.com ~all
```
(Adjust `include:` for your SMTP provider)

**DKIM Record:**
```
Type: TXT
Name: resend._domainkey (or provider-specific)
Content: (provided by your SMTP provider)
```

**DMARC Record:**
```
Type: TXT
Name: _dmarc
Content: v=DMARC1; p=quarantine; rua=mailto:hello@sibt.ai
```

### Step 4: Customize Email Templates

Go to **Supabase Dashboard > Authentication > Email Templates**

#### Confirm Signup

**Subject:** `Welcome to SIBT - Confirm your email`

**Body:**
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0f14; color: #e2e8f0;">
  <div style="text-align: center; margin-bottom: 24px;">
    <span style="font-family: 'IBM Plex Mono', monospace; font-size: 24px; font-weight: 700; color: #05AD98; letter-spacing: 2px;">SIBT</span>
    <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Should I Be Trading?</div>
  </div>

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Confirm your email</h2>

  <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px;">
    Welcome to SIBT. Click below to confirm your email and start your 14-day Pro trial.
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 32px; background: #05AD98; color: #0a0f14; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 4px;">
      CONFIRM EMAIL
    </a>
  </div>

  <p style="font-size: 11px; color: #64748b; margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 16px;">
    If you didn't sign up for SIBT, you can safely ignore this email.
  </p>

  <div style="text-align: center; margin-top: 16px;">
    <a href="https://sibt.ai" style="font-size: 11px; color: #05AD98; text-decoration: none;">sibt.ai</a>
    <span style="color: #334155; margin: 0 8px;">|</span>
    <a href="mailto:hello@sibt.ai" style="font-size: 11px; color: #05AD98; text-decoration: none;">hello@sibt.ai</a>
  </div>
</div>
```

#### Magic Link

**Subject:** `SIBT - Your login link`

**Body:**
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0f14; color: #e2e8f0;">
  <div style="text-align: center; margin-bottom: 24px;">
    <span style="font-family: 'IBM Plex Mono', monospace; font-size: 24px; font-weight: 700; color: #05AD98; letter-spacing: 2px;">SIBT</span>
  </div>

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Login to SIBT</h2>

  <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px;">
    Click below to log in to your SIBT dashboard.
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 32px; background: #05AD98; color: #0a0f14; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 4px;">
      LOG IN
    </a>
  </div>

  <p style="font-size: 11px; color: #64748b; margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 16px;">
    This link expires in 24 hours. If you didn't request this, ignore this email.
  </p>
</div>
```

#### Password Reset

**Subject:** `SIBT - Reset your password`

**Body:**
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0f14; color: #e2e8f0;">
  <div style="text-align: center; margin-bottom: 24px;">
    <span style="font-family: 'IBM Plex Mono', monospace; font-size: 24px; font-weight: 700; color: #05AD98; letter-spacing: 2px;">SIBT</span>
  </div>

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Reset your password</h2>

  <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px;">
    Click below to reset your SIBT password.
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 32px; background: #05AD98; color: #0a0f14; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 4px;">
      RESET PASSWORD
    </a>
  </div>

  <p style="font-size: 11px; color: #64748b; margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 16px;">
    If you didn't request a password reset, ignore this email. Your password won't change.
  </p>
</div>
```

### Step 5: Test

1. Sign up with a new email on sibt.ai
2. Check the email arrives from `hello@sibt.ai` (not `noreply@mail.app.supabase.io`)
3. Check it doesn't land in spam
4. Verify the SIBT branding renders correctly
5. Click the confirm link and verify it redirects to `https://sibt.ai`

### Troubleshooting

- **Still going to spam?** Check SPF/DKIM/DMARC records are propagated (`dig TXT sibt.ai`)
- **Email not sending?** Check SMTP credentials in Supabase dashboard
- **Wrong redirect URL?** Update Site URL in Supabase > Authentication > URL Configuration to `https://sibt.ai`
