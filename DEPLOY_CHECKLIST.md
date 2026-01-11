# Deploy a Producción - x402-proxy

Estado: **LISTO PARA DEPLOY** ✅

## Componentes a Desplegar

### 1. **Worker (Payment Gateway)** 
- ✅ Código compilado y listo
- ✅ Configuración en `wrangler.jsonc`
- ✅ D1 Database: `x402hub-db` (ID: `6239da48-c2fb-4b19-b9a4-f03f64544540`)
- ✅ KV Namespace: `TENANT_CACHE` (ID: `3e307e18b1fb4ded8cf7933f6d93fe4c`)
- ⚠️ **FALTA:** JWT_SECRET (generar con comando abajo)

### 2. **Dashboard (Next.js + Cloudflare Pages)**
- ✅ Código compilado exitosamente
- ✅ Integración Clerk + ChipiPay completada
- ✅ Componentes listos (ConnectWallet, CreateTenantForm, Auth)
- ⚠️ **FALTA:** Variables de entorno en Cloudflare Pages

---

## Pasos de Deploy

### Paso 1: Autenticar con Cloudflare

```bash
npx wrangler login
```

Esto abrirá un navegador para autenticación. Inicia sesión con tu cuenta de Cloudflare.

---

### Paso 2: Generar JWT_SECRET y Deploying Worker

```bash
# Generar token de 32 bytes
JWT_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "JWT_SECRET=$JWT_TOKEN"

# Guardar el secreto en Cloudflare
echo "$JWT_TOKEN" | npx wrangler secret put JWT_SECRET

# Verificar
npx wrangler secret list
```

---

### Paso 3: Deploy del Worker

```bash
cd /workspaces/x402-proxy

# Build
npm run build

# Deploy a producción
npm run deploy
```

**Resultado esperado:**
```
✅ Uploaded x402-proxy
✅ Current deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
🔗 https://x402-proxy.cxto21h.workers.dev
```

---

### Paso 4: Deploy del Dashboard (Cloudflare Pages)

```bash
cd /workspaces/x402-proxy/dashboard

# Build
npm run build

# Deploy a Pages
npx wrangler pages deploy dist
```

**Resultado esperado:**
```
✅ Deployment successful
🔗 https://x402-proxy.pages.dev
```

---

### Paso 5: Configurar Variables de Entorno en Cloudflare Pages

En el dashboard de Cloudflare:

1. **Cloudflare Pages** → **x402-proxy** → **Settings** → **Environment variables**

2. Añadir las siguientes variables:

| Variable | Valor | Tipo |
|----------|-------|------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | Production |
| `CLERK_SECRET_KEY` | `sk_live_...` | Production |
| `NEXT_PUBLIC_CHIPI_API_KEY` | `chipi_key_...` | Production |
| `NEXT_PUBLIC_CHIPI_ALPHA_URL` | `https://api.chippi.co` | Production |

> **Nota:** Obtén estas claves en:
> - Clerk: https://dashboard.clerk.com/
> - ChipiPay: https://app.chippi.co/

---

### Paso 6: Verificar Deployments

```bash
# Verificar Worker está corriendo
curl https://x402-proxy.cxto21h.workers.dev/__x402/health

# Respuesta esperada:
# {"status":"ok","timestamp":"2026-01-11T...","network":"starknet-sepolia"}

# Verificar Dashboard está corriendo
curl https://x402-proxy.pages.dev
```

---

## Variables de Entorno Necesarias

### Para el Worker (Cloudflare Secrets)

```
JWT_SECRET = [64 hex chars]
```

### Para el Dashboard (Cloudflare Pages - Environment Variables)

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CHIPI_API_KEY=...
NEXT_PUBLIC_CHIPI_ALPHA_URL=https://api.chippi.co
```

---

## URLs en Producción

| Servicio | URL |
|----------|-----|
| Worker (Payment Gateway) | `https://x402-proxy.cxto21h.workers.dev` |
| Dashboard (Admin) | `https://x402-proxy.pages.dev` |
| API Health Check | `https://x402-proxy.cxto21h.workers.dev/__x402/health` |
| API Config | `https://x402-proxy.cxto21h.workers.dev/__x402/config` |
| API Test (402 Payment Required) | `https://x402-proxy.cxto21h.workers.dev/__x402/protected` |

---

## Testing Post-Deploy

### 1. Verificar Worker está corriendo

```bash
curl https://x402-proxy.cxto21h.workers.dev/__x402/health
# Esperar: {"status":"ok","network":"starknet-sepolia"}
```

### 2. Acceder a Dashboard

```
https://x402-proxy.pages.dev
```

Debería mostrar:
- ✅ Botón "Sign In" (Clerk)
- ✅ Opción de conectar wallet (ChipiPay)
- ✅ Formulario para crear tenants

### 3. Test de Flow Completo

1. Ir a Dashboard
2. Hacer Sign In con Clerk
3. Conectar wallet Starknet con ChipiPay
4. Crear un nuevo tenant con patrón protegido
5. Hacer una solicitud al Worker a la ruta protegida
6. Debería retornar 402 Payment Required

---

## Troubleshooting

### Error: "JWT_SECRET not set"
```bash
echo $(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") | npx wrangler secret put JWT_SECRET
npx wrangler secret list
```

### Error: "Unable to authenticate"
```bash
npx wrangler logout
npx wrangler login
```

### Error: "Route already owned by another Worker"
Ver [AGENTS.md](./AGENTS.md) → Route Migration

---

## Configuración de Dominio Personalizado

Si deseas usar un dominio como `api.example.com`:

1. **Agregar ruta en wrangler.jsonc:**
   ```jsonc
   "routes": [
     {
       "pattern": "api.example.com/*",
       "zone_name": "example.com"
     }
   ]
   ```

2. **Redeploy Worker:**
   ```bash
   npm run deploy
   ```

3. **Verificar DNS está configurado correctamente** (Cloudflare naranja)

---

## Rollback en caso de problemas

### Revertir Worker
```bash
npx wrangler rollback --version [VERSION_ID]
```

### Revertir Pages
```bash
npx wrangler pages rollback
```

---

## Monitoreo Post-Deploy

### Logs del Worker
```bash
npx wrangler tail --format pretty
```

### Métricas de Cloudflare
- Dashboard: https://dash.cloudflare.com/
- Workers: Selecciona **x402-proxy** → **Analytics**
- Pages: Selecciona **x402-proxy** → **Analytics**

---

## Próximos Pasos

- [ ] Deploying en producción
- [ ] Configurar dominio personalizado (opcional)
- [ ] Probar flow completo de pago
- [ ] Configurar monitoreo y alertas
- [ ] Documentar endpoints API en OpenAPI/Swagger
- [ ] Setup de backups/disaster recovery
