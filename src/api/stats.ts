import { Hono } from 'hono';
import { Env } from '../env';

const statsAPI = new Hono<{ Bindings: Env }>();

// GET /api/stats?tenant_id=... - Get stats for a tenant
statsAPI.get('/', async (c) => {
	const db = c.env.DB;
	const tenantId = c.req.query('tenant_id');
	
	if (!tenantId) {
		return c.json({ success: false, error: 'Missing tenant_id query parameter' }, 400);
	}

	try {
		// Total stats
		const total = await db.prepare(`
			SELECT 
				COUNT(*) as total_requests,
				SUM(CASE WHEN payment_verified = 1 THEN 1 ELSE 0 END) as paid_requests,
				SUM(CASE WHEN status_code = 200 THEN 1 ELSE 0 END) as successful_requests,
				SUM(CASE WHEN status_code = 402 THEN 1 ELSE 0 END) as payment_required,
				ROUND(AVG(response_time_ms), 2) as avg_response_time,
				MAX(response_time_ms) as max_response_time
			FROM usage_logs
			WHERE tenant_id = ?
		`).bind(tenantId).first();
		
		// Daily stats (last 7 days)
		const daily = await db.prepare(`
			SELECT 
				DATE(requested_at) as date,
				COUNT(*) as requests,
				SUM(CASE WHEN payment_verified = 1 THEN 1 ELSE 0 END) as paid_requests,
				COUNT(DISTINCT client_ip) as unique_clients
			FROM usage_logs
			WHERE tenant_id = ? AND requested_at > datetime('now', '-7 days')
			GROUP BY DATE(requested_at)
			ORDER BY date DESC
		`).bind(tenantId).all();
		
		// Top paths
		const topPaths = await db.prepare(`
			SELECT 
				request_path,
				COUNT(*) as requests,
				SUM(CASE WHEN payment_verified = 1 THEN 1 ELSE 0 END) as paid_requests,
				COUNT(DISTINCT client_ip) as unique_clients
			FROM usage_logs
			WHERE tenant_id = ?
			GROUP BY request_path
			ORDER BY requests DESC
			LIMIT 10
		`).bind(tenantId).all();
		
		// Status code distribution
		const statusCodes = await db.prepare(`
			SELECT 
				status_code,
				COUNT(*) as count
			FROM usage_logs
			WHERE tenant_id = ?
			GROUP BY status_code
			ORDER BY count DESC
		`).bind(tenantId).all();
		
		return c.json({
			success: true,
			data: {
				total: total || {
					total_requests: 0,
					paid_requests: 0,
					successful_requests: 0,
					payment_required: 0,
					avg_response_time: 0,
					max_response_time: 0,
				},
				daily: daily.results || [],
				topPaths: topPaths.results || [],
				statusCodes: statusCodes.results || [],
			},
		});
	} catch (error) {
		console.error('Error fetching stats:', error);
		return c.json({ success: false, error: 'Failed to fetch stats' }, 500);
	}
});

// GET /api/stats/revenue?tenant_id=... - Calculate revenue
statsAPI.get('/revenue', async (c) => {
	const db = c.env.DB;
	const tenantId = c.req.query('tenant_id');
	
	if (!tenantId) {
		return c.json({ success: false, error: 'Missing tenant_id query parameter' }, 400);
	}

	try {
		// Get routes and usage to calculate revenue
		const routes = await db.prepare(`
			SELECT id, pattern, price_usd FROM protected_routes 
			WHERE tenant_id = ? AND enabled = 1
		`).bind(tenantId).all();
		
		let totalRevenue = 0;
		const routeRevenue: any[] = [];
		
		for (const route of (routes.results as any[]) || []) {
			const stats = await db.prepare(`
				SELECT 
					COUNT(*) as total_requests,
					SUM(CASE WHEN payment_verified = 1 THEN 1 ELSE 0 END) as paid_requests
				FROM usage_logs
				WHERE tenant_id = ? AND request_path LIKE ? AND payment_verified = 1
			`).bind(tenantId, `${(route.pattern as string).replace('*', '%')}%`).first();
			
			const paidRequests = (stats?.paid_requests as number) || 0;
			const revenue = paidRequests * (route.price_usd as number);
			totalRevenue += revenue;
			
			routeRevenue.push({
				pattern: route.pattern,
				price_usd: route.price_usd,
				paid_requests: paidRequests,
				revenue: revenue.toFixed(2),
			});
		}
		
		// Daily revenue (last 30 days)
		const dailyRevenue = await db.prepare(`
			SELECT 
				DATE(requested_at) as date,
				COUNT(*) as requests,
				SUM(CASE WHEN payment_verified = 1 THEN 1 ELSE 0 END) as paid_requests
			FROM usage_logs
			WHERE tenant_id = ? AND requested_at > datetime('now', '-30 days') AND payment_verified = 1
			GROUP BY DATE(requested_at)
			ORDER BY date DESC
		`).bind(tenantId).all();
		
		return c.json({
			success: true,
			data: {
				total_revenue: totalRevenue.toFixed(2),
				route_revenue: routeRevenue,
				daily_revenue: dailyRevenue.results || [],
			},
		});
	} catch (error) {
		console.error('Error calculating revenue:', error);
		return c.json({ success: false, error: 'Failed to calculate revenue' }, 500);
	}
});

export { statsAPI };
