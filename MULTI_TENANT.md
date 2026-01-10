# Multi-Tenant Setup Guide

This guide explains how to set up x402hub in multi-tenant mode, where multiple customers (tenants) can use your deployment to monetize their own APIs.

## Architecture Overview

```
Customer A: acme.x402hub.com → Acme's API
Customer B: techco.x402hub.com → TechCo's API
Customer C: datapro.x402hub.com → DataPro's API
```

Each customer gets:
- Unique subdomain
- Their own protected routes with custom pricing
- Payments sent directly to their wallet
- Usage analytics

## Prerequisites

- Cloudflare account with Workers enabled
- Custom domain configured in Cloudflare (e.g., `x402hub.com`)
- Wrangler CLI logged in: `npx wrangler login`

## Step 1: Create D1 Database

Create the multi-tenant database:

```bash
npx wrangler d1 create x402hub-db
```

This will output:

```
✅ Successfully created DB 'x402hub-db'!
Add the following to your wrangler.jsonc:

[[d1_databases]]
binding = "DB"
database_name = "x402hub-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Update `wrangler.jsonc`:** Replace `preview-database-id` with your actual `database_id`.

## Step 2: Apply Database Schema

```bash
# For local development
npx wrangler d1 execute x402hub-db --local --file=./db/schema.sql

# For production
npx wrangler d1 execute x402hub-db --remote --file=./db/schema.sql
```

This creates tables:
- `tenants` - Customer configurations
- `protected_routes` - Route pricing per tenant
- `usage_logs` - Request analytics
- `rate_limits` - Rate limiting rules (future use)

And seeds a test tenant:
- Subdomain: `demo`
- Routes: `/api/credit-score` ($0.50), `/premium/*` ($0.10)

## Step 3: Create KV Namespace

Create KV for caching tenant configs:

```bash
npx wrangler kv namespace create TENANT_CACHE
```

Output:

```
✅ Created namespace 'TENANT_CACHE' with id xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Update `wrangler.jsonc`:** Replace `preview-kv-id` with your actual `id`.

## Step 4: Configure Routes

Update `wrangler.jsonc` routes to handle all subdomains:

```jsonc
"routes": [
  {
    "pattern": "*.x402hub.com/*",
    "zone_name": "x402hub.com"
  }
]
```

This routes all subdomains (`acme.x402hub.com`, `demo.x402hub.com`, etc.) to your Worker.

## Step 5: Deploy

```bash
npm run deploy
```

## Step 6: Test Multi-Tenant Setup

### Test the demo tenant:

```bash
# Health check (should work)
curl https://demo.x402hub.com/__x402/health

# Protected route (should return 402)
curl https://demo.x402hub.com/api/credit-score
```

### Add a new tenant via D1:

```bash
npx wrangler d1 execute x402hub-db --remote --command="
INSERT INTO tenants (
  id, subdomain, name, wallet_address, network, jwt_secret, status, created_at, updated_at
) VALUES (
  'acme-corp',
  'acme',
  'Acme Corp',
  '0xYourWalletAddressHere',
  'base-sepolia',
  '$(openssl rand -hex 32)',
  'active',
  $(date +%s),
  $(date +%s)
)
"
```

### Add protected routes for the tenant:

```bash
npx wrangler d1 execute x402hub-db --remote --command="
INSERT INTO protected_routes (
  id, tenant_id, pattern, price_usd, description, enabled, created_at, updated_at
) VALUES (
  '$(uuidgen)',
  'acme-corp',
  '/api/premium',
  '$1.00',
  'Premium API access',
  1,
  $(date +%s),
  $(date +%s)
)
"
```

### Test the new tenant:

```bash
curl https://acme.x402hub.com/__x402/health
curl https://acme.x402hub.com/api/premium  # Should return 402
```

## Step 7: View Usage Analytics

Query usage logs:

```bash
npx wrangler d1 execute x402hub-db --remote --command="
SELECT 
  t.name AS tenant,
  COUNT(*) AS requests,
  SUM(payment_verified) AS paid_requests
FROM usage_logs ul
JOIN tenants t ON ul.tenant_id = t.id
WHERE ul.timestamp >= $(date -d 'today 00:00' +%s)
GROUP BY t.name
"
```

## Local Development

For local dev, use `--local` flag:

```bash
# Apply schema
npx wrangler d1 execute x402hub-db --local --file=./db/schema.sql

# Run dev server
npm run dev

# Access demo tenant
curl http://localhost:8787/__x402/health
# Note: Subdomain routing doesn't work locally, so you'll get the single-tenant fallback
```

**Tip:** To test multi-tenant locally, modify your `/etc/hosts`:

```
127.0.0.1  demo.localhost acme.localhost
```

Then access `http://demo.localhost:8787` (requires browser; curl won't work with custom ports in Host header).

## Switching Between Single-Tenant and Multi-Tenant

The Worker automatically detects the mode:

- **Multi-Tenant Mode:** When `DB` and `TENANT_CACHE` bindings are present + subdomain detected
- **Single-Tenant Mode:** Fallback for local dev or when bindings are missing (uses env vars from `wrangler.jsonc`)

You can keep both modes working simultaneously.

## Configuration Priority

When a tenant is loaded from D1, these values override env vars:

- `PAY_TO` → `tenant.wallet_address`
- `NETWORK` → `tenant.network`
- `FACILITATOR_URL` → `tenant.facilitator_url` (if set)
- `PROTECTED_PATTERNS` → `protected_routes` table
- `JWT_SECRET` → `tenant.jwt_secret`

## Next Steps

1. **Build Platform API:** Create an API for tenants to self-service configure routes
2. **Build Dashboard:** UI for signup, route management, and analytics
3. **Add Rate Limiting:** Implement per-client rate limits using KV
4. **Add Webhooks:** Notify tenants of payments via webhooks

See `docs/software/IMPLEMENTATION_ROADMAP-minimal.md` for the full MVP plan.

## Troubleshooting

### "Tenant not found: {subdomain}"

- Check tenant exists in D1: `npx wrangler d1 execute x402hub-db --remote --command="SELECT * FROM tenants WHERE subdomain = 'demo'"`
- Verify subdomain matches exactly (case-sensitive)
- Check tenant status is `'active'`

### "DB is not defined"

- Verify `database_id` is set correctly in `wrangler.jsonc`
- Redeploy: `npm run deploy`

### Subdomain not routing

- Check DNS records: `*.x402hub.com` should be proxied (orange cloud) pointing to your origin or @ record
- Verify `routes` pattern includes wildcard: `*.x402hub.com/*`

### KV cache not working

- Check `id` is set correctly in `wrangler.jsonc`
- Cache TTL is 5 minutes - changes may take time to reflect
- Manually clear cache: `npx wrangler kv key delete "tenant:{subdomain}" --namespace-id={your-kv-id}`
