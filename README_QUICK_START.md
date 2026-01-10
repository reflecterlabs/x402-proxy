# x402hub - Multi-Tenant Payment Gateway

**MVP deployed and live!** 🚀

- **Dashboard**: https://x402-proxy.pages.dev/
- **API**: https://x402-proxy.cxto21h.workers.dev/
- **GitHub**: https://github.com/reflecterlabs/x402-proxy

## What is x402hub?

A multi-tenant payment gateway using the **x402 protocol** for payment-gated content. Users can create protected routes on their domain and receive payments in cryptocurrency when users access them.

### Key Features

✅ **Web3 Authentication** - Connect your Ethereum wallet (MetaMask, etc.)  
✅ **Multi-Tenant Support** - Create multiple protected domains  
✅ **Payment Gating** - Charge per request using x402 protocol  
✅ **JWT Tokens** - 1-hour session tokens after payment  
✅ **Real-time Stats** - Dashboard with revenue & request tracking  
✅ **White-Label Ready** - Custom domains and branding  

---

## Quick Start

### 1. Connect Your Wallet

1. Open https://x402-proxy.pages.dev/
2. Click **"Connect Wallet"** (top right)
3. MetaMask popup will appear - approve the connection
4. Your wallet address will appear in the button

**Note**: Make sure you're on the **Base** network:
- Testing: Base Sepolia (testnet)
- Production: Base (mainnet)

> **Need help?** See [WALLET_SETUP.md](./WALLET_SETUP.md) for detailed wallet setup instructions

### 2. Create a Multi-Tenant

1. Click **"+ New Tenant"**
2. Fill in the form:
   - **Subdomain**: Your tenant's subdomain (e.g., "acme")
   - **Wallet Address**: Auto-filled from your connected wallet
   - **Network**: Base Sepolia (testing) or Base (production)
   - **Origin URL** (optional): Where to proxy requests (e.g., https://api.example.com)
   - **Origin Service** (optional): Cloudflare Worker binding name
3. Click **"Create Tenant"**

Your new tenant URL will be: `https://<subdomain>.example.com`

### 3. Set Up Protected Routes

After creating a tenant, add payment-gated routes:

1. Click on your tenant in the **"Tenants"** view
2. Add protected routes with pricing (e.g., `/api/premium/*` = $0.01)
3. Users will need to pay to access these routes

### 4. Get Paid

When users access a protected route:

1. They receive a **402 Payment Required** response
2. They pay via the x402 protocol (using their wallet)
3. x402hub verifies the payment
4. User gets a **JWT token** valid for 1 hour
5. **You receive payment** at your wallet address

---

## Architecture

```
User Request
    ↓
x402hub API (https://x402-proxy.cxto21h.workers.dev)
    ↓
├─ Is route protected? (check PROTECTED_PATTERNS)
│   ├─ YES: Check for valid JWT token
│   │   ├─ Valid token? → Proxy to origin + set cookie
│   │   └─ Invalid? → Return 402 + payment info
│   │
│   └─ NO: Proxy directly to origin
    ↓
Origin Server (DNS, External URL, or Service Binding)
```

## Wallet Types

### ✅ Supported: EVM Wallets

EVM (Ethereum Virtual Machine) wallets work with all these networks:

- **Ethereum** - The original blockchain
- **Base** - Coinbase's L2 (recommended for x402hub)
- **Arbitrum** - Ethereum L2
- **Polygon** - Ethereum sidechain
- **Optimism** - Ethereum L2
- **Avalanche** - Independent chain

**Popular EVM Wallets:**
- MetaMask (browser extension) - Most popular
- WalletConnect (mobile wallets)
- Coinbase Wallet
- Argent
- Trust Wallet

### ❌ Not Supported

- **STRK (Starknet)** - Different VM architecture, incompatible
- **SOL (Solana)** - Different blockchain, incompatible
- **Other non-EVM chains** - Bitcoin, Cosmos, etc.

---

## Dashboard Features

### 📊 Dashboard Tab

View your platform statistics:
- **Total Tenants** - Number of protected domains
- **Total Revenue** - Cumulative ETH received
- **Total Requests** - Across all tenants

### 🏢 Tenants Tab

Manage your multi-tenants:
- List all active tenants
- View tenant configuration
- Check stats per tenant
- Edit tenant settings
- Delete tenants

### ➕ Create Tenant Tab

Add new payment-gated domains:
- Auto-fills your wallet address
- Validates Ethereum address format
- Shows network selection (Sepolia/Mainnet)
- Option to specify origin (URL or Worker binding)

---

## API Endpoints

### Tenants

```bash
# Get all tenants
GET /api/tenants

# Get single tenant
GET /api/tenants/{id}

# Create tenant
POST /api/tenants
Content-Type: application/json

{
  "subdomain": "acme",
  "wallet_address": "0x1234...",
  "network": "base-sepolia",
  "origin_url": "https://api.example.com"
}

# Update tenant
PATCH /api/tenants/{id}
Content-Type: application/json

{
  "wallet_address": "0xabcd...",
  "origin_url": "https://newapi.example.com"
}

# Delete tenant
DELETE /api/tenants/{id}
```

### Protected Routes

```bash
# List routes for tenant
GET /api/routes?tenant_id=acme

# Create protected route
POST /api/routes
Content-Type: application/json

{
  "tenant_id": "acme",
  "pattern": "/api/premium/*",
  "price_usd": "0.01",
  "description": "Premium API access"
}
```

### Stats

```bash
# Get tenant stats
GET /api/stats/{tenant_id}

# Response:
{
  "total_requests": 1234,
  "paid_requests": 567,
  "failed_payments": 12,
  "average_response_time_ms": 45
}
```

---

## Payment Flow

### How Payment Works

1. **User visits protected route** → Gets 402 Payment Required
2. **x402hub returns** → Payment request with:
   - Destination wallet (your PAY_TO address)
   - Amount (in USD)
   - Session ID
3. **User pays via wallet** → Sends X-PAYMENT header with payment proof
4. **x402hub verifies** → Checks payment with x402 facilitator
5. **User gets JWT** → 1-hour access token via cookie
6. **Repeat requests** → Use JWT cookie, no more payment needed (until expires)

### Payment Terms

- **Duration**: 1 hour per payment
- **Cookie**: HTTP-only, Secure, SameSite=Strict
- **Renewal**: User must pay again after 1 hour
- **Proof**: Verified via x402 protocol (on-chain)

---

## Testing on Testnet

### Get Test ETH

1. Open https://www.coinbase.com/faucets/base-eth-faucet
2. Connect your MetaMask wallet
3. Receive 0.05 ETH (free, for testing only)

### Test a Protected Route

```bash
# 1. First request without payment (should get 402)
curl https://acme.example.com/api/premium/data

# Response:
# HTTP/402 Payment Required
# x402: ...payment details...

# 2. Make payment via your wallet
# (Use MetaMask or WalletConnect)

# 3. Second request with JWT cookie (should work)
curl https://acme.example.com/api/premium/data \
  -H "Cookie: x402_jwt=..."
```

---

## Configuration Reference

### Tenant Fields

| Field | Type | Required | Example |
|-------|------|----------|---------|
| `subdomain` | string | ✓ | "acme" |
| `wallet_address` | string (0x format) | ✓ | "0x123...abc" |
| `network` | string | ✓ | "base-sepolia" |
| `origin_url` | string (URL) | - | "https://api.example.com" |
| `origin_service` | string | - | "my-worker" |

### Protected Route Fields

| Field | Type | Required | Example |
|-------|------|----------|---------|
| `pattern` | string (glob) | ✓ | "/api/premium/*" |
| `price_usd` | number | ✓ | 0.01 |
| `description` | string | - | "Premium access" |

---

## Troubleshooting

### "Connect wallet to create"

**Problem**: Button is disabled or message shows  
**Solution**: 
- Click "Connect Wallet" at top right
- Approve MetaMask popup
- Ensure you're on Base network

### "Invalid Ethereum address format"

**Problem**: Can't submit form  
**Solution**:
- Address must start with `0x`
- Must be exactly 42 characters (0x + 40 hex)
- Example: `0x1234567890abcdef1234567890abcdef12345678`

### "Subdomain already exists"

**Problem**: Can't create tenant  
**Solution**:
- Each subdomain is unique
- Choose a different name (e.g., "acme2" instead of "acme")

### Wallet won't connect

**Problem**: MetaMask popup doesn't appear  
**Solution**:
1. Ensure MetaMask is installed (https://metamask.io)
2. Check you're on correct network (Base Sepolia for testing)
3. Try refreshing the page
4. Check browser console for errors

### No dashboard data loads

**Problem**: Tenants list is empty or "No tenants yet"  
**Solution**:
1. Create your first tenant (click "+ New Tenant")
2. Check API logs: https://x402-proxy.cxto21h.workers.dev/api/tenants
3. Verify wallet is connected and visible in header

---

## Security Notes

🔒 **Private Keys**: Never shared with x402hub  
🔒 **Wallet Address**: Public information, safe to use  
🔒 **JWT Secrets**: Auto-generated, stored securely in D1  
🔒 **CORS**: Enabled for dashboard frontend  
🔒 **Payments**: Verified on-chain via x402 protocol  

---

## Status & Roadmap

### Current (MVP)
✅ Web3 wallet authentication  
✅ Multi-tenant management  
✅ Dashboard with stats  
✅ Payment gating (x402)  
✅ JWT session tokens  
✅ Cloudflare Pages deployment  

### Next Phase
🔄 Edit tenant configuration UI  
🔄 Protected route management UI  
🔄 Payment analytics & charts  
🔄 Email notifications  
🔄 Custom domain setup guide  

### Future
⏳ Webhook integrations  
⏳ API key authentication  
⏳ Rate limiting per wallet  
⏳ Multi-signature support  

---

## Support

- **Issues**: https://github.com/reflecterlabs/x402-proxy/issues
- **Wallet Help**: See [WALLET_SETUP.md](./WALLET_SETUP.md)
- **x402 Protocol**: https://docs.coinbase.com/payments-x402/docs
- **Cloudflare Docs**: https://developers.cloudflare.com/workers/

---

## License

This project is open source and available under the MIT License.

---

**Made with ❤️ for payment-gated content**  
*Using x402 protocol and Cloudflare Workers*
