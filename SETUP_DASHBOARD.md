# Setup Rápido desde Dashboard de Cloudflare

Sigue estos pasos para crear los recursos necesarios en ~5 minutos:

## Paso 1: Crear D1 Database

1. **Abre:** https://dash.cloudflare.com/eb6e0c55ac7aa3c441500bb7ca73b9e3/workers-and-pages/d1
2. **Click:** "Create database"
3. **Nombre:** `x402hub-db`
4. **Click:** "Create"
5. **Copia** el `Database ID` que aparece (se ve como: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

## Paso 2: Crear KV Namespace

1. **Abre:** https://dash.cloudflare.com/eb6e0c55ac7aa3c441500bb7ca73b9e3/workers-and-pages/kv/namespaces
2. **Click:** "Create a namespace"
3. **Namespace Name:** `TENANT_CACHE`
4. **Click:** "Add"
5. **Copia** el `Namespace ID` que aparece en la tabla

## Paso 3: Actualizar wrangler.jsonc

Ahora dame los IDs y yo actualizo el archivo. O si prefieres, edita tú mismo:

```jsonc
// En wrangler.jsonc, busca estas líneas:

"d1_databases": [
  {
    "binding": "DB",
    "database_name": "x402hub-db",
    "database_id": "REEMPLAZA_CON_TU_DATABASE_ID_DE_D1"
  }
],

"kv_namespaces": [
  {
    "binding": "TENANT_CACHE",
    "id": "REEMPLAZA_CON_TU_NAMESPACE_ID_DE_KV"
  }
]
```

## Paso 4: Aplicar Schema a D1

Una vez tengas el Database ID, ejecuta en la terminal:

```bash
# Método 1: Via wrangler (más fácil)
npx wrangler d1 execute x402hub-db --remote --file=./db/schema.sql

# Método 2: Via Dashboard D1
# 1. Abre https://dash.cloudflare.com/eb6e0c55ac7aa3c441500bb7ca73b9e3/workers-and-pages/d1
# 2. Click en x402hub-db
# 3. Click en "Console" tab
# 4. Copia y pega el contenido de db/schema.sql
# 5. Click "Execute"
```

## Paso 5: Deploy

```bash
npm run deploy
```

## Paso 6: Test

```bash
# Health check del worker
curl https://x402-proxy.cxto21h.workers.dev/__x402/health

# Config (debería mostrar hasDB: true si D1 está conectado)
curl https://x402-proxy.cxto21h.workers.dev/__x402/config
```

---

## ¿Qué IDs copiaste?

Dame los IDs y yo actualizo wrangler.jsonc automáticamente:
- Database ID de D1: 
- Namespace ID de KV:
