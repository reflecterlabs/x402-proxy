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
- **Public API Key**: `pk_prod_...`
- **Secret API Key**: `sk_prod_...`
- **Network**: `starknet-sepolia` (testnet) o `starknet-mainnet`

ChipiPay proporciona fondos de testnet automáticamente en Sepolia.

---

## 3. Configurar en Cloudflare Pages

### Vía Dashboard Web

1. Ve a **Cloudflare Dashboard** → **Pages** → **x402-proxy**
2. Selecciona **Settings** → **Environment variables**
3. Añade las siguientes variables **para el environment Production**:

```
# Clerk Configuration (Autenticación)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZWFnZXItZ29ibGluLTI0LmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_BMQNV3ny2qmDb7g5QwdsH6XXoGBdlG6yynjrA13gzF

# Clerk URLs (No cambiar)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# ChipiPay Configuration (Wallet - Starknet)
NEXT_PUBLIC_CHIPI_API_KEY=pk_prod_fc53c56717524215e46aeb75b3998c50
CHIPI_SECRET_KEY=sk_prod_8bf4a2aa05c891d3b8f0c3a81e47843ab8a09350d1f4086acaccdc82ad1616a6

# Supabase Configuration (Base de datos)
NEXT_PUBLIC_SUPABASE_URL=https://ogzgkkgomoixqlommtxu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_hGoSJYWlxr1nQsx0gWKPKw_YFRIqxlE
```

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
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZWFnZXItZ29ibGluLTI0LmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_BMQNV3ny2qmDb7g5QwdsH6XXoGBdlG6yynjrA13gzF
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_CHIPI_API_KEY=pk_prod_fc53c56717524215e46aeb75b3998c50
CHIPI_SECRET_KEY=sk_prod_8bf4a2aa05c891d3b8f0c3a81e47843ab8a09350d1f4086acaccdc82ad1616a6
NEXT_PUBLIC_SUPABASE_URL=https://ogzgkkgomoixqlommtxu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_hGoSJYWlxr1nQsx0gWKPKw_YFRIqxlE
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
2. Verifica que TODAS las variables estén presentes (8 variables en total)
3. Para cambios, redeploy: Pages → Deployments → "Retry build" en el último

### Error: "ChipiPay no está configurado correctamente"

**Causa**: Las claves de ChipiPay son incorrectas o no están configuradas

**Solución**:
- Verifica `NEXT_PUBLIC_CHIPI_API_KEY` y `CHIPI_SECRET_KEY` en Cloudflare
- Deben comenzar con `pk_prod_` y `sk_prod_` respectivamente
- Espera a que el redeploy termine (2-3 minutos)
- Limpia cache del navegador: `Ctrl+Shift+Delete` o modo incógnito

### Clerk SignIn page está en blanco

**Causa**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` incorrecta o no configurada

**Solución**:
- Copia exactamente desde Clerk dashboard (sin espacios)
- Debe comenzar con `pk_`
- Verifica `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth` esté configurada
- Redeploy: push a GitHub o retry build en Pages

### Supabase - Error de conexión

**Causa**: Variables de Supabase no configuradas

**Solución**:
- Verifica `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Cloudflare
- Deben estar exactamente como se proporcionó
- Se usan para almacenar datos de tenants y configuración

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
