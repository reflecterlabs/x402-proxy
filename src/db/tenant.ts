/**
 * Database utilities for multi-tenant operations
 */

import type { Env } from "../env";
import type { Tenant, ProtectedRoute, TenantConfig, UsageLog } from "../types/db";

const CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * Extract subdomain from request hostname
 * @example
 * extractSubdomain('acme.x402hub.com') => 'acme'
 * extractSubdomain('localhost') => null
 */
export function extractSubdomain(hostname: string): string | null {
	// For local dev (localhost:8787) or workers.dev, no subdomain
	if (hostname.includes("localhost") || hostname.endsWith(".workers.dev")) {
		return null;
	}

	const parts = hostname.split(".");
	if (parts.length < 3) return null; // No subdomain
	return parts[0];
}

/**
 * Get tenant configuration by subdomain (with KV caching)
 */
export async function getTenantConfig(
	subdomain: string,
	env: Env,
): Promise<TenantConfig | null> {
	// Try cache first
	const cacheKey = `tenant:${subdomain}`;
	const cached = await env.TENANT_CACHE.get<TenantConfig>(cacheKey, "json");

	if (cached && Date.now() - cached.cached_at < CACHE_TTL_SECONDS * 1000) {
		return cached;
	}

	// Cache miss - query D1
	const tenant = await env.DB.prepare(
		"SELECT * FROM tenants WHERE subdomain = ? AND status = 'active'",
	)
		.bind(subdomain)
		.first<Tenant>();

	if (!tenant) return null;

	// Fetch tenant's protected routes
	const routes = await env.DB.prepare(
		"SELECT * FROM protected_routes WHERE tenant_id = ? AND enabled = 1",
	)
		.bind(tenant.id)
		.all<ProtectedRoute>();

	const config: TenantConfig = {
		tenant,
		routes: routes.results || [],
		cached_at: Date.now(),
	};

	// Store in cache
	await env.TENANT_CACHE.put(cacheKey, JSON.stringify(config), {
		expirationTtl: CACHE_TTL_SECONDS,
	});

	return config;
}

/**
 * Invalidate tenant cache (call after config changes)
 */
export async function invalidateTenantCache(subdomain: string, env: Env): Promise<void> {
	await env.TENANT_CACHE.delete(`tenant:${subdomain}`);
}

/**
 * Log API usage for analytics
 */
export async function logUsage(
	log: Omit<UsageLog, "id" | "timestamp">,
	env: Env,
): Promise<void> {
	const id = crypto.randomUUID();
	const timestamp = Math.floor(Date.now() / 1000);

	await env.DB.prepare(
		`INSERT INTO usage_logs (
			id, tenant_id, route_id, path, method, status_code,
			payment_verified, client_ip, user_agent, response_time_ms, timestamp
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	)
		.bind(
			id,
			log.tenant_id,
			log.route_id,
			log.path,
			log.method,
			log.status_code,
			log.payment_verified,
			log.client_ip,
			log.user_agent,
			log.response_time_ms,
			timestamp,
		)
		.run();
}

/**
 * Get usage stats for a tenant (today's data)
 */
export async function getTenantStats(
	tenantId: string,
	env: Env,
): Promise<{ total_requests: number; paid_requests: number; revenue_usd: number }> {
	const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);

	const result = await env.DB.prepare(
		`SELECT 
			COUNT(*) as total_requests,
			SUM(payment_verified) as paid_requests
		FROM usage_logs 
		WHERE tenant_id = ? AND timestamp >= ?`,
	)
		.bind(tenantId, todayStart)
		.first<{ total_requests: number; paid_requests: number }>();

	// TODO: Calculate revenue by joining with protected_routes
	// For now, return 0 as placeholder
	return {
		total_requests: result?.total_requests || 0,
		paid_requests: result?.paid_requests || 0,
		revenue_usd: 0,
	};
}
