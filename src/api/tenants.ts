import { Hono } from 'hono';
import { Env } from '../env';

const tenantsAPI = new Hono<{ Bindings: Env }>();

// GET /api/tenants - List all tenants
tenantsAPI.get('/', async (c) => {
	const db = c.env.DB;
	
	try {
		const stmt = db.prepare('SELECT * FROM tenants WHERE status = "active" ORDER BY created_at DESC');
		const tenants = await stmt.all();
		
		return c.json({
			success: true,
			data: tenants.results || [],
		});
	} catch (error) {
		console.error('Error fetching tenants:', error);
		return c.json({ success: false, error: 'Failed to fetch tenants' }, 500);
	}
});

// GET /api/tenants/:id - Get tenant details
tenantsAPI.get('/:id', async (c) => {
	const db = c.env.DB;
	const tenantId = c.req.param('id');
	
	try {
		const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ?').bind(tenantId).first();
		
		if (!tenant) {
			return c.json({ success: false, error: 'Tenant not found' }, 404);
		}

		// Get routes for this tenant
		const routes = await db.prepare('SELECT * FROM protected_routes WHERE tenant_id = ? ORDER BY created_at DESC').bind(tenantId).all();
		
		// Get stats
		const stats = await db.prepare(`
			SELECT 
				COUNT(*) as total_requests,
				SUM(CASE WHEN payment_verified = 1 THEN 1 ELSE 0 END) as paid_requests,
				SUM(response_time_ms) as total_response_time
			FROM usage_logs
			WHERE tenant_id = ?
		`).bind(tenantId).first();
		
		return c.json({
			success: true,
			data: {
				...tenant,
				routes: routes.results || [],
				stats: stats || { total_requests: 0, paid_requests: 0, total_response_time: 0 },
			},
		});
	} catch (error) {
		console.error('Error fetching tenant:', error);
		return c.json({ success: false, error: 'Failed to fetch tenant' }, 500);
	}
});

// POST /api/tenants - Create new tenant
tenantsAPI.post('/', async (c) => {
	const db = c.env.DB;
	const body = await c.req.json();
	
	console.log('Creating tenant with data:', body);
	
	const { subdomain, name, wallet_address, network, origin_url, origin_service, jwt_secret } = body;
	
	if (!subdomain || !name || !wallet_address) {
		return c.json({ success: false, error: 'Missing required fields: subdomain, name, wallet_address' }, 400);
	}

	try {
		// Generate JWT secret if not provided
		const secret = jwt_secret || Array.from(crypto.getRandomValues(new Uint8Array(32)))
			.map(x => x.toString(16).padStart(2, '0'))
			.join('');

		// Generate tenant ID from subdomain (or use UUID)
		const tenantId = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '-');

		console.log('About to insert tenant:', {
			id: tenantId,
			subdomain,
			name,
			wallet_address,
			network: network || 'base-sepolia',
			origin_url: origin_url || null,
			origin_service: origin_service || null,
		});

		const stmt = db.prepare(`
			INSERT INTO tenants (id, subdomain, name, wallet_address, network, origin_url, origin_service, jwt_secret, status, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
		`);
		
		const now = Math.floor(Date.now() / 1000);
		const result = await stmt.bind(
			tenantId,
			subdomain,
			name,
			wallet_address,
			network || 'base-sepolia',
			origin_url || null,
			origin_service || null,
			secret,
			now,
			now
		).run();
		
		console.log('Tenant created successfully:', result.meta);
		
		// Invalidate cache
		await c.env.TENANT_CACHE.delete(`tenant:${subdomain}`);
		
		return c.json({
			success: true,
			data: {
				id: tenantId,
				subdomain,
				name,
				wallet_address,
				network: network || 'base-sepolia',
				origin_url,
				origin_service,
				jwt_secret: secret,
			},
		}, 201);
	} catch (error: any) {
		console.error('Error creating tenant:', error);
		
		if (error.message?.includes('UNIQUE')) {
			return c.json({ success: false, error: 'Subdomain already exists' }, 409);
		}
		
		// Return more detailed error for debugging
		return c.json({ 
			success: false, 
			error: 'Failed to create tenant',
			details: error.message || 'Unknown error'
		}, 500);
	}
});

// PATCH /api/tenants/:id - Update tenant
tenantsAPI.patch('/:id', async (c) => {
	const db = c.env.DB;
	const tenantId = c.req.param('id');
	const body = await c.req.json();
	
	const { wallet_address, network, origin_url, origin_service } = body;
	
	try {
		const updates: string[] = [];
		const values: any[] = [];
		
		if (wallet_address) {
			updates.push('wallet_address = ?');
			values.push(wallet_address);
		}
		if (network) {
			updates.push('network = ?');
			values.push(network);
		}
		if (origin_url !== undefined) {
			updates.push('origin_url = ?');
			values.push(origin_url);
		}
		if (origin_service !== undefined) {
			updates.push('origin_service = ?');
			values.push(origin_service);
		}
		
		if (updates.length === 0) {
			return c.json({ success: false, error: 'No fields to update' }, 400);
		}
		
		values.push(tenantId);
		
		const stmt = db.prepare(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`);
		await stmt.bind(...values).run();
		
		// Get updated tenant and invalidate cache
		const tenant = await db.prepare('SELECT subdomain FROM tenants WHERE id = ?').bind(tenantId).first();
		if (tenant) {
			await c.env.TENANT_CACHE.delete(`tenant:${tenant.subdomain}`);
		}
		
		return c.json({
			success: true,
			message: 'Tenant updated',
		});
	} catch (error) {
		console.error('Error updating tenant:', error);
		return c.json({ success: false, error: 'Failed to update tenant' }, 500);
	}
});

// DELETE /api/tenants/:id - Deactivate tenant
tenantsAPI.delete('/:id', async (c) => {
	const db = c.env.DB;
	const tenantId = c.req.param('id');
	
	try {
		// Get tenant info for cache invalidation
		const tenant = await db.prepare('SELECT subdomain FROM tenants WHERE id = ?').bind(tenantId).first();
		
		// Deactivate instead of delete
		await db.prepare('UPDATE tenants SET status = "inactive" WHERE id = ?').bind(tenantId).run();
		
		// Invalidate cache
		if (tenant) {
			await c.env.TENANT_CACHE.delete(`tenant:${tenant.subdomain}`);
		}
		
		return c.json({
			success: true,
			message: 'Tenant deactivated',
		});
	} catch (error) {
		console.error('Error deleting tenant:', error);
		return c.json({ success: false, error: 'Failed to delete tenant' }, 500);
	}
});

export { tenantsAPI };
