#!/bin/bash
# Setup Stripe products and prices programmatically
# Requires: stripe CLI (brew install stripe/stripe-cli/stripe)
# Make sure you're logged in: stripe login
# Usage: ./scripts/setup-stripe.sh

set -eo pipefail

echo "=== SIBT Stripe Setup ==="
echo ""

# Check stripe CLI
if ! command -v stripe &> /dev/null; then
  echo "Error: Stripe CLI not installed. Run: brew install stripe/stripe-cli/stripe"
  exit 1
fi

# Check if logged in
if ! stripe config --list 2>/dev/null | grep -q "test_mode_api_key"; then
  echo "Error: Not logged in to Stripe. Run: stripe login"
  exit 1
fi

echo "Creating products and prices..."
echo ""

# --- PRO ---
echo "Creating SIBT Pro product..."
PRO_OUTPUT=$(stripe products create \
  --name="SIBT Pro" \
  --description="Full Bloomberg-style terminal with AI analysis, dark pool scanner, alerts, and custom watchlists." \
  -d "metadata[tier]=pro" 2>&1)

PRO_PRODUCT=$(echo "$PRO_OUTPUT" | grep '"id":' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')

if [ -z "$PRO_PRODUCT" ]; then
  echo "Error creating Pro product. Output:"
  echo "$PRO_OUTPUT"
  exit 1
fi

echo "Created product: SIBT Pro ($PRO_PRODUCT)"

echo "Creating Pro monthly price..."
PRO_M_OUTPUT=$(stripe prices create \
  --product="$PRO_PRODUCT" \
  -d "unit_amount=2900" \
  -d "currency=usd" \
  -d "recurring[interval]=month" \
  -d "metadata[tier]=pro" \
  -d "metadata[interval]=month" 2>&1)

PRO_MONTHLY=$(echo "$PRO_M_OUTPUT" | grep '"id":' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')

if [ -z "$PRO_MONTHLY" ]; then
  echo "Error creating Pro monthly price. Output:"
  echo "$PRO_M_OUTPUT"
  exit 1
fi

echo "  Monthly: \$29/mo ($PRO_MONTHLY)"

echo "Creating Pro annual price..."
PRO_Y_OUTPUT=$(stripe prices create \
  --product="$PRO_PRODUCT" \
  -d "unit_amount=24900" \
  -d "currency=usd" \
  -d "recurring[interval]=year" \
  -d "metadata[tier]=pro" \
  -d "metadata[interval]=year" 2>&1)

PRO_YEARLY=$(echo "$PRO_Y_OUTPUT" | grep '"id":' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')

if [ -z "$PRO_YEARLY" ]; then
  echo "Error creating Pro yearly price. Output:"
  echo "$PRO_Y_OUTPUT"
  exit 1
fi

echo "  Annual:  \$249/yr ($PRO_YEARLY)"

# --- ENTERPRISE ---
echo ""
echo "Creating SIBT Enterprise product..."
ENT_OUTPUT=$(stripe products create \
  --name="SIBT Enterprise" \
  --description="Automated strategies with risk controls, backtester, cloud Radon, and early access to new features." \
  -d "metadata[tier]=enterprise" 2>&1)

ENT_PRODUCT=$(echo "$ENT_OUTPUT" | grep '"id":' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')

if [ -z "$ENT_PRODUCT" ]; then
  echo "Error creating Enterprise product. Output:"
  echo "$ENT_OUTPUT"
  exit 1
fi

echo "Created product: SIBT Enterprise ($ENT_PRODUCT)"

echo "Creating Enterprise monthly price..."
ENT_M_OUTPUT=$(stripe prices create \
  --product="$ENT_PRODUCT" \
  -d "unit_amount=7900" \
  -d "currency=usd" \
  -d "recurring[interval]=month" \
  -d "metadata[tier]=enterprise" \
  -d "metadata[interval]=month" 2>&1)

ENT_MONTHLY=$(echo "$ENT_M_OUTPUT" | grep '"id":' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')

if [ -z "$ENT_MONTHLY" ]; then
  echo "Error creating Enterprise monthly price. Output:"
  echo "$ENT_M_OUTPUT"
  exit 1
fi

echo "  Monthly: \$79/mo ($ENT_MONTHLY)"

echo "Creating Enterprise annual price..."
ENT_Y_OUTPUT=$(stripe prices create \
  --product="$ENT_PRODUCT" \
  -d "unit_amount=69900" \
  -d "currency=usd" \
  -d "recurring[interval]=year" \
  -d "metadata[tier]=enterprise" \
  -d "metadata[interval]=year" 2>&1)

ENT_YEARLY=$(echo "$ENT_Y_OUTPUT" | grep '"id":' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')

if [ -z "$ENT_YEARLY" ]; then
  echo "Error creating Enterprise yearly price. Output:"
  echo "$ENT_Y_OUTPUT"
  exit 1
fi

echo "  Annual:  \$699/yr ($ENT_YEARLY)"

echo ""
echo "==========================================="
echo "  SETUP COMPLETE"
echo "==========================================="
echo ""
echo "Step 1: Add to Supabase Edge Function secrets:"
echo ""
echo "  supabase secrets set STRIPE_PRO_MONTHLY_PRICE_ID=$PRO_MONTHLY"
echo "  supabase secrets set STRIPE_PRO_YEARLY_PRICE_ID=$PRO_YEARLY"
echo "  supabase secrets set STRIPE_ENT_MONTHLY_PRICE_ID=$ENT_MONTHLY"
echo "  supabase secrets set STRIPE_ENT_YEARLY_PRICE_ID=$ENT_YEARLY"
echo ""
echo "Step 2: Also set your Stripe keys:"
echo ""
echo "  supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE"
echo "  supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE"
echo ""
echo "Step 3: Add to .env (client-side, publishable key only):"
echo ""
echo "  VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE"
echo ""
echo "Step 4: Create webhook endpoint in Stripe Dashboard:"
echo "  URL: https://<project>.supabase.co/functions/v1/stripe-webhook"
echo "  Events: checkout.session.completed, customer.subscription.updated,"
echo "          customer.subscription.deleted, invoice.paid, invoice.payment_failed"
echo ""
echo "Step 5: Deploy Edge Functions:"
echo "  supabase functions deploy create-checkout"
echo "  supabase functions deploy stripe-webhook"
echo "  supabase functions deploy create-portal"
