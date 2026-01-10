import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { createProtectedRoute, type ProtectedRouteConfig } from "./auth";
import { generateJWT } from "./jwt";
import type { AppContext, Env } from "./env";
import { extractSubdomain, getTenantConfig, logUsage } from "./db/tenant";
import type { TenantConfig } from "./types/db";
import { tenantsAPI } from "./api/tenants";
import { routesAPI } from "./api/routes";
import { statsAPI } from "./api/stats";

const app = new Hono<AppContext>();

/**
 * Built-in protected paths that always require payment
 * These are used for testing and don't need to be configured
 */
const BUILTIN_PROTECTED_PATHS: ProtectedRouteConfig[] = [
	{
		pattern: "/__x402/protected",
		price: "$0.01",
		description: "Access to test protected endpoint",
	},
];

/**
 * Built-in public paths that don't require payment
 * These are used for testing and don't need to be configured
 */
const BUILT_IN_PUBLIC_PATHS = ["/__x402/health", "/__x402/config"];

/**
 * Proxy a request to the origin server.
 *
 * In multi-tenant mode, uses the tenant's configuration to determine routing.
 * Falls back to env vars for single-tenant/dev mode.
 *
 * Three modes:
 * 1. Service Binding (ORIGIN_SERVICE bound): Calls the bound Worker directly.
 *    Best for Worker-to-Worker communication within the same account.
 *    No network hop, faster than URL-based approaches.
 *
 * 2. External Origin (ORIGIN_URL set): Rewrites the URL to the specified origin
 *    while preserving the original Host header. This allows proxying to another
 *    Worker on a Custom Domain or any external service.
 *
 * 3. DNS-based (default): Uses fetch(request) which routes to the origin server
 *    defined in your DNS records. Best for traditional backends.
 */
async function proxyToOrigin(
	request: Request,
	env: Env,
	tenantConfig?: TenantConfig | null,
): Promise<Response> {
	// Service Binding: call the bound Worker directly (highest priority)
	// In multi-tenant mode, check tenant's origin_service first
	const serviceBinding =
		(tenantConfig?.tenant.origin_service &&
			env[tenantConfig.tenant.origin_service as keyof Env]) ||
		env.ORIGIN_SERVICE;

	if (serviceBinding && typeof serviceBinding === "object" && "fetch" in serviceBinding) {
		return (serviceBinding as Fetcher).fetch(request);
	}

	// External Origin mode: use tenant's origin_url or env ORIGIN_URL
	const originUrl = tenantConfig?.tenant.origin_url || env.ORIGIN_URL;

	if (originUrl) {
		// External Origin mode: rewrite URL to target origin
		const originalUrl = new URL(request.url);
		const targetUrl = new URL(originUrl);

		const proxiedUrl = new URL(request.url);
		proxiedUrl.hostname = targetUrl.hostname;
		proxiedUrl.protocol = targetUrl.protocol;
		proxiedUrl.port = targetUrl.port;

		const response = await fetch(proxiedUrl, {
			method: request.method,
			headers: request.headers, // Preserves original Host header
			body: request.body,
			redirect: "manual", // Handle redirects ourselves to rewrite Location headers
		});

		// Rewrite Location header in redirects to keep user on the proxy domain
		// We rewrite ALL redirects to stay on the proxy, regardless of where the origin
		// tries to send the user (e.g., cloudflare.com -> www.cloudflare.com)
		const location = response.headers.get("Location");
		if (location) {
			try {
				const locationUrl = new URL(location, proxiedUrl);

				// Rewrite the location to point back to the proxy
				locationUrl.hostname = originalUrl.hostname;
				locationUrl.protocol = originalUrl.protocol;
				locationUrl.port = originalUrl.port;

				const newHeaders = new Headers(response.headers);
				newHeaders.set("Location", locationUrl.toString());

				return new Response(response.body, {
					status: response.status,
					statusText: response.statusText,
					headers: newHeaders,
				});
			} catch {
				// If URL parsing fails, return response as-is
			}
		}

		return response;
	}

	// DNS-based mode: forward request as-is to origin defined in DNS
	return fetch(request);
}

/**
 * Check if a path matches a route pattern
 * Supports exact matches and prefix matches with /* wildcard
 */
function pathMatchesPattern(path: string, pattern: string): boolean {
	if (pattern.endsWith("/*")) {
		return path.startsWith(pattern.slice(0, -2));
	}
	return path === pattern;
}

/**
 * Helper to find the protected route config for a given path
 * Includes both built-in protected routes and configured patterns
 */
function findProtectedRouteConfig(
	path: string,
	patterns: ProtectedRouteConfig[]
): ProtectedRouteConfig | null {
	// Check built-in protected routes first, then configured patterns
	const allRoutes = [...BUILTIN_PROTECTED_PATHS, ...patterns];
	return (
		allRoutes.find((config) => pathMatchesPattern(path, config.pattern)) ?? null
	);
}

/**
 * Main proxy handler - intercepts protected routes, proxies everything else
 * Supports multi-tenant routing by subdomain when DB/KV bindings are present.
 * Falls back to single-tenant mode (env vars) for local development.
 *
 * Note: This middleware runs for all routes, but route handlers below can still
 * take precedence by being registered after this middleware
 */
app.use("*", async (c, next) => {
	const path = c.req.path;
	const hostname = new URL(c.req.url).hostname;
	const startTime = Date.now();

	// Extract subdomain for multi-tenant routing
	const subdomain = extractSubdomain(hostname);
	let tenantConfig: TenantConfig | null = null;
	let protectedPatterns: ProtectedRouteConfig[] = [];
	let jwtSecret: string | undefined;

	// Multi-tenant mode: load config from D1/KV
	if (subdomain && c.env.DB && c.env.TENANT_CACHE) {
		tenantConfig = await getTenantConfig(subdomain, c.env);

		if (!tenantConfig) {
			return c.json({ error: `Tenant not found: ${subdomain}` }, 404);
		}

		// Map database routes to ProtectedRouteConfig format
		protectedPatterns = tenantConfig.routes.map((r) => ({
			pattern: r.pattern,
			price: r.price_usd,
			description: r.description || undefined,
		}));

		jwtSecret = tenantConfig.tenant.jwt_secret;

		// Override env vars with tenant-specific config for x402 middleware
		// TypeScript sees these as readonly but at runtime we can override them
		// for the scope of this request
		(c.env as any).PAY_TO = tenantConfig.tenant.wallet_address;
		(c.env as any).NETWORK = tenantConfig.tenant.network;
		if (tenantConfig.tenant.facilitator_url) {
			(c.env as any).FACILITATOR_URL = tenantConfig.tenant.facilitator_url;
		}
	} else {
		// Single-tenant mode: use env vars (local dev or legacy deployment)
		protectedPatterns = c.env.PROTECTED_PATTERNS || [];
		jwtSecret = c.env.JWT_SECRET;
	}

	// Special handling for built-in endpoints
	// These are handled by route handlers below, not proxied
	if (BUILT_IN_PUBLIC_PATHS.includes(path)) {
		return next(); // Let the route handler below handle it
	}

	// Check if this path is protected (including /__x402/protected)
	const protectedConfig = findProtectedRouteConfig(path, protectedPatterns);
	if (protectedConfig) {
		// Ensure JWT_SECRET is configured before processing protected routes
		if (!jwtSecret) {
			return c.json(
				{
					error:
						"Server misconfigured: JWT_SECRET not set. See README for setup instructions.",
				},
				500
			);
		}

		// Use the protected route middleware
		const protectedMiddleware = createProtectedRoute(protectedConfig);
		let jwtToken = "";

		const result = await protectedMiddleware(c, async () => {
			// After successful auth, check if we need to issue a cookie
			const hasExistingAuth = c.get("auth");

			if (!hasExistingAuth) {
				// This is a new payment - generate JWT cookie
				// Note: This runs after payment verification but BEFORE settlement.
				// We'll check if settlement succeeded before actually using the token.
				jwtToken = await generateJWT(jwtSecret, 3600);
			}

			// Do nothing here - we'll proxy after middleware returns
		});

		// If middleware returned a response (e.g., 402), return it
		if (result) {
			return result;
		}

		// Check if the payment middleware set an error response (e.g., settlement failed)
		// The x402-hono middleware sets c.res to a 402 if settlement fails, even though
		// it doesn't return a Response object. We must check c.res status and discard
		// the JWT token if payment didn't fully complete.
		if (c.res && c.res.status >= 400) {
			// Payment verification succeeded but settlement failed - don't grant access
			return c.res;
		}

		if (path === "/__x402/protected") {
			// If we generated a JWT token, set the cookie BEFORE calling next()
			// so it's included in the response that Hono builds
			if (jwtToken) {
				setCookie(c, "auth_token", jwtToken, {
					httpOnly: true,
					secure: true,
					sameSite: "Strict",
					maxAge: 3600,
					path: "/",
				});
			}

			await next();
			return c.res;
		}

		// Proxy the authenticated request to origin
		const originResponse = await proxyToOrigin(c.req.raw, c.env, tenantConfig);

		// Log usage if in multi-tenant mode
		if (tenantConfig && c.env.DB) {
			const responseTime = Date.now() - startTime;
			const routeMatch = tenantConfig.routes.find((r) =>
				pathMatchesPattern(path, r.pattern),
			);

			// Fire and forget - don't block response
			c.executionCtx.waitUntil(
				logUsage(
					{
						tenant_id: tenantConfig.tenant.id,
						route_id: routeMatch?.id || null,
						path,
						method: c.req.method,
						status_code: originResponse.status,
						payment_verified: jwtToken ? 1 : 0, // 1 if new payment, 0 if cached cookie
						client_ip: c.req.header("CF-Connecting-IP") || null,
						user_agent: c.req.header("User-Agent") || null,
						response_time_ms: responseTime,
					},
					c.env,
				),
			);
		}

		// If we generated a JWT token, add it as a cookie to the response
		if (jwtToken) {
			// Use Hono's setCookie to generate the proper Set-Cookie header
			setCookie(c, "auth_token", jwtToken, {
				httpOnly: true,
				secure: true,
				sameSite: "Strict",
				maxAge: 3600,
				path: "/",
			});

			// Clone the origin response and add our cookie header
			const newResponse = new Response(originResponse.body, {
				status: originResponse.status,
				statusText: originResponse.statusText,
				headers: new Headers(originResponse.headers),
			});

			// Copy Set-Cookie headers from Hono context to our response
			// Use getSetCookie() to properly handle multiple Set-Cookie headers
			const setCookieHeaders = c.res.headers.getSetCookie();
			for (const cookie of setCookieHeaders) {
				newResponse.headers.append("Set-Cookie", cookie);
			}

			return newResponse;
		}

		// Otherwise, return origin response as-is
		return originResponse;
	}

	// Proxy unprotected routes directly to origin
	const originResponse = await proxyToOrigin(c.req.raw, c.env, tenantConfig);

	// Log usage for unprotected routes too (if multi-tenant)
	if (tenantConfig && c.env.DB) {
		const responseTime = Date.now() - startTime;

		c.executionCtx.waitUntil(
			logUsage(
				{
					tenant_id: tenantConfig.tenant.id,
					route_id: null, // Unprotected route
					path,
					method: c.req.method,
					status_code: originResponse.status,
					payment_verified: 0, // No payment needed
					client_ip: c.req.header("CF-Connecting-IP") || null,
					user_agent: c.req.header("User-Agent") || null,
					response_time_ms: responseTime,
				},
				c.env,
			),
		);
	}

	return originResponse;
});

/**
 * Built-in test endpoint - always public, never requires payment
 * Used for health checks and testing proxy functionality
 */
app.get("/__x402/health", (c) => {
	return c.json({
		status: "ok",
		proxy: "x402-proxy",
		message: "This endpoint is always public",
		timestamp: Date.now(),
	});
});

/**
 * Config status endpoint - shows current configuration (no secrets exposed)
 * Useful for debugging and verifying deployment
 */
app.get("/__x402/config", (c) => {
	return c.json({
		network: c.env.NETWORK,
		payTo: c.env.PAY_TO ? `***${c.env.PAY_TO.slice(-6)}` : null,
		hasOriginUrl: !!c.env.ORIGIN_URL,
		hasOriginService: !!c.env.ORIGIN_SERVICE,
		protectedPatterns: c.env.PROTECTED_PATTERNS?.map((p) => p.pattern) || [],
	});
});

/**
 * Built-in test endpoint - always protected, always requires payment
 * Used for testing payment flow without needing to configure protected patterns
 * This endpoint serves content directly (not proxied to origin)
 */
app.get("/__x402/protected", (c) => {
	return c.json({
		message: "Premium content accessed!",
		timestamp: Date.now(),
		note: "This endpoint always requires payment or valid authentication cookie",
	});
});

/**
 * Platform API Routes - For managing tenants, routes, and stats
 */
app.route("/api/tenants", tenantsAPI);
app.route("/api/routes", routesAPI);
app.route("/api/stats", statsAPI);

export default app;
