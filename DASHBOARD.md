# x402hub Dashboard

Dashboard web para gestionar tenants, rutas protegidas y visualizar análisis en tiempo real.

## Inicio Rápido

```bash
cd dashboard
npm install
npm run dev
```

Luego abre [http://localhost:3000](http://localhost:3000)

## Características

### 📊 Dashboard Principal
- Muestra métricas clave: Total de Tenants, Ingresos Totales, Total de Solicitudes
- Lista de tenants recientes con estado activo
- Click en un tenant para ver detalles

### 👥 Gestión de Tenants
- **Crear Tenant**: Formulario con campos:
  - Subdomain (requerido) - ej: "acme"
  - Wallet Address (requerido) - dirección Ethereum
  - Network - Base Sepolia (testnet) o Base (mainnet)
  - Origin URL (opcional) - servidor backend a proxear
  - Origin Service (opcional) - nombre del service binding
  
- **Ver Tenant**: Detalles incluyen:
  - ID del tenant
  - Wallet address configurada
  - Network (testnet/mainnet)
  - URL origen configurada
  
- **Desactivar Tenant**: Botón para desactivar con confirmación

### 📈 Estadísticas
- Métricas de uso: solicitudes, tasa de pago
- Revenue por ruta protegida
- Breakdown diario (últimos 7 días)
- Tiempos de respuesta promedio y máximo

### 🔧 Configuración
Edita `.env.local` en directorio `dashboard/`:

```env
NEXT_PUBLIC_API_BASE=https://x402-proxy.cxto21h.workers.dev
```

## Stack Tecnológico

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Hook Form** - Form management

## Estructura

```
dashboard/
├── app/
│   ├── layout.tsx      - Root layout
│   ├── globals.css     - Tailwind imports
│   └── page.tsx        - Main page with state
├── components/
│   ├── Header.tsx      - Navigation
│   ├── Dashboard.tsx   - Stats view
│   ├── TenantsList.tsx - Tenant management
│   └── CreateTenantForm.tsx - Form
└── public/
    └── ... static assets
```

## API Integration

El dashboard se conecta a los endpoints de x402-proxy:

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/tenants` | GET | Listar todos los tenants |
| `/api/tenants` | POST | Crear nuevo tenant |
| `/api/tenants/:id` | PATCH | Actualizar tenant |
| `/api/tenants/:id` | DELETE | Desactivar tenant |
| `/api/routes` | GET | Listar rutas protegidas |
| `/api/stats` | GET | Obtener estadísticas |

## Desarrollo

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev

# Build para producción
npm run build

# Iniciar servidor de producción
npm start
```

## Deployment a Vercel

1. Conecta el repositorio a Vercel
2. Configura variable de entorno:
   ```
   NEXT_PUBLIC_API_BASE=https://x402-proxy.cxto21h.workers.dev
   ```
3. Configura la raíz del proyecto: `dashboard/`
4. Deploy automático en push a `main`

## Deployment a Cloudflare Pages

1. En Cloudflare Dashboard → Pages → Create Project
2. Conecta tu repositorio (reflecterlabs/x402-proxy)
3. **IMPORTANTE**: Configura el build correctamente:
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `.next` (por defecto, déjalo como está)
   - **Root directory**: `dashboard/` ← **CRÍTICO**
   
4. Después de crear el proyecto, ve a **Settings → Environment variables** y añade:
   ```
   NEXT_PUBLIC_API_BASE = https://x402-proxy.cxto21h.workers.dev
   Type: TEXT
   ```
5. Click en "Deploy" (o redeploy si ya existe)

### Verificar Deployment

Después del deploy, abre la URL de Pages (ej: `x402hub.pages.dev`) y verifica:
- ✅ Dashboard carga correctamente
- ✅ Botones de navegación funcionan
- ✅ API llama a `/api/tenants` correctamente
- ✅ Crear tenant funciona
- ✅ Listar tenants muestra datos de DB

### Troubleshooting

**"Build failed with error code 1"**
- Verifica que el `root directory` sea `dashboard/`
- Asegúrate de que `NEXT_PUBLIC_API_BASE` esté en Settings → Environment variables

**"Page not found" (404)**
- El build output directory debería detectarse automáticamente como `.next`
- Si no funciona, intenta cambiar a `dashboard/.next`

**"API calls failing"**
- Verifica que la variable de entorno `NEXT_PUBLIC_API_BASE` esté setada
- Comprueba que el Worker en `x402-proxy.cxto21h.workers.dev` está activo

## Troubleshooting

### "Failed to fetch tenants"
- Verifica que el worker x402-proxy esté desplegado
- Comprueba la variable `NEXT_PUBLIC_API_BASE` en `.env.local`
- Abre la consola del navegador (F12) para ver errores exactos

### Formulario no funciona
- Asegúrate de llenar los campos requeridos (subdomain, wallet)
- Valida el formato de dirección Ethereum

### Estilos rotos
- Ejecuta `npm run build` para verificar compilation
- Limpia `.next` y node_modules: `rm -rf .next node_modules && npm install`

