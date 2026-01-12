# Multi-Tenant Simplificado - Guía de Funcionamiento

## Resumen Ejecutivo

La creación de tenants en x402-proxy es **extremadamente simple**: solo requiere:
1. **Nombre del tenant** (ej: "Mi Aplicación")
2. **Wallet de Starknet conectado** (se obtiene automáticamente)

El subdomain se genera automáticamente a partir del nombre.

---

## ¿Qué necesito de Cloudflare para crear un tenant?

**Respuesta sincera: NADA extra.**

El proceso de creación de tenants utiliza:
- ✅ **D1 Database** (ya configurada en wrangler.jsonc)
- ✅ **KV Cache** (TENANT_CACHE, ya configurada)

Ambos están disponibles como **bindings** del Worker. No necesitas:
- ❌ API tokens adicionales
- ❌ Configuración extra
- ❌ Credenciales de Cloudflare en el formulario
- ❌ Pasos manuales en el dashboard de Cloudflare

El Worker accede a D1 y KV automáticamente mediante sus bindings definidos en `wrangler.jsonc`.

---

## Arquitectura del Flujo

### 1. Frontend (Formulario Simplificado)

**Archivo:** `/workspaces/x402-proxy/dashboard/components/CreateTenantForm.tsx`

```
Usuario escribe nombre
       ↓
Input validado (3-50 caracteres, alfanumérico)
       ↓
Subdomain generado automáticamente
(ej: "Mi Aplicación" → "mi-aplicacion")
       ↓
Wallet obtenido del contexto ChipiPay
(ya conectado previamente)
       ↓
Submit al API
```

**Datos enviados al backend:**
```json
{
  "name": "Mi Aplicación",
  "subdomain": "mi-aplicacion",
  "wallet_address": "0x123...abc",
  "network": "starknet-sepolia",
  "origin_url": null,
  "origin_service": null
}
```

### 2. Backend (Creación en BD)

**Archivo:** `/workspaces/x402-proxy/src/api/tenants.ts` → POST `/api/tenants`

```
Recibe datos del formulario
       ↓
Valida: subdomain, name, wallet_address
       ↓
Genera JWT_SECRET automáticamente
(crypto.getRandomValues)
       ↓
Inserta en tabla tenants
(D1 SQLite)
       ↓
Invalida cache KV
       ↓
Retorna tenant creado con JWT_SECRET
```

**Campos almacenados:**
- `id`: Genera do desde subdomain (ej: "mi-aplicacion")
- `subdomain`: "mi-aplicacion"
- `name`: "Mi Aplicación"
- `wallet_address`: 0x123...abc
- `network`: "starknet-sepolia"
- `origin_url`: null (por defecto)
- `origin_service`: null (por defecto)
- `jwt_secret`: Generado automáticamente
- `status`: "active"
- `created_at`, `updated_at`: Timestamp

---

## Diagrama de Credenciales Cloudflare

```
wrangler.jsonc
├── bindings:
│   ├── DB (D1) ← Acceso automático via binding
│   └── TENANT_CACHE (KV) ← Acceso automático via binding
│
├── database_id: "6239da48-..."
└── kv_namespaces:
    └── binding: "TENANT_CACHE"
        id: "3e307e18b1fb..."
```

**Resultado:** El Worker tiene acceso automático a D1 y KV.
No necesitas escribir credenciales en código ni en formularios.

---

## Flujo Visual Completo

```
┌─────────────────────────────────────┐
│  Dashboard (React + Clerk + ChipiPay) │
│                                      │
│  ┌──────────────────────────────┐  │
│  │ CreateTenantForm             │  │
│  │ • Input: Nombre              │  │
│  │ • Auto: Subdomain            │  │
│  │ • Auto: Wallet (ChipiPay)    │  │
│  └──────────────────────────────┘  │
└────────────┬────────────────────────┘
             │ axios.post(/api/tenants)
             ▼
┌─────────────────────────────────────┐
│  Workers (Cloudflare + Hono)         │
│                                      │
│  ┌──────────────────────────────┐  │
│  │ POST /api/tenants            │  │
│  │ • Valida campos              │  │
│  │ • Genera JWT_SECRET          │  │
│  │ • Inserta en D1              │  │
│  │ • Invalida cache KV          │  │
│  └──────────────────────────────┘  │
└────────────┬────────────────────────┘
             │ Respuesta JSON
             ▼
┌─────────────────────────────────────┐
│  Base de Datos (D1 - SQLite)         │
│  Tabla: tenants                      │
│  • Almacena tenant con todos sus     │
│    parámetros                        │
└─────────────────────────────────────┘
```

---

## Componentes Involucrados

### `CreateTenantForm.tsx` - Validaciones

```typescript
// Solo acepta:
1. Nombre (3-50 caracteres)
2. Wallet conectado (de ChipiPay)
3. Usuario autenticado (de Clerk)

// Auto-genera:
- subdomain: nombre.toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-]/g, '')
  .substring(0, 30)

// Fuerza valores:
- network: 'starknet-sepolia'
- origin_url: null
- origin_service: null
```

### `tenants.ts` - Lógica del Backend

```typescript
// Validaciones
if (!subdomain || !name || !wallet_address) {
  return error(400, "Missing fields")
}

// Genera JWT_SECRET automáticamente
const secret = jwt_secret || generateRandomSecret()

// Inserta en D1 (automáticamente disponible)
db.prepare(INSERT...).bind(...).run()

// Invalida cache KV (automáticamente disponible)
TENANT_CACHE.delete(...)
```

---

## Esquema de Base de Datos

```sql
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,                    -- "mi-aplicacion"
  subdomain TEXT UNIQUE NOT NULL,         -- "mi-aplicacion"
  name TEXT NOT NULL,                     -- "Mi Aplicación"
  wallet_address TEXT NOT NULL,           -- 0x123...abc
  network TEXT,                           -- "starknet-sepolia"
  origin_url TEXT,                        -- null (por defecto)
  origin_service TEXT,                    -- null (por defecto)
  jwt_secret TEXT NOT NULL,               -- Generado automáticamente
  status TEXT,                            -- "active"
  created_at INTEGER,                     -- Timestamp
  updated_at INTEGER                      -- Timestamp
);
```

---

## Cómo Usar

### 1. Ir al Dashboard
```
https://x402-proxy-dashboard.pages.dev
```

### 2. Autenticarse con Clerk
- Click en "Sign In"
- Completar autenticación

### 3. Conectar Wallet de Starknet
- Click en botón de wallet (esquina superior derecha)
- Seleccionar ChipiPay
- Aprobar conexión

### 4. Crear Tenant
- Click en pestaña "Crear Tenant"
- Escribir nombre (ej: "Mi Aplicación")
- Click en "Crear Tenant"
- ✅ Tenant creado automáticamente

```
Respuesta:
{
  "success": true,
  "data": {
    "id": "mi-aplicacion",
    "subdomain": "mi-aplicacion",
    "name": "Mi Aplicación",
    "wallet_address": "0x123...abc",
    "network": "starknet-sepolia",
    "jwt_secret": "a1b2c3d4..."
  }
}
```

---

## Testeo Local

```bash
# Instalar dependencias
cd dashboard && npm install && cd ..

# Iniciar en desarrollo
npm run dev

# El API estará en:
# http://localhost:8787/api/tenants
```

---

## Seguridad

| Elemento | Responsable | Validación |
|----------|-------------|-----------|
| Nombre | Frontend | 3-50 caracteres, alfanumérico |
| Wallet | ChipiPay | Firmado, verificado por ChipiPay |
| Usuario | Clerk | Autenticado via Clerk |
| JWT_SECRET | Backend | Generado con crypto.getRandomValues |
| Base de Datos | Cloudflare | D1 SQLite (integrada) |
| Cache | Cloudflare | KV (integrada) |

---

## Limitaciones Actuales

1. **Solo un nombre como input** → El resto se auto-genera
2. **Solo Starknet Sepolia** → Network hardcodeado (fácil de cambiar en futuro)
3. **Sin origin_url/origin_service** → Solo proxy estándar (pueden agregarse después)
4. **JWT_SECRET auto-generado** → No personalizable (mejor práctica)

Esto es **intencionado** para mantener la solución simple y segura.

---

## Commits Relacionados

- ✅ **e7ca598**: Migración completa a Starknet/ChipiPay
- ⏳ **feat/tenant**: Rama de features para simplificación multi-tenant

---

## Próximos Pasos (Futuro)

Si necesitas agregar funcionalidad:

1. **Permitir elegir red** → Agregar selector origin_url/origin_service en el formulario
2. **Personalizar JWT_SECRET** → Agregar campo opcional en el formulario
3. **Editar tenant** → PATCH /api/tenants/:id
4. **Eliminar tenant** → DELETE /api/tenants/:id
5. **Ver estadísticas** → GET /api/tenants/:id/stats

---

## Conclusión

**No necesitas tokens, configuración manual ni credenciales de Cloudflare.**

El Worker accede a D1 y KV automáticamente. Solo escribe el nombre del tenant y todo funciona.

La solución es prolija, segura y lista para producción.
