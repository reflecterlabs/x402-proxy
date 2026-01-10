#!/usr/bin/env bash
# Multi-Tenant Setup Script for x402hub
# Automates D1 and KV creation and configuration

set -e

echo "🚀 x402hub Multi-Tenant Setup"
echo "=============================="
echo ""

# Check if wrangler is logged in
if ! npx wrangler whoami &>/dev/null; then
  echo "❌ Not logged into Wrangler. Run: npx wrangler login"
  exit 1
fi

echo "✅ Wrangler authenticated"
echo ""

# Step 1: Create D1 Database
echo "📦 Step 1: Creating D1 Database..."
echo ""

if npx wrangler d1 list | grep -q "x402hub-db"; then
  echo "ℹ️  D1 database 'x402hub-db' already exists"
  DB_ID=$(npx wrangler d1 list | grep "x402hub-db" | awk '{print $2}')
else
  echo "Creating new D1 database..."
  DB_OUTPUT=$(npx wrangler d1 create x402hub-db 2>&1)
  DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | sed 's/.*= "\(.*\)"/\1/')
  
  if [ -z "$DB_ID" ]; then
    echo "❌ Failed to create D1 database"
    echo "$DB_OUTPUT"
    exit 1
  fi
  
  echo "✅ Created D1 database with ID: $DB_ID"
fi

echo ""

# Step 2: Create KV Namespace
echo "📦 Step 2: Creating KV Namespace..."
echo ""

if npx wrangler kv namespace list | grep -q "TENANT_CACHE"; then
  echo "ℹ️  KV namespace 'TENANT_CACHE' already exists"
  KV_ID=$(npx wrangler kv namespace list | grep "TENANT_CACHE" | sed 's/.*id = "\([^"]*\)".*/\1/')
else
  echo "Creating new KV namespace..."
  KV_OUTPUT=$(npx wrangler kv namespace create TENANT_CACHE 2>&1)
  KV_ID=$(echo "$KV_OUTPUT" | grep "id" | sed 's/.*id = "\([^"]*\)".*/\1/' | head -1)
  
  if [ -z "$KV_ID" ]; then
    echo "❌ Failed to create KV namespace"
    echo "$KV_OUTPUT"
    exit 1
  fi
  
  echo "✅ Created KV namespace with ID: $KV_ID"
fi

echo ""

# Step 3: Update wrangler.jsonc
echo "📝 Step 3: Updating wrangler.jsonc..."
echo ""

# Backup original
cp wrangler.jsonc wrangler.jsonc.backup

# Replace placeholder IDs
sed -i.tmp "s/preview-database-id/$DB_ID/g" wrangler.jsonc
sed -i.tmp "s/preview-kv-id/$KV_ID/g" wrangler.jsonc
rm wrangler.jsonc.tmp

echo "✅ Updated wrangler.jsonc (backup saved to wrangler.jsonc.backup)"
echo ""

# Step 4: Apply schema
echo "📋 Step 4: Applying database schema..."
echo ""

read -p "Apply schema to production? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  npx wrangler d1 execute x402hub-db --remote --file=./db/schema.sql
  echo "✅ Schema applied to production database"
else
  npx wrangler d1 execute x402hub-db --local --file=./db/schema.sql
  echo "✅ Schema applied to local database only"
  echo "ℹ️  To apply to production later, run:"
  echo "   npx wrangler d1 execute x402hub-db --remote --file=./db/schema.sql"
fi

echo ""

# Step 5: Summary
echo "✅ Setup Complete!"
echo "=================="
echo ""
echo "Your configuration:"
echo "  • D1 Database ID: $DB_ID"
echo "  • KV Namespace ID: $KV_ID"
echo ""
echo "Next steps:"
echo "  1. Configure routes in wrangler.jsonc (see MULTI_TENANT.md)"
echo "  2. Deploy: npm run deploy"
echo "  3. Test demo tenant: curl https://demo.x402hub.com/__x402/health"
echo ""
echo "📖 See MULTI_TENANT.md for full documentation"
