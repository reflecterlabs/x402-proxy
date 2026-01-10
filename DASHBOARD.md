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
3. Deploy automático en push a `main`

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

