# Setup Clerk + ChipiPay para x402-proxy Dashboard

El dashboard requiere dos servicios de autenticación/wallet configurados en Cloudflare Pages:

## 1. Setup Clerk (Autenticación)

### Crear cuenta Clerk
1. Ve a https://clerk.com/
2. Sign up con tu email
3. Crea una nueva aplicación (Application)

### Obtener credenciales Clerk

1. En el dashboard de Clerk, ve a **Settings** → **API Keys**
2. Copia tu **Publishable Key** (comienza con `pk_`)
3. Copia tu **Secret Key** (comienza con `sk_`)

### Configurar URLs autorizadas

En Clerk Dashboard:
- **Settings** → **URLs**
  - Development URLs: `http://localhost:3000`
  - Production URLs: `https://x402-proxy.pages.dev`
  - Allowed callback URLs: incluir tu dominio de Pages

---

## 2. Setup ChipiPay (Wallet en Starknet)

### Crear cuenta ChipiPay
1. Ve a https://app.chippi.co/
2. Sign up / Login
3. Ve a **API Keys** o **Developer Settings**

### Obtener credenciales ChipiPay

Necesitarás:
- **API Key** (Public): `chipi_pk_...`
- **Network**: `starknet-sepolia` (testnet) o `starknet-mainnet`

ChipiPay proporciona fondos de testnet automáticamente en Sepolia.

---

## 3. Configurar en Cloudflare Pages

### Vía Dashboard Web

1. Ve a **Cloudflare Dashboard** → **Pages** → **x402-proxy**
2. Selecciona **Settings** → **Environment variables**
3. Añade las siguientes variables **para el environment Production**:

| Variable | Valor | Notas |
|----------|-------|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | De Clerk API Keys |
| `CLERK_SECRET_KEY` | `sk_live_...` | De Clerk API Keys |
| `NEXT_PUBLIC_CHIPI_API_KEY` | `chipi_pk_...` | De ChipiPay |
| `NEXT_PUBLIC_CHIPI_ALPHA_URL` | `https://api.chippi.co` | URL de ChipiPay |

4. Haz click en **Save and Deploy** → se redesplegará automáticamente

### Vía Wrangler CLI (opcional)

```bash
npx wrangler pages project create x402-proxy  # Si no existe
npx wrangler pages secret set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY --project-name x402-proxy
npx wrangler pages secret set CLERK_SECRET_KEY --project-name x402-proxy
npx wrangler pages secret set NEXT_PUBLIC_CHIPI_API_KEY --project-name x402-proxy
```

---

## 4. Verificar Setup

Una vez configuradas las variables:

### Local Development

```bash
cd dashboard

# Crear archivo .env.local
cat > .env.local << EOF
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CHIPI_API_KEY=chipi_pk_...
NEXT_PUBLIC_CHIPI_ALPHA_URL=https://api.chippi.co
EOF

# Iniciar servidor
npm run dev
```

Deberías ver:
- ✅ Página de login con **"Sign In"** button (Clerk)
- ✅ Después de login, opción de conectar wallet Starknet
- ✅ ChipiPay popup para conectar wallet

### En Producción

1. Accede a https://x402-proxy.pages.dev
2. Deberías ver el botón **"Sign In"**
3. Click → Abre modal de Clerk para login
4. Después de login → Opción de conectar wallet de Starknet
5. Click → Se abre ChipiPay para seleccionar wallet

---

## 5. Troubleshooting

### Error: "Missing required environment variables"

**Causa**: Las env vars no están configuradas en Cloudflare Pages

**Solución**:
1. Ve a Cloudflare Pages → x402-proxy → Settings → Environment variables
2. Verifica que TODAS las variables estén presentes
3. Para cambios, redeploy: Pages → Deployments → "Retry build" en el último

### Error: "MetaMask o compatible" en el dashboard

**Causa**: ChipiPay no está cargando correctamente (falta API Key)

**Solución**:
- Verifica `NEXT_PUBLIC_CHIPI_API_KEY` esté configurada
- Espera a que el redeploy termine (2-3 minutos)
- Limpia cache del navegador: `Ctrl+Shift+Delete` o modo incógnito

### Clerk SignIn page está en blanco

**Causa**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` incorrecta o no configurada

**Solución**:
- Copia exactamente desde Clerk dashboard (sin espacios)
- Debe comenzar con `pk_`
- Redeploy: push a GitHub o retry build en Pages

### ChipiPay no conecta wallet

**Causa**: Red equivocada o API Key de prod vs testnet

**Solución**:
- Para testnet: asegúrate que `NEXT_PUBLIC_CHIPI_API_KEY` es de Sepolia
- Para prod: usa API Key de mainnet
- En wrangler.jsonc: `NETWORK` debe ser `starknet-sepolia` (testnet) o `starknet-mainnet` (prod)

---

## 6. Flujo Completo de Autenticación

```
Usuario visita: https://x402-proxy.pages.dev
        ↓
¿Tiene sesión Clerk? 
        ↙         ↘
       NO          SÍ
        ↓           ↓
    SignIn    ¿Tiene wallet?
    (Clerk)   ↙           ↘
             NO            SÍ
             ↓             ↓
         ChipiPay    Dashboard
         (Conectar)  (Crear Tenants)
```

---

## 7. Documentación Externa

- **Clerk**: https://clerk.com/docs/quickstart
- **ChipiPay**: https://chippi.co/docs
- **Starknet**: https://docs.starknet.io/
- **Cloudflare Pages + Next.js**: https://developers.cloudflare.com/pages/framework-guides/nextjs/

---

## Próximos pasos después del setup:

1. ✅ Configura Clerk + ChipiPay en Pages
2. ✅ Prueba login en https://x402-proxy.pages.dev
3. ✅ Conecta tu wallet de Starknet
4. ✅ Crea tu primer tenant con rutas protegidas
5. ✅ Configura el Worker para interceptar pagos
6. ✅ Prueba el flujo completo de pago
