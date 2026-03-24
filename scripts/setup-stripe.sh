#!/bin/bash
# Setup Stripe products and prices programmatically
# Requires: stripe CLI (brew install stripe/stripe-cli/stripe)
# Usage: STRIPE_SECRET_KEY=sk_test_xxx ./scripts/setup-stripe.sh

set -euo pipefail

echo "=== SIBT Stripe Setup ==="
echo ""

# Check stripe CLI
if ! command -v stripe &> /dev/null; then
  echo "Error: Stripe CLI not installed. Run: brew install stripe/stripe-cli/stripe"
  exit 1
fi

echo "Creating products and prices..."
echo ""

# --- PRO ---
PRO_PRODUCT=$(stripe products create \
  --name="SIBT Pro" \
  --description="Full Bloomberg-style terminal with AI analysis, dark pool scanner, alerts, and custom watchlists." \
  --metadata[tier]=pro \
  --format=json 2>/dev/null | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)

echo "Created product: SIBT Pro ($PRO_PRODUCT)"

PRO_MONTHLY=$(stripe prices create \
  --product="$PRO_PRODUCT" \
  --unit-amount=2900 \
  --currency=usd \
  --recurring[interval]=month \
  --metadata[tier]=pro \
  --metadata[interval]=month \
  --format=json 2>/dev/null | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)

echo "  Monthly: \$29/mo ($PRO_MONTHLY)"

PRO_YEARLY=$(stripe prices create \
  --product="$PRO_PRODUCT" \
  --unit-amount=24900 \
  --currency=usd \
  --recurring[interval]=year \
  --metadata[tier]=pro \
  --metadata[interval]=year \
  --format=json 2>/dev/null | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)

echo "  Annual:  \$249/yr ($PRO_YEARLY)"

# --- ENTERPRISE ---
ENT_PRODUCT=$(stripe products create \
  --name="SIBT Enterprise" \
  --description="Automated strategies with risk controls, backtester, cloud Radon, and early access to new features." \
  --metadata[tier]=enterprise \
  --format=json 2>/dev/null | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
echo "Created product: SIBT Enterprise ($ENT_PRODUCT)"

ENT_MONTHLY=$(stripe prices create \
  --product="$ENT_PRODUCT" \
  --unit-amount=7900 \
  --currency=usd \
  --recurring[interval]=month \
  --metadata[tier]=enterprise \
  --metadata[interval]=month \
  --format=json 2>/dev/null | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)

echo "  Monthly: \$79/mo ($ENT_MONTHLY)"

ENT_YEARLY=$(stripe prices create \
  --product="$ENT_PRODUCT" \
  --unit-amount=69900 \
  --currency=usd \
  --recurring[interval]=year \
  --metadata[tier]=enterprise \
  --metadata[interval]=year \
  --format=json 2>/dev/null | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)

echo "  Annual:  \$699/yr ($ENT_YEARLY)"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Add these to your Supabase Edge Function secrets:"
echo ""
echo "  supabase secrets set STRIPE_PRO_MONTHLY_PRICE_ID=$PRO_MONTHLY"
echo "  supabase secrets set STRIPE_PRO_YEARLY_PRICE_ID=$PRO_YEARLY"
echo "  supabase secrets set STRIPE_ENT_MONTHLY_PRICE_ID=$ENT_MONTHLY"
echo "  supabase secrets set STRIPE_ENT_YEARLY_PRICE_ID=$ENT_YEARLY"
echo ""
echo "Also set:"
echo "  supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx"
echo "  supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx"
echo ""
echo "Add to .env (client-side, publishable key only):"
echo "  VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx"
echo ""
echo "Create webhook endpoint in Stripe Dashboard:"
echo "  URL: https://<project>.supabase.co/functions/v1/stripe-webhook"
echo "  Events: checkout.session.completed, customer.subscription.updated,"
echo "          customer.subscription.deleted, invoice.paid, invoice.payment_failed"
