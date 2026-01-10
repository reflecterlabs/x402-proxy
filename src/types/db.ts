/**
 * Database types and models for x402hub multi-tenant system
 */

/**
 * Tenant record from D1 database
 */
export interface Tenant {
	id: string;
	subdomain: string;
	name: string;
	origin_url: string | null;
	origin_service: string | null;
	wallet_address: string;
	network: "base-sepolia" | "base";
	facilitator_url: string | null;
	jwt_secret: string;
	status: "active" | "suspended" | "trial";
	created_at: number;
	updated_at: number;
}

/**
 * Protected route record from D1 database
 */
export interface ProtectedRoute {
	id: string;
	tenant_id: string;
	pattern: string;
	price_usd: string;
	description: string | null;
	enabled: number; // SQLite uses INTEGER for boolean: 1 = true, 0 = false
	created_at: number;
	updated_at: number;
}

/**
 * Usage log record for analytics
 */
export interface UsageLog {
	id: string;
	tenant_id: string;
	route_id: string | null;
	path: string;
	method: string;
	status_code: number;
	payment_verified: number; // 1 = payment verified, 0 = cached/cookie
	client_ip: string | null;
	user_agent: string | null;
	response_time_ms: number | null;
	timestamp: number;
}

/**
 * Cached tenant config (stored in KV)
 * Optimized structure for fast routing
 */
export interface TenantConfig {
	tenant: Tenant;
	routes: ProtectedRoute[];
	cached_at: number;
}
