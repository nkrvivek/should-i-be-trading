# SIBT Email Setup Guide

## Architecture

All email templates share a single source of truth:

```
supabase/functions/_shared/email.ts    ← Brand constants, layout, header, footer
├── send-welcome-email/index.ts        ← Uses shared layout for welcome email (Resend)
└── scripts/sync-email-templates.ts    ← Pushes auth templates to Supabase Management API
```

**To change branding, logo, colors, or footer** — edit `_shared/email.ts` once, then:
1. Deploy the welcome email edge function: `supabase functions deploy send-welcome-email`
2. Sync auth templates: `npm run email:sync`

## Templates

| Template | Delivery | Trigger |
|----------|----------|---------|
| **Confirm Signup** | Supabase Auth SMTP | User signs up |
| **Magic Link** | Supabase Auth SMTP | User requests magic link login |
| **Password Reset** | Supabase Auth SMTP | User requests password reset |
| **Invite** | Supabase Auth SMTP | Admin invites a user |
| **Email Change** | Supabase Auth SMTP | User changes email address |
| **Welcome** | Resend API (edge fn) | After profile creation (webhook + client) |

## Quick Start

### 1. SMTP Provider (for Auth emails)

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| **Resend** | 3,000 emails/month | Best for startups. Easy DNS setup. |
| **Postmark** | 100 emails/month | Excellent deliverability. |
| **SendGrid** | 100 emails/day | Widely used. |

Recommended: **Resend** (https://resend.com)

### 2. Configure SMTP in Supabase

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

### 3. DNS Records (Cloudflare)

**SPF Record:**
```
Type: TXT | Name: @ | Content: v=spf1 include:_spf.resend.com ~all
```

**DKIM Record:**
```
Type: TXT | Name: resend._domainkey | Content: (from provider)
```

**DMARC Record:**
```
Type: TXT | Name: _dmarc | Content: v=DMARC1; p=quarantine; rua=mailto:hello@sibt.ai
```

### 4. Sync Auth Templates (Programmatic)

Instead of manually editing templates in the Supabase dashboard:

```bash
# Preview generated HTML locally
npm run email:preview

# Dry run — see what would be synced
npm run email:dry-run

# Push all templates to Supabase
SUPABASE_PROJECT_REF=your-ref SB_MGMT_TOKEN=sbp_xxx npm run email:sync
```

Or pass credentials as arguments:
```bash
npx tsx scripts/sync-email-templates.ts --ref=your-ref --token=sbp_xxx
```

### 5. Deploy Welcome Email Edge Function

```bash
# Set Resend API key
supabase secrets set RESEND_API_KEY=re_xxx

# Deploy
supabase functions deploy send-welcome-email
```

### 6. Test

1. Sign up with a new email on sibt.ai
2. Check the confirmation email arrives from `hello@sibt.ai` (not `noreply@mail.app.supabase.io`)
3. Verify SIBT branding with logo renders correctly
4. Click confirm → should redirect to `https://sibt.ai`
5. Welcome email should follow shortly after profile creation

## Updating Templates

1. Edit `supabase/functions/_shared/email.ts` (branding, layout, colors, logo)
2. Run `npm run email:preview` to verify HTML output
3. Run `npm run email:sync` to push auth templates to Supabase
4. Run `supabase functions deploy send-welcome-email` for the welcome email
5. Done — all emails updated from one source

## Troubleshooting

- **Logo not showing?** Email clients block images by default. The logo uses `https://sibt.ai/logo-192.png` (PNG, not SVG — SVGs are blocked by most email clients). Recipients need to click "Display images" or add sender to contacts.
- **Still going to spam?** Check SPF/DKIM/DMARC records: `dig TXT sibt.ai`
- **Email not sending?** Check SMTP credentials in Supabase dashboard
- **Wrong redirect URL?** Update Site URL in Supabase > Authentication > URL Configuration to `https://sibt.ai`
- **Management API 401?** Generate a new token at https://supabase.com/dashboard/account/tokens
