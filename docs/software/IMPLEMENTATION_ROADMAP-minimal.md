# Implementation Roadmap - Minimal MVP

**Last Updated:** January 10, 2026  
**Version:** 1.0 - 4-Week MVP Plan

---

## Overview

This roadmap covers the **minimal viable product** to launch x402hub as a managed service for fintech API monetization.

**Timeline:** 4 weeks  
**Team:** 1-2 developers  
**Budget:** ~$100 (domain, hosting, tools)

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                    End Users                            │
│         (Banks, Fintechs consuming data)                │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTPS Request
                 │
┌────────────────▼────────────────────────────────────────┐
│          Multi-Tenant Proxy Worker                      │
│        (Cloudflare Worker - TypeScript)                 │
│                                                          │
│  1. Extract tenant from subdomain                       │
│  2. Load tenant config from D1/KV                       │
│  3. Check x402 payment/cookie                           │
│  4. Proxy to customer's origin API                      │
│  5. Track usage, set cookie                             │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ Proxy Request
                 │
┌────────────────▼────────────────────────────────────────┐
│         Customer's Existing API                         │
│      (Node, Python, Go - any tech stack)                │
│         Returns data (unchanged)                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Dashboard (Next.js)                        │
│        https://dashboard.x402hub.com                    │
│                                                          │
│  - Customer signup/login                                │
│  - Configure origin API                                 │
│  - Add protected endpoints                              │
│  - View analytics                                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Platform API Worker                        │
│        https://api.x402hub.com                          │
│                                                          │
│  - CRUD tenants                                         │
│  - CRUD protected routes                                │
│  - Analytics queries                                    │
│  - Payment verification                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│           Data Layer (Cloudflare)                       │
│                                                          │
│  - D1 (SQLite): Tenants, routes, usage logs            │
│  - KV: Tenant config cache, rate limits                │
└─────────────────────────────────────────────────────────┘
```

---

## Week 1: Core Multi-Tenant Proxy

### Goals
✅ Deploy working proxy that handles x402 payments  
✅ Support multiple tenants via subdomain routing  
✅ Proxy requests to customer origin APIs  
✅ Basic usage tracking  

### Tasks

#### Day 1-2: Database Schema & Setup

**1. Create D1 Database**

```bash
# Create production database
npx wrangler d1 create x402hub-production

# Create development database
npx wrangler d1 create x402hub-dev
```

**2. Define Schema**

```sql
-- schema.sql

-- Tenants (customers using x402hub)
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,              -- "acme-corp"
  subdomain TEXT UNIQUE NOT NULL,   -- "acme-corp"
  email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  
  -- Origin API configuration
  api_endpoint TEXT NOT NULL,       -- "https://api.acme-corp.com"
  
  -- Payment configuration
  wallet_address TEXT NOT NULL,     -- "0x..."
  network TEXT NOT NULL,            -- "base" | "base-sepolia"
  
  -- Plan and status
  plan TEXT NOT NULL DEFAULT 'starter',  -- "starter" | "professional" | "enterprise"
  active INTEGER DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Protected routes for each tenant
CREATE TABLE protected_routes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  
  path TEXT NOT NULL,               -- "/api/credit-score"
  method TEXT NOT NULL DEFAULT 'GET',
  price_usd TEXT NOT NULL,          -- "0.50"
  description TEXT,
  
  -- Rate limiting (optional)
  rate_limit_max INTEGER,           -- 100
  rate_limit_window_seconds INTEGER, -- 3600
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Usage logs (for analytics and billing)
CREATE TABLE usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  
  path TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  
  -- Customer identification
  customer_wallet TEXT,             -- Who paid
  
  -- Timing
  timestamp TIMESTAMP NOT NULL,
  response_time_ms INTEGER,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Indexes for performance
CREATE INDEX idx_tenant_subdomain ON tenants(subdomain);
CREATE INDEX idx_routes_tenant ON protected_routes(tenant_id);
CREATE INDEX idx_usage_tenant_time ON usage_logs(tenant_id, timestamp);
CREATE INDEX idx_usage_customer ON usage_logs(customer_wallet);
```

**3. Apply Schema**

```bash
# Development
npx wrangler d1 execute x402hub-dev --file=schema.sql

# Production (later)
npx wrangler d1 execute x402hub-production --file=schema.sql
```

#### Day 3-4: Multi-Tenant Proxy Worker

**1. Update wrangler.jsonc**

```jsonc
{
  "name": "x402hub-proxy",
  "main": "src/index.ts",
  "compatibility_date": "2024-01-01",
  
  "routes": [
    {
      "pattern": "*.x402hub.com/*",
      "zone_name": "x402hub.com"
    }
  ],
  
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "x402hub-dev",
      "database_id": "YOUR_DATABASE_ID"
    }
  ],
  
  "kv_namespaces": [
    {
      "binding": "TENANT_CONFIG_KV",
      "id": "YOUR_KV_ID"
    },
    {
      "binding": "RATE_LIMIT_KV",
      "id": "YOUR_KV_ID"
    }
  ],
  
  "vars": {
    "ENVIRONMENT": "development"
  }
}
```

**2. Implement Multi-Tenant Router**

```typescript
// src/index.ts
import { x402Middleware } from '@exact-labs/x402-server';
import { Env, Tenant } from './types';
import { getTenantConfig, proxyToOrigin, recordUsage } from './utils';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle health check
    if (url.pathname === '/__x402/health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString() 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Extract subdomain: acme-corp.x402hub.com → "acme-corp"
    const subdomain = url.hostname.split('.')[0];
    
    if (!subdomain || subdomain === 'x402hub') {
      return new Response('Invalid subdomain', { status: 400 });
    }
    
    // Get tenant configuration
    const tenant = await getTenantConfig(subdomain, env);
    
    if (!tenant) {
      return new Response('Tenant not found', { status: 404 });
    }
    
    if (!tenant.active) {
      return new Response('Tenant inactive', { status: 403 });
    }
    
    // Check if route is protected
    const route = tenant.protectedRoutes?.find(r => 
      url.pathname.startsWith(r.path) && request.method === r.method
    );
    
    // Public route - proxy directly
    if (!route) {
      return proxyToOrigin(request, tenant.apiEndpoint, env);
    }
    
    // Protected route - apply x402 middleware
    const startTime = Date.now();
    
    const x402Config = {
      payTo: tenant.walletAddress,
      network: tenant.network as 'base' | 'base-sepolia',
      protectedPatterns: [{
        pattern: route.path,
        price: `$${route.priceUsd}`,
        description: route.description || `Access to ${route.path}`
      }]
    };
    
    // Check payment/cookie
    const x402Response = await x402Middleware(request, env, ctx, x402Config);
    if (x402Response) {
      return x402Response; // 402 Payment Required
    }
    
    // Payment valid - proxy to origin
    const originResponse = await proxyToOrigin(request, tenant.apiEndpoint, env);
    
    // Record usage asynchronously
    const responseTime = Date.now() - startTime;
    ctx.waitUntil(
      recordUsage({
        tenantId: tenant.id,
        path: url.pathname,
        method: request.method,
        statusCode: originResponse.status,
        customerWallet: await getCustomerWallet(request),
        responseTimeMs: responseTime
      }, env)
    );
    
    return originResponse;
  }
};

async function getCustomerWallet(request: Request): Promise<string | null> {
  // Extract wallet from JWT cookie if present
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  
  try {
    const token = cookie.split('auth_token=')[1]?.split(';')[0];
    if (!token) return null;
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub; // Wallet address
  } catch {
    return null;
  }
}
```

**3. Implement Utilities**

```typescript
// src/utils/tenant.ts
import { Env, Tenant } from '../types';

export async function getTenantConfig(
  subdomain: string, 
  env: Env
): Promise<Tenant | null> {
  // Try KV cache first (fast)
  const cacheKey = `tenant:${subdomain}`;
  const cached = await env.TENANT_CONFIG_KV?.get(cacheKey, 'json');
  
  if (cached) {
    return cached as Tenant;
  }
  
  // Query D1 (slower, but authoritative)
  const result = await env.DB?.prepare(`
    SELECT 
      t.*,
      json_group_array(
        json_object(
          'id', r.id,
          'path', r.path,
          'method', r.method,
          'priceUsd', r.price_usd,
          'description', r.description
        )
      ) as routes
    FROM tenants t
    LEFT JOIN protected_routes r ON t.id = r.tenant_id
    WHERE t.subdomain = ? AND t.active = 1
    GROUP BY t.id
  `).bind(subdomain).first();
  
  if (!result) {
    return null;
  }
  
  const tenant: Tenant = {
    id: result.id as string,
    subdomain: result.subdomain as string,
    email: result.email as string,
    companyName: result.company_name as string,
    apiEndpoint: result.api_endpoint as string,
    walletAddress: result.wallet_address as string,
    network: result.network as 'base' | 'base-sepolia',
    plan: result.plan as string,
    active: result.active === 1,
    protectedRoutes: JSON.parse(result.routes as string)
  };
  
  // Cache for 5 minutes
  await env.TENANT_CONFIG_KV?.put(
    cacheKey, 
    JSON.stringify(tenant),
    { expirationTtl: 300 }
  );
  
  return tenant;
}

export async function proxyToOrigin(
  request: Request,
  originEndpoint: string,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  
  // Rewrite URL: acme.x402hub.com/api/score → api.acme.com/api/score
  const originUrl = new URL(url.pathname + url.search, originEndpoint);
  
  // Create new request with original headers
  const originRequest = new Request(originUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
  
  // Call origin API
  try {
    const response = await fetch(originRequest);
    return response;
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Origin API error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function recordUsage(
  data: {
    tenantId: string;
    path: string;
    method: string;
    statusCode: number;
    customerWallet: string | null;
    responseTimeMs: number;
  },
  env: Env
): Promise<void> {
  await env.DB?.prepare(`
    INSERT INTO usage_logs 
    (tenant_id, path, method, status_code, customer_wallet, timestamp, response_time_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.tenantId,
    data.path,
    data.method,
    data.statusCode,
    data.customerWallet,
    new Date().toISOString(),
    data.responseTimeMs
  ).run();
}
```

#### Day 5: Testing & Deployment

**1. Local Testing**

```bash
# Start dev server
npm run dev

# Create test tenant in D1
npx wrangler d1 execute x402hub-dev --command="
INSERT INTO tenants (id, subdomain, email, company_name, api_endpoint, wallet_address, network)
VALUES (
  'test-corp',
  'test-corp',
  'test@example.com',
  'Test Corp',
  'https://jsonplaceholder.typicode.com',
  '0x000000000000000000000000000000000000dEaD',
  'base-sepolia'
);

INSERT INTO protected_routes (id, tenant_id, path, method, price_usd, description)
VALUES (
  'route-1',
  'test-corp',
  '/posts',
  'GET',
  '0.10',
  'Get posts'
);
"

# Test public route
curl http://test-corp.localhost:8787/users

# Test protected route (should return 402)
curl http://test-corp.localhost:8787/posts
```

**2. Deploy to Production**

```bash
# Deploy proxy worker
npx wrangler deploy

# Update DNS
# Add CNAME: *.x402hub.com → x402hub-proxy.workers.dev
```

**Week 1 Deliverables:**
- ✅ Multi-tenant proxy working
- ✅ x402 payment verification
- ✅ Proxy to origin APIs
- ✅ Usage tracking in D1
- ✅ Deployed to production

---

## Week 2: Dashboard

### Goals
✅ Customer signup/login  
✅ Configure origin API  
✅ Add/edit/delete protected routes  
✅ View basic analytics  

### Tasks

#### Day 1-2: Next.js Setup & Authentication

**1. Create Next.js Project**

```bash
# Create new Next.js app
npx create-next-app@latest x402hub-dashboard --typescript --tailwind --app

cd x402hub-dashboard

# Install dependencies
npm install @clerk/nextjs  # Authentication
npm install @tanstack/react-query  # Data fetching
npm install recharts  # Charts
npm install zod  # Validation
```

**2. Setup Clerk Authentication**

```typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}

// app/dashboard/layout.tsx
import { auth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = auth()
  
  if (!userId) {
    redirect('/sign-in')
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar + Main content */}
      {children}
    </div>
  )
}
```

#### Day 3-4: Tenant Management UI

**1. Onboarding Flow**

```typescript
// app/onboarding/page.tsx
'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const { user } = useUser()
  const router = useRouter()
  const [formData, setFormData] = useState({
    companyName: '',
    subdomain: '',
    apiEndpoint: '',
    walletAddress: ''
  })
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Call Platform API to create tenant
    const response = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user?.primaryEmailAddress?.emailAddress,
        ...formData
      })
    })
    
    if (response.ok) {
      router.push('/dashboard')
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Setup Your Account</h1>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Company Name
          </label>
          <input
            type="text"
            value={formData.companyName}
            onChange={e => setFormData({...formData, companyName: e.target.value})}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Subdomain
          </label>
          <div className="flex items-center">
            <input
              type="text"
              value={formData.subdomain}
              onChange={e => setFormData({...formData, subdomain: e.target.value})}
              className="flex-1 px-4 py-2 border rounded-l-lg"
              pattern="[a-z0-9-]+"
              required
            />
            <span className="px-4 py-2 bg-gray-100 border border-l-0 rounded-r-lg">
              .x402hub.com
            </span>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Your API Endpoint
          </label>
          <input
            type="url"
            value={formData.apiEndpoint}
            onChange={e => setFormData({...formData, apiEndpoint: e.target.value})}
            placeholder="https://api.yourcompany.com"
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Wallet Address (to receive payments)
          </label>
          <input
            type="text"
            value={formData.walletAddress}
            onChange={e => setFormData({...formData, walletAddress: e.target.value})}
            placeholder="0x..."
            pattern="0x[a-fA-F0-9]{40}"
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          Create Account
        </button>
      </div>
    </form>
  )
}
```

**2. Dashboard Overview**

```typescript
// app/dashboard/page.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

export default function DashboardPage() {
  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await fetch('/api/analytics')
      return res.json()
    }
  })
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Requests Today"
          value={analytics?.requestsToday || 0}
          change="+12%"
        />
        <StatCard
          title="Revenue Today"
          value={`$${(analytics?.revenueToday || 0).toFixed(2)}`}
          change="+23%"
        />
        <StatCard
          title="Active Customers"
          value={analytics?.activeCustomers || 0}
          change="+5"
        />
        <StatCard
          title="Success Rate"
          value={`${analytics?.successRate || 0}%`}
          change="+2%"
        />
      </div>
      
      {/* Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Requests Over Time</h2>
        <BarChart width={800} height={300} data={analytics?.timeline || []}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="requests" fill="#3b82f6" />
        </BarChart>
      </div>
    </div>
  )
}

function StatCard({ title, value, change }: { title: string; value: string | number; change: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <p className="text-gray-600 text-sm mb-2">{title}</p>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-green-600 text-sm">{change} vs yesterday</p>
    </div>
  )
}
```

**3. Endpoints Management**

```typescript
// app/dashboard/endpoints/page.tsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export default function EndpointsPage() {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  
  const { data: routes } = useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await fetch('/api/routes')
      return res.json()
    }
  })
  
  const addRoute = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
      setIsAdding(false)
    }
  })
  
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Protected Endpoints</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Endpoint
        </button>
      </div>
      
      {/* Routes List */}
      <div className="space-y-4">
        {routes?.map((route: any) => (
          <div key={route.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-lg font-bold">{route.method} {route.path}</p>
                <p className="text-gray-600 mt-1">{route.description}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Price: ${route.priceUsd} USD | 
                  Requests today: {route.requestsToday} | 
                  Revenue: ${route.revenueToday}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="text-blue-600 hover:underline">Edit</button>
                <button className="text-red-600 hover:underline">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Add Route Modal */}
      {isAdding && (
        <AddRouteModal
          onClose={() => setIsAdding(false)}
          onSubmit={(data) => addRoute.mutate(data)}
        />
      )}
    </div>
  )
}

function AddRouteModal({ onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({
    path: '/api/',
    method: 'GET',
    priceUsd: '0.50',
    description: ''
  })
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6">Add Protected Endpoint</h2>
        
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData) }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Path</label>
              <input
                type="text"
                value={formData.path}
                onChange={e => setFormData({...formData, path: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="/api/credit-score"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Method</label>
              <select
                value={formData.method}
                onChange={e => setFormData({...formData, method: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Price (USD)</label>
              <input
                type="number"
                step="0.01"
                value={formData.priceUsd}
                onChange={e => setFormData({...formData, priceUsd: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Endpoint
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

#### Day 5: Platform API Routes

```typescript
// app/api/tenants/route.ts
import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const body = await request.json()
  
  // Call Platform API Worker to create tenant
  const response = await fetch('https://api.x402hub.com/v1/tenants', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Clerk-User-Id': userId
    },
    body: JSON.stringify(body)
  })
  
  const data = await response.json()
  return NextResponse.json(data)
}

// app/api/routes/route.ts
export async function GET(request: Request) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Get tenant ID from user
  const tenantId = await getTenantIdFromUser(userId)
  
  const response = await fetch(`https://api.x402hub.com/v1/tenants/${tenantId}/routes`)
  const data = await response.json()
  
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const tenantId = await getTenantIdFromUser(userId)
  const body = await request.json()
  
  const response = await fetch(`https://api.x402hub.com/v1/tenants/${tenantId}/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  
  const data = await response.json()
  return NextResponse.json(data)
}
```

**Week 2 Deliverables:**
- ✅ Working dashboard deployed
- ✅ Signup/onboarding flow
- ✅ Endpoints management UI
- ✅ Basic analytics display
- ✅ Integration with Platform API

---

## Week 3: Platform API & Testing

### Goals
✅ Create Platform API Worker  
✅ Implement CRUD endpoints  
✅ End-to-end testing  
✅ Documentation  

### Tasks

#### Day 1-2: Platform API Worker

```typescript
// platform-api/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

const app = new Hono()

app.use('/*', cors())

// Create tenant
app.post('/v1/tenants', async (c) => {
  const schema = z.object({
    email: z.string().email(),
    companyName: z.string(),
    subdomain: z.string().regex(/^[a-z0-9-]+$/),
    apiEndpoint: z.string().url(),
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/)
  })
  
  const body = schema.parse(await c.req.json())
  
  // Insert into D1
  const result = await c.env.DB.prepare(`
    INSERT INTO tenants (id, subdomain, email, company_name, api_endpoint, wallet_address, network)
    VALUES (?, ?, ?, ?, ?, ?, 'base-sepolia')
  `).bind(
    body.subdomain,
    body.subdomain,
    body.email,
    body.companyName,
    body.apiEndpoint,
    body.walletAddress
  ).run()
  
  return c.json({
    tenantId: body.subdomain,
    subdomain: `${body.subdomain}.x402hub.com`,
    apiEndpoint: body.apiEndpoint
  })
})

// Get tenant routes
app.get('/v1/tenants/:tenantId/routes', async (c) => {
  const tenantId = c.req.param('tenantId')
  
  const routes = await c.env.DB.prepare(`
    SELECT * FROM protected_routes WHERE tenant_id = ?
  `).bind(tenantId).all()
  
  return c.json(routes.results)
})

// Add route
app.post('/v1/tenants/:tenantId/routes', async (c) => {
  const tenantId = c.req.param('tenantId')
  
  const schema = z.object({
    path: z.string(),
    method: z.string(),
    priceUsd: z.string(),
    description: z.string().optional()
  })
  
  const body = schema.parse(await c.req.json())
  
  const id = `route-${Date.now()}`
  
  await c.env.DB.prepare(`
    INSERT INTO protected_routes (id, tenant_id, path, method, price_usd, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    tenantId,
    body.path,
    body.method,
    body.priceUsd,
    body.description
  ).run()
  
  return c.json({ id, ...body })
})

// Analytics
app.get('/v1/tenants/:tenantId/analytics', async (c) => {
  const tenantId = c.req.param('tenantId')
  
  const today = new Date().toISOString().split('T')[0]
  
  const stats = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as requests_today,
      COUNT(DISTINCT customer_wallet) as active_customers,
      AVG(response_time_ms) as avg_response_time
    FROM usage_logs
    WHERE tenant_id = ?
      AND DATE(timestamp) = ?
  `).bind(tenantId, today).first()
  
  return c.json(stats)
})

export default app
```

#### Day 3-4: End-to-End Testing

**1. Integration Test**

```typescript
// test/integration.test.ts
import { describe, it, expect, beforeAll } from 'vitest'

describe('x402hub Integration Tests', () => {
  let tenantId: string
  let apiEndpoint: string
  
  beforeAll(async () => {
    // Create test tenant via Platform API
    const response = await fetch('https://api.x402hub.com/v1/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        companyName: 'Test Corp',
        subdomain: 'test-integration',
        apiEndpoint: 'https://jsonplaceholder.typicode.com',
        walletAddress: '0x000000000000000000000000000000000000dEaD'
      })
    })
    
    const data = await response.json()
    tenantId = data.tenantId
    apiEndpoint = `https://${data.subdomain}`
  })
  
  it('should proxy public routes without payment', async () => {
    const response = await fetch(`${apiEndpoint}/users`)
    expect(response.status).toBe(200)
  })
  
  it('should return 402 for protected routes without payment', async () => {
    // Add protected route
    await fetch(`https://api.x402hub.com/v1/tenants/${tenantId}/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: '/posts',
        method: 'GET',
        priceUsd: '0.10',
        description: 'Test endpoint'
      })
    })
    
    // Request without payment
    const response = await fetch(`${apiEndpoint}/posts`)
    expect(response.status).toBe(402)
    
    const body = await response.json()
    expect(body).toHaveProperty('amount')
    expect(body).toHaveProperty('payTo')
  })
  
  it('should allow access after valid payment', async () => {
    // TODO: Implement payment flow test with Base Sepolia testnet
  })
})
```

#### Day 5: Documentation

**1. API Documentation**

```markdown
# x402hub API Documentation

## For Customers (Fintechs Using x402hub)

### Platform API

Base URL: `https://api.x402hub.com/v1`

#### Create Tenant

POST /tenants

```json
{
  "email": "dev@acme.com",
  "companyName": "Acme Corp",
  "subdomain": "acme-corp",
  "apiEndpoint": "https://api.acme.com",
  "walletAddress": "0x..."
}
```

Response:
```json
{
  "tenantId": "acme-corp",
  "subdomain": "acme-corp.x402hub.com"
}
```

#### Add Protected Route

POST /tenants/:tenantId/routes

```json
{
  "path": "/api/credit-score",
  "method": "GET",
  "priceUsd": "0.50",
  "description": "Credit score lookup"
}
```

## For End Users (Consuming APIs)

### Payment Flow

1. Request protected endpoint without payment:
```bash
curl https://acme-corp.x402hub.com/api/credit-score?rfc=RFC123
```

2. Receive 402 Payment Required:
```json
{
  "amount": "500000",
  "currency": "USDC",
  "network": "base",
  "payTo": "0x...",
  "resource": "https://acme-corp.x402hub.com/api/credit-score?rfc=RFC123"
}
```

3. Make payment and include in X-PAYMENT header
4. Receive data + auth cookie (valid 1 hour)
5. Subsequent requests use cookie (no additional payment)
```

**Week 3 Deliverables:**
- ✅ Platform API deployed
- ✅ CRUD endpoints working
- ✅ Integration tests passing
- ✅ API documentation published

---

## Week 4: Launch Preparation

### Goals
✅ Landing page  
✅ Polish dashboard  
✅ First customer onboarding  
✅ Monitoring setup  

### Tasks

#### Day 1-2: Landing Page

```typescript
// landing/app/page.tsx
export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-20 px-4 text-center">
        <h1 className="text-6xl font-bold mb-6">
          Stripe for Data APIs
        </h1>
        <p className="text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Add pay-per-query to your API in 5 minutes.
          Get paid in USDC. No code changes needed.
        </p>
        <button className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-700">
          Get Started Free
        </button>
      </section>
      
      {/* Features */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon="⚡"
            title="5-Minute Setup"
            description="Configure your API endpoint, add protected routes, start earning. No complex integration."
          />
          <FeatureCard
            icon="💰"
            title="Pay-Per-Query"
            description="Your customers pay only for what they use. No annual contracts. Perfect for occasional access."
          />
          <FeatureCard
            icon="🔒"
            title="Crypto Payments"
            description="Receive USDC directly to your wallet. Instant settlement. Low fees."
          />
        </div>
      </section>
      
      {/* Pricing */}
      <section className="py-20 px-4">
        <h2 className="text-4xl font-bold text-center mb-12">Simple Pricing</h2>
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          <PricingCard
            name="Starter"
            price="$199/month"
            features={[
              '50,000 requests/month',
              '3% commission',
              'Basic analytics',
              'Email support'
            ]}
          />
          <PricingCard
            name="Professional"
            price="$499/month"
            features={[
              '500,000 requests/month',
              '2% commission',
              'Advanced analytics',
              'Custom domain',
              'Priority support'
            ]}
            highlighted
          />
        </div>
      </section>
    </div>
  )
}
```

#### Day 3: Monitoring & Observability

```typescript
// Add Sentry for error tracking
npm install @sentry/nextjs @sentry/node

// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});

// Add metrics to proxy worker
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const startTime = Date.now()
    
    try {
      const response = await handleRequest(request, env, ctx)
      
      // Log metrics
      ctx.waitUntil(logMetrics({
        duration: Date.now() - startTime,
        status: response.status,
        path: new URL(request.url).pathname
      }, env))
      
      return response
    } catch (error) {
      // Log error
      console.error('Proxy error:', error)
      
      return new Response('Internal Server Error', { status: 500 })
    }
  }
}
```

#### Day 4-5: First Customer Onboarding

**1. Prepare Onboarding Materials**
- Setup guide video (2-3 minutes)
- Integration checklist
- Example code snippets
- FAQ document

**2. Outreach Script**

```
Subject: Launch week special - Free access to x402hub

Hi [Name],

I'm launching x402hub this week - it adds pay-per-query 
payments to your API in 5 minutes.

Perfect if you have:
- Credit scoring API
- Fraud detection model
- KYC/verification service
- Any data API you want to monetize

Setup: Configure your endpoint, set prices, done.
Payments: USDC directly to your wallet
Fee: First 3 months free for launch customers

Want a demo? I can set it up for you in our next call.

Best,
[Your name]
```

**3. Onboarding Checklist**

```markdown
## Customer Onboarding Checklist

- [ ] Intro call (30 min)
  - [ ] Understand their API
  - [ ] Explain x402 payment flow
  - [ ] Set expectations

- [ ] Technical setup (1 hour)
  - [ ] Create account
  - [ ] Configure subdomain
  - [ ] Add 1-2 test endpoints
  - [ ] Test payment flow on testnet

- [ ] Go live (30 min)
  - [ ] Switch to Base mainnet
  - [ ] Update wallet address
  - [ ] Share endpoint with their customers
  - [ ] Monitor first transactions

- [ ] Follow-up (1 week later)
  - [ ] Check usage
  - [ ] Gather feedback
  - [ ] Identify improvements
```

**Week 4 Deliverables:**
- ✅ Landing page live
- ✅ Monitoring setup (Sentry)
- ✅ Onboarding materials ready
- ✅ First paying customer live

---

## Post-MVP: Continuous Improvement

### Month 2: Iteration Based on Feedback

**Priority improvements from customer feedback:**

1. **Analytics Enhancements**
   - Revenue breakdown by endpoint
   - Customer cohort analysis
   - Export data to CSV

2. **Developer Experience**
   - JavaScript SDK for end users
   - Python SDK for end users
   - Postman collection

3. **Operational**
   - Email notifications for new customers
   - Slack alerts for errors
   - Automated billing

### Month 3: Feature Expansion

**Based on customer requests:**

1. **Custom Domains** (if requested)
   - Allow `api.customer.com` instead of `customer.x402hub.com`

2. **Advanced Rate Limiting**
   - Different limits per customer tier
   - Burst allowances

3. **Webhook Notifications**
   - Notify customer when payment received
   - Daily usage summaries

---

## Success Criteria

### Technical

- [ ] 99.5%+ uptime
- [ ] <200ms proxy overhead
- [ ] <5 errors per 10,000 requests
- [ ] Dashboard load time <2s

### Business

- [ ] 1 paying customer by Week 4
- [ ] 5 paying customers by Month 2
- [ ] 10 paying customers by Month 3
- [ ] $3,000 MRR by Month 3
- [ ] <10% monthly churn

### Product

- [ ] Net Promoter Score >40
- [ ] Customer setup time <15 minutes
- [ ] <2 support tickets per customer/month
- [ ] 80%+ feature completion rate

---

## Resources & Costs

### Development Tools
- GitHub (free)
- Cursor/VS Code (free)
- Wrangler CLI (free)

### Infrastructure
- Cloudflare Workers ($0 - $25/month)
- Cloudflare D1 ($0 - $5/month)
- Cloudflare KV ($0 - $5/month)
- Vercel (Dashboard hosting - $0 - $20/month)

### Services
- Clerk (auth - $0 - $25/month)
- Sentry (monitoring - free tier)
- Domain: x402hub.com ($12/year)

**Total Monthly Cost: ~$50-100**

---

## Risk Mitigation

### Technical Risks

**Risk:** Cloudflare Worker limits  
**Mitigation:** Document limitations, test with realistic payloads

**Risk:** D1 performance at scale  
**Mitigation:** Start with D1, migrate to Durable Objects if needed

**Risk:** x402 protocol adoption  
**Mitigation:** Provide clear SDKs, consider fiat fallback

### Business Risks

**Risk:** No customer demand  
**Mitigation:** 10 customer discovery calls before building

**Risk:** Wrong pricing  
**Mitigation:** A/B test pricing, iterate based on feedback

**Risk:** Churn  
**Mitigation:** White-glove onboarding, fast support response

---

## Next Steps

1. **Week 1 Start:** Database schema + Multi-tenant proxy
2. **Week 2 Start:** Dashboard development
3. **Week 3 Start:** Platform API + Testing
4. **Week 4 Start:** Landing page + First customer

**Let's ship! 🚀**
