# Manual Setup Instructions

El token proporcionado no tiene permisos suficientes para crear recursos via API. Sigue estos pasos para completar el setup manualmente:

## Opción 1: Login Interactivo (Recomendado)

```bash
# 1. Login con navegador (abrirá una página de Cloudflare)
npx wrangler login

# 2. Crear D1 database
npx wrangler d1 create x402hub-db
# Copia el database_id que aparece en la salida

# 3. Crear KV namespace
npx wrangler kv namespace create TENANT_CACHE
# Copia el id que aparece en la salida

# 4. Actualizar wrangler.jsonc
# Reemplaza "preview-database-id" con el database_id de D1
# Reemplaza "preview-kv-id" con el id de KV

# 5. Aplicar schema a la base de datos
npx wrangler d1 execute x402hub-db --remote --file=./db/schema.sql

# 6. Deploy
npm run deploy
```

## Opción 2: Desde el Dashboard de Cloudflare

### Crear D1 Database:
1. Ir a https://dash.cloudflare.com/
2. Seleccionar tu cuenta → Workers & Pages → D1
3. Click "Create database"
4. Nombre: `x402hub-db`
5. Copiar el Database ID y actualizar `wrangler.jsonc`

### Crear KV Namespace:
1. En el mismo dashboard → Workers & Pages → KV
2. Click "Create namespace"
3. Namespace name: `TENANT_CACHE`
4. Copiar el Namespace ID y actualizar `wrangler.jsonc`

### Aplicar Schema:
Necesitas wrangler CLI para esto:
```bash
npx wrangler d1 execute x402hub-db --remote --file=./db/schema.sql
```

## Estado Actual del Código

✅ **Completado:**
- Schema D1 definido en `db/schema.sql`
- Tipos TypeScript en `src/types/db.ts`
- Utilidades de DB en `src/db/tenant.ts`
- Router multi-tenant en `src/index.ts`
- Bindings configurados en `wrangler.jsonc` (pendiente IDs reales)
- Documentación en `MULTI_TENANT.md`
- Script de setup en `scripts/setup-multi-tenant.sh`

⏳ **Pendiente:**
- Crear recursos D1 y KV en Cloudflare
- Actualizar IDs en wrangler.jsonc
- Aplicar schema SQL
- Deploy a producción
- Testing multi-tenant

## Próximos Pasos Después del Setup

1. **Commit y PR del código multi-tenant**
2. **Testing local con D1 local**
3. **Deploy a producción**
4. **Construir Platform API** (para que tenants se auto-gestionen)
5. **Construir Dashboard** (UI para signup y config)

## Testing Local (Sin D1 remoto)

Mientras tanto, puedes probar localmente:

```bash
# Crear D1 local
npx wrangler d1 execute x402hub-db --local --file=./db/schema.sql

# Ejecutar dev
npm run dev

# Probar endpoints (fallback a single-tenant mode)
curl http://localhost:8787/__x402/health
```

El worker funciona en modo single-tenant (usando env vars) cuando no detecta subdomain o bindings D1/KV.
