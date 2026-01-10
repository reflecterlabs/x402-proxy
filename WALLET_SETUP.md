# 🔐 Guía de Wallet para x402hub

## ¿Qué tipo de wallet debo usar?

### ✅ Wallets Compatibles (EVM)

x402hub usa el protocolo **x402** que funciona con redes **EVM (Ethereum Virtual Machine)**. Esto significa que puedes usar cualquier wallet compatible con Ethereum o sus redes conectadas:

- **MetaMask** (Recomendado) - Disponible como extensión del navegador
- **WalletConnect** - Para wallets móviles
- **Coinbase Wallet**
- **Argent**
- **Trust Wallet**
- Cualquier otra wallet EVM compatible

### ❌ Wallets NO Compatibles

- ❌ **STRK (Starknet Tokens)** - Starknet usa una arquitectura diferente (Cairo VM), no es EVM
- ❌ **Solana Wallets** - Solana es una blockchain diferente, no EVM compatible
- ❌ Otras blockchains que no sean EVM

---

## Configuración Rápida con MetaMask

### Paso 1: Instalar MetaMask

1. Visita https://metamask.io
2. Descarga la extensión para tu navegador (Chrome, Firefox, Edge, etc.)
3. Haz clic en "Agregar a Chrome" (o tu navegador)

### Paso 2: Crear o Importar Wallet

1. Abre MetaMask desde el icono de la extensión
2. Si es la primera vez:
   - Haz clic en "Crear wallet"
   - Lee y acepta los términos
   - Crea una contraseña segura
   - **Guarda tu frase de recuperación** (12 palabras) en un lugar seguro
3. Si ya tienes wallet:
   - Haz clic en "Importar wallet"
   - Ingresa tu frase de recuperación (12 o 24 palabras)

### Paso 3: Cambiar a Base Network

x402hub funciona en **Base network**. Sigue estos pasos:

#### Para desarrollo/testing (Base Sepolia):

1. En MetaMask, haz clic en la red actual (arriba a la izquierda)
2. Haz clic en "Agregar red"
3. Ingresa estos datos:

```
Network Name: Base Sepolia
RPC URL: https://sepolia.base.org
Chain ID: 84532
Currency Symbol: ETH
Block Explorer: https://sepolia.basescan.org
```

4. Haz clic en "Guardar"

#### Para producción (Base Mainnet):

```
Network Name: Base
RPC URL: https://mainnet.base.org
Chain ID: 8453
Currency Symbol: ETH
Block Explorer: https://basescan.org
```

### Paso 4: Obtener Fondos de Prueba (Testnet)

Para **Base Sepolia** (testing), necesitas obtener ETH de prueba:

1. Visita https://www.coinbase.com/faucets/base-eth-faucet
2. Conecta tu wallet
3. Recibe 0.05 ETH de prueba gratis (suficiente para testing)

Para **Base Mainnet** (producción), necesitas comprar ETH real en un exchange como Coinbase o Kraken.

---

## Conectar tu Wallet a x402hub

1. Abre https://x402-proxy.pages.dev
2. Haz clic en el botón **"Connect Wallet"** (arriba a la derecha)
3. MetaMask pedirá permiso para conectar - haz clic en "Conectar"
4. Verás tu dirección de wallet (truncada) en el botón

### Dirección de Wallet

Tu dirección tiene este formato:

```
0x1234567890abcdef1234567890abcdef12345678
       ↑
    Comienza con 0x
       
   40 caracteres hexadecimales (0-9, a-f)
```

**Ejemplo válido:**
```
0xa71b02f45dd5a6b4d82a47a67a6efb85888aBEfE
```

---

## Crear un Multi-Tenant

Una vez conectado tu wallet:

1. Haz clic en **"+ New Tenant"**
2. Completa el formulario:
   - **Subdomain**: El nombre de tu tenant (ej: "acme")
   - **Wallet Address**: Se llenará automáticamente (tu wallet conectado)
   - **Network**: Base Sepolia (testing) o Base (producción)
   - **Origin URL**: Opcional - dónde proxear las requests
   - **Origin Service**: Opcional - Cloudflare Worker binding

3. Haz clic en **"Create Tenant"**

El sistema usará tu dirección de wallet para:
- Recibir pagos en x402 cuando usuarios accedan a rutas protegidas
- Identificar tu tenant de forma única
- Auditar cambios de configuración

---

## Preguntas Frecuentes

### P: ¿Es seguro usar MetaMask?

**R:** Sí, es muy seguro si:
- Descargarlo del sitio oficial (https://metamask.io)
- **Nunca** compartes tu frase de recuperación
- **Nunca** compartas tu contraseña
- Cuidado con websites falsos

### P: ¿Puedo usar la misma wallet en múltiples tenants?

**R:** Sí, puedes crear varios tenants con la misma wallet. Cada subdomain es un tenant separado.

### P: ¿Qué pasa si pierdo acceso a mi wallet?

**R:** Usa tu frase de recuperación (12-24 palabras) en otro dispositivo o navegador. Si la pierdes, tu wallet está perdida para siempre. Copia la frase en un lugar seguro.

### P: ¿Cómo cambio de red en MetaMask?

**R:** Haz clic en el nombre de la red (arriba a la izquierda en MetaMask) y selecciona otra red.

### P: ¿Funciona con wallets de hardware (Ledger, Trezor)?

**R:** Sí, si están conectadas a MetaMask. MetaMask puede usarse con wallets de hardware para mayor seguridad.

### P: ¿El testnet ETH tiene valor real?

**R:** No, el ETH de testnet (Sepolia) no tiene valor. Es solo para pruebas. Usa sepolia.basescan.org para verificar transacciones.

---

## Diferencia entre Networks

| Aspecto | Base Sepolia (Testnet) | Base (Mainnet) |
|--------|------------------------|----------------|
| **Usar para** | Desarrollo y testing | Producción real |
| **Dinero real** | No | Sí |
| **ETH gratis** | Sí (faucet) | No (comprar) |
| **Duración** | Puede resetear | Permanente |
| **Chain ID** | 84532 | 8453 |
| **Datos públicos** | Sí (sepolia.basescan.org) | Sí (basescan.org) |

---

## Resumen

✅ Usa una wallet EVM (MetaMask recomendado)  
✅ Instálalo desde el navegador  
✅ Conecta a Base Sepolia (testing) o Base (producción)  
✅ Obtén fondos de prueba del faucet (testnet)  
✅ Conecta tu wallet en x402hub  
✅ Crea tu primer tenant  

¡Listo! Tu wallet está segura y connected. 🎉
