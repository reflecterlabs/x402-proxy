-- x402hub Multi-Tenant Database Schema
-- SQLite (Cloudflare D1)
-- Version: 1.0
-- Last Updated: 2026-01-10

-- ==============================================================================
-- TENANTS TABLE
-- ==============================================================================
-- Each tenant is a customer who uses x402hub to monetize their API
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,                    -- UUID or slug (e.g., 'acme-corp')
  subdomain TEXT UNIQUE NOT NULL,         -- Subdomain for routing (e.g., 'acme')
  name TEXT NOT NULL,                     -- Display name
  origin_url TEXT,                        -- External origin URL (if using ORIGIN_URL mode)
  origin_service TEXT,                    -- Service binding name (if using Service Binding mode)
  wallet_address TEXT NOT NULL,           -- Where payments go (PAY_TO)
  network TEXT NOT NULL DEFAULT 'base-sepolia', -- 'base-sepolia' or 'base'
  facilitator_url TEXT,                   -- Custom facilitator (optional)
  jwt_secret TEXT NOT NULL,               -- Secret for signing JWT cookies
  status TEXT NOT NULL DEFAULT 'active',  -- 'active', 'suspended', 'trial'
  created_at INTEGER NOT NULL,            -- Unix timestamp
  updated_at INTEGER NOT NULL             -- Unix timestamp
);

CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- ==============================================================================
-- PROTECTED ROUTES TABLE
-- ==============================================================================
-- Each tenant can define multiple protected routes with custom pricing
CREATE TABLE IF NOT EXISTS protected_routes (
  id TEXT PRIMARY KEY,                    -- UUID
  tenant_id TEXT NOT NULL,                -- Foreign key to tenants.id
  pattern TEXT NOT NULL,                  -- Route pattern (e.g., '/api/score', '/premium/*')
  price_usd TEXT NOT NULL,                -- Price in USD format (e.g., '$0.50')
  description TEXT,                       -- Human-readable description
  enabled INTEGER NOT NULL DEFAULT 1,     -- 1 = enabled, 0 = disabled
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_routes_tenant ON protected_routes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_routes_enabled ON protected_routes(tenant_id, enabled);

-- ==============================================================================
-- USAGE LOGS TABLE
-- ==============================================================================
-- Track every request for analytics and billing
CREATE TABLE IF NOT EXISTS usage_logs (
  id TEXT PRIMARY KEY,                    -- UUID
  tenant_id TEXT NOT NULL,                -- Foreign key to tenants.id
  route_id TEXT,                          -- Foreign key to protected_routes.id (nullable for public routes)
  path TEXT NOT NULL,                     -- Requested path
  method TEXT NOT NULL,                   -- HTTP method
  status_code INTEGER NOT NULL,           -- Response status
  payment_verified INTEGER NOT NULL,      -- 1 if payment was verified, 0 if cached/cookie
  client_ip TEXT,                         -- Client IP (for rate limiting)
  user_agent TEXT,                        -- User agent
  response_time_ms INTEGER,               -- Response time in milliseconds
  timestamp INTEGER NOT NULL,             -- Unix timestamp
  FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY(route_id) REFERENCES protected_routes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_tenant_time ON usage_logs(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_route ON usage_logs(route_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_payment ON usage_logs(payment_verified, timestamp DESC);

-- ==============================================================================
-- RATE LIMITS TABLE (Optional - for future use)
-- ==============================================================================
-- Per-client rate limiting configuration
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,                    -- UUID
  tenant_id TEXT NOT NULL,                -- Foreign key to tenants.id
  client_identifier TEXT NOT NULL,        -- IP or API key
  max_requests_per_hour INTEGER NOT NULL DEFAULT 100,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_client ON rate_limits(tenant_id, client_identifier);

-- ==============================================================================
-- SEED DATA (for testing)
-- ==============================================================================
-- Insert a test tenant for local development
INSERT OR IGNORE INTO tenants (
  id,
  subdomain,
  name,
  wallet_address,
  network,
  jwt_secret,
  status,
  created_at,
  updated_at
) VALUES (
  'test-tenant-1',
  'demo',
  'Demo Fintech',
  '0x000000000000000000000000000000000000dEaD',
  'base-sepolia',
  'dev-jwt-secret-replace-in-production',
  'active',
  strftime('%s', 'now'),
  strftime('%s', 'now')
);

-- Insert a test protected route
INSERT OR IGNORE INTO protected_routes (
  id,
  tenant_id,
  pattern,
  price_usd,
  description,
  enabled,
  created_at,
  updated_at
) VALUES (
  'route-1',
  'test-tenant-1',
  '/api/credit-score',
  '$0.50',
  'Credit score lookup',
  1,
  strftime('%s', 'now'),
  strftime('%s', 'now')
);

INSERT OR IGNORE INTO protected_routes (
  id,
  tenant_id,
  pattern,
  price_usd,
  description,
  enabled,
  created_at,
  updated_at
) VALUES (
  'route-2',
  'test-tenant-1',
  '/premium/*',
  '$0.10',
  'Premium data access',
  1,
  strftime('%s', 'now'),
  strftime('%s', 'now')
);
