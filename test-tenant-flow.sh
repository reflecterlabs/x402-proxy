#!/bin/bash

# Test script para x402hub Multi-Tenant Creation
# Este script prueba el flujo completo de creación de tenants

API="https://x402-proxy.cxto21h.workers.dev"

echo "🧪 Testing x402hub Multi-Tenant Creation Flow"
echo "=============================================="
echo ""

# 1. Test: Check API health
echo "1️⃣  Checking API health..."
HEALTH=$(curl -s "$API/__x402/health" | jq -r '.status' 2>/dev/null)
if [ "$HEALTH" = "ok" ]; then
  echo "✅ API is healthy"
else
  echo "❌ API health check failed"
  exit 1
fi
echo ""

# 2. Test: Get existing tenants
echo "2️⃣  Fetching existing tenants..."
TENANTS=$(curl -s "$API/api/tenants" | jq '.data | length' 2>/dev/null)
echo "✅ Found $TENANTS tenants"
echo ""

# 3. Test: Create a new tenant
echo "3️⃣  Creating a new tenant..."
TENANT_NAME="Test Tenant $(date +%s)"
SUBDOMAIN="test-$(date +%s | tail -c 5)"
WALLET="0x1234567890abcdef1234567890abcdef12345678"

RESPONSE=$(curl -s -X POST "$API/api/tenants" \
  -H "Content-Type: application/json" \
  -d "{
    \"subdomain\": \"$SUBDOMAIN\",
    \"name\": \"$TENANT_NAME\",
    \"wallet_address\": \"$WALLET\",
    \"network\": \"base-sepolia\"
  }")

SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TENANT_ID=$(echo "$RESPONSE" | jq -r '.data.id' 2>/dev/null)

if [ "$SUCCESS" = "true" ]; then
  echo "✅ Tenant created successfully!"
  echo "   ID: $TENANT_ID"
  echo "   Subdomain: $SUBDOMAIN"
  echo "   Name: $TENANT_NAME"
else
  echo "❌ Failed to create tenant"
  echo "Response: $RESPONSE"
  exit 1
fi
echo ""

# 4. Test: Get the created tenant
echo "4️⃣  Retrieving created tenant..."
GET_RESPONSE=$(curl -s "$API/api/tenants/$TENANT_ID")
GET_SUCCESS=$(echo "$GET_RESPONSE" | jq -r '.success' 2>/dev/null)

if [ "$GET_SUCCESS" = "true" ]; then
  echo "✅ Tenant retrieved successfully"
  echo "$GET_RESPONSE" | jq '.data | {id, subdomain, name, wallet_address, network}'
else
  echo "❌ Failed to retrieve tenant"
  echo "Response: $GET_RESPONSE"
  exit 1
fi
echo ""

echo "🎉 All tests passed!"
echo ""
echo "📝 Summary:"
echo "  - API health: ✅"
echo "  - List tenants: ✅"
echo "  - Create tenant: ✅"
echo "  - Get tenant: ✅"
echo ""
echo "🔗 Dashboard: https://x402-proxy.pages.dev/"
echo "📊 API: $API"
