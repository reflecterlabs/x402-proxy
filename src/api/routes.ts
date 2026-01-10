import { Hono } from 'hono';
import { Env } from '../env';

const routesAPI = new Hono<{ Bindings: Env }>();

// GET /api/routes?tenant_id=... - List routes for a tenant
routesAPI.get('/', async (c) => {
	const db = c.env.DB;
	const tenantId = c.req.query('tenant_id');
	
	if (!tenantId) {
		return c.json({ success: false, error: 'Missing tenant_id query parameter' }, 400);
	}

	try {
		const routes = await db.prepare(`
			SELECT * FROM protected_routes 
			WHERE tenant_id = ? AND enabled = 1 
			ORDER BY created_at DESC
		`).bind(tenantId).all();
		
		return c.json({
			success: true,
			data: routes.results || [],
		});
	} catch (error) {
		console.error('Error fetching routes:', error);
		return c.json({ success: false, error: 'Failed to fetch routes' }, 500);
	}
});

// GET /api/routes/:id - Get route details
routesAPI.get('/:id', async (c) => {
	const db = c.env.DB;
	const routeId = c.req.param('id');
	
	try {
		const route = await db.prepare('SELECT * FROM protected_routes WHERE id = ?').bind(routeId).first();
		
		if (!route) {
			return c.json({ success: false, error: 'Route not found' }, 404);
		}
		
		return c.json({
			success: true,
			data: route,
		});
	} catch (error) {
		console.error('Error fetching route:', error);
		return c.json({ success: false, error: 'Failed to fetch route' }, 500);
	}
});

// POST /api/routes - Create new route
routesAPI.post('/', async (c) => {
	const db = c.env.DB;
	const body = await c.req.json();
	
	const { tenant_id, pattern, price_usd, description } = body;
	
	if (!tenant_id || !pattern || price_usd === undefined) {
		return c.json({ 
			success: false, 
			error: 'Missing required fields: tenant_id, pattern, price_usd' 
		}, 400);
	}

	try {
		const stmt = db.prepare(`
			INSERT INTO protected_routes (tenant_id, pattern, price_usd, description, enabled)
			VALUES (?, ?, ?, ?, 1)
		`);
		
		const result = await stmt.bind(
			tenant_id,
			pattern,
			price_usd,
			description || null
		).run();
		
		// Invalidate tenant cache
		const tenant = await db.prepare('SELECT subdomain FROM tenants WHERE id = ?').bind(tenant_id).first();
		if (tenant) {
			await c.env.TENANT_CACHE.delete(`tenant:${tenant.subdomain}`);
		}
		
		return c.json({
			success: true,
			data: {
				id: result.meta.last_row_id,
				tenant_id,
				pattern,
				price_usd,
				description,
				enabled: 1,
			},
		}, 201);
	} catch (error) {
		console.error('Error creating route:', error);
		return c.json({ success: false, error: 'Failed to create route' }, 500);
	}
});

// PATCH /api/routes/:id - Update route
routesAPI.patch('/:id', async (c) => {
	const db = c.env.DB;
	const routeId = c.req.param('id');
	const body = await c.req.json();
	
	const { pattern, price_usd, description, enabled } = body;
	
	try {
		const updates: string[] = [];
		const values: any[] = [];
		
		if (pattern !== undefined) {
			updates.push('pattern = ?');
			values.push(pattern);
		}
		if (price_usd !== undefined) {
			updates.push('price_usd = ?');
			values.push(price_usd);
		}
		if (description !== undefined) {
			updates.push('description = ?');
			values.push(description);
		}
		if (enabled !== undefined) {
			updates.push('enabled = ?');
			values.push(enabled ? 1 : 0);
		}
		
		if (updates.length === 0) {
			return c.json({ success: false, error: 'No fields to update' }, 400);
		}
		
		values.push(routeId);
		
		const stmt = db.prepare(`UPDATE protected_routes SET ${updates.join(', ')} WHERE id = ?`);
		await stmt.bind(...values).run();
		
		// Get route and invalidate tenant cache
		const route = await db.prepare('SELECT tenant_id FROM protected_routes WHERE id = ?').bind(routeId).first();
		if (route) {
			const tenant = await db.prepare('SELECT subdomain FROM tenants WHERE id = ?').bind(route.tenant_id).first();
			if (tenant) {
				await c.env.TENANT_CACHE.delete(`tenant:${tenant.subdomain}`);
			}
		}
		
		return c.json({
			success: true,
			message: 'Route updated',
		});
	} catch (error) {
		console.error('Error updating route:', error);
		return c.json({ success: false, error: 'Failed to update route' }, 500);
	}
});

// DELETE /api/routes/:id - Disable route
routesAPI.delete('/:id', async (c) => {
	const db = c.env.DB;
	const routeId = c.req.param('id');
	
	try {
		// Disable instead of delete
		const route = await db.prepare('SELECT tenant_id FROM protected_routes WHERE id = ?').bind(routeId).first();
		
		await db.prepare('UPDATE protected_routes SET enabled = 0 WHERE id = ?').bind(routeId).run();
		
		// Invalidate tenant cache
		if (route) {
			const tenant = await db.prepare('SELECT subdomain FROM tenants WHERE id = ?').bind(route.tenant_id).first();
			if (tenant) {
				await c.env.TENANT_CACHE.delete(`tenant:${tenant.subdomain}`);
			}
		}
		
		return c.json({
			success: true,
			message: 'Route disabled',
		});
	} catch (error) {
		console.error('Error deleting route:', error);
		return c.json({ success: false, error: 'Failed to delete route' }, 500);
	}
});

export { routesAPI };
