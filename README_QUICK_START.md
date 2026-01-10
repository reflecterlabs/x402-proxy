# x402hub - Quick Start Guide

**🚀 Already deployed and live!**

| Component | Status | URL |
|-----------|--------|-----|
| Dashboard | ✅ Live | https://x402-proxy.pages.dev/ |
| API Server | ✅ Live | https://x402-proxy.cxto21h.workers.dev/ |
| GitHub | ✅ Active | https://github.com/reflecterlabs/x402-proxy |

---

## 🎯 In 2 Minutes

**Want to start right now?**

1. Open https://x402-proxy.pages.dev/
2. Click **"Connect Wallet"** (top right) → approve MetaMask
3. Click **"+ New Tenant"** → fill form → click "Create"
4. ✅ Done! Your first tenant is created

**That's all!** See "Step-by-Step" below for full details.

---

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
2. Look at the **top right corner** - you'll see **"Connect Wallet"** button
3. Click it → MetaMask popup appears
4. Click "Approve" to connect
5. Your wallet address now shows in the button (e.g., 0x1234...5678 in green)

**Important:** Make sure MetaMask says you're on:
- **Base Sepolia** (for testing) ← recommended
- **Base** (for production)

### 2. Create a Multi-Tenant

1. Click **"+ New Tenant"** button
2. Fill the form:
   - **Subdomain**: Your unique name (e.g., "mycompany", "api-test")
   - **Tenant Name**: Display name (e.g., "My Company API")
   - **Wallet Address**: AUTO-FILLED with your connected wallet ✓
   - **Network**: Base Sepolia (default, good for testing)
   - **Origin URL** (optional): Your backend API
3. Click **"Create Tenant"** button

**That's it!** Your tenant is created.

### 3. Set Up Protected Routes (Next Step)

After creating a tenant:
1. Go to **"Tenants"** tab
2. Click your new tenant
3. Add protected routes with pricing
4. Example: `/api/premium/*` = $0.01

Users will need to pay to access protected routes.

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

## 🔑 Wallet Types - ETH vs STRK (IMPORTANT!)

### ✅ ETH (Ethereum) - USE THIS

**What is ETH?**
- Ethereum Virtual Machine (EVM) compatible wallet
- Works with: Base, Ethereum, Arbitrum, Polygon, Optimism
- Address format: `0x1234567890abcdef1234567890abcdef12345678` (starts with 0x)
- **This is what x402hub needs** ✓

**How to check if you have ETH:**
1. Open MetaMask
2. Look at network dropdown (top)
3. See "Base", "Ethereum", "Arbitrum"? → You have ETH ✓
4. See "Starknet"? → Wrong wallet, see below ❌

### ❌ STRK (Starknet) - DON'T USE

**What is STRK?**
- Starknet network wallet (different blockchain)
- NOT compatible with EVM (Ethereum Virtual Machine)
- Cannot be used with x402hub
- **Will NOT work** ❌

**How to identify STRK:**
- Address starts with `strk...` (not 0x)
- Network shows "Starknet"
- Installed from starknet.io (not metamask.io)

### ✅ Supported: EVM Wallets

**Popular EVM Wallets** (all work!)
- **MetaMask** ← Recommended, from metamask.io
- **WalletConnect** - Mobile wallets
- **Coinbase Wallet** - Official Coinbase
- **Argent** - Web3 wallet
- **Trust Wallet** - Mobile

**EVM Networks** (any of these work)
- **Base** (recommended) - Fast & cheap
- **Ethereum** - Original, higher gas
- **Arbitrum** - Cheap L2
- **Polygon** - Very cheap
- **Optimism** - Fast L2

### ❌ Not Supported

| Wallet Type | Why Not |
|-------------|---------|
| STRK (Starknet) | Different architecture |
| SOL (Solana) | Different blockchain |
| Bitcoin | Not compatible |
| Lightning Network | Not a wallet |

---

**TL;DR:** If it's MetaMask or works on Ethereum/Base/Arbitrum, it works. If it says STRK or Starknet, don't use it!

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

### 🔴 Multi-Tenant Creation Fails / "Can't Create Tenant"

**Check these first:**

1. **Is Connect Wallet visible in top right?**
   - Should show either "Connect Wallet" button OR your address (0x1234...5678)
   - If you don't see it, refresh the page

2. **Are you connected?**
   - Click "**Connect Wallet**" button (top right)
   - MetaMask popup will appear
   - Approve the connection
   - Button should now show your address in green

3. **Do you have an EVM wallet?** (NOT Starknet/STRK!)
   - Open MetaMask
   - Click network dropdown
   - **See "Base", "Ethereum", "Arbitrum"?** → You're good ✓
   - **See "Starknet"?** → Wrong wallet, switch networks or install MetaMask ❌

4. **Try creating again:**
   - Click "+ New Tenant"
   - Wallet address should auto-fill
   - Choose a unique subdomain (e.g., "myapp", "api-test")
   - Click "Create Tenant"

5. **If creation fails, check the error:**
   - Press `F12` key → Console tab
   - Look for red error text
   - Share the error message

### "Connect Wallet to Create" (Button Disabled)

**Problem**: Can't click "+ New Tenant" button  
**Solution**:
- Click "**Connect Wallet**" at top right first
- MetaMask popup appears
- Approve the connection
- Button changes to show your address (0x1234...5678) in green
- Now you can create tenants

### "Invalid Ethereum address format"

**Problem**: Red error under wallet field in form  
**Solution**:
- Address must start with `0x`
- Must be exactly 42 characters total (0x + 40 hex)
- Example: `0x1234567890abcdef1234567890abcdef12345678`
- **Should auto-fill when connected** - if not, manually copy from MetaMask:
  1. Open MetaMask
  2. Click your account name
  3. Click copy icon next to address
  4. Paste into dashboard form

### "Subdomain Already Exists"

**Problem**: Can't create tenant - says name is taken  
**Solution**:
- Subdomains must be unique globally
- Choose a different name:
  - Try: "mycompany-api" instead of "api"
  - Try: "test-jan2025" instead of "test"
  - Try: "acme-prod" instead of "acme"
- Add numbers or company name to make it unique

### "Can't Find Connect Wallet Button"

**Problem**: Don't see "Connect Wallet" button anywhere  
**Solution**:
- Refresh the page (press `F5`)
- Button should be in **top right corner** of header
- Next to the "Tenants" and "Dashboard" menu buttons
- If still missing, check browser console (F12) for errors
- Try a different browser

### Wallet Won't Connect / MetaMask Popup Doesn't Appear

**Problem**: Click Connect Wallet but nothing happens  
**Solution**:
1. **Ensure MetaMask is installed:**
   - Go to https://metamask.io
   - Install the browser extension
   - Create or import your account
2. **Refresh the dashboard page** (press `F5`)
3. **Click "Connect Wallet" again**
4. **MetaMask popup should appear** - approve the connection
5. If still broken:
   - Open browser console (F12 key)
   - Look for red error messages
   - Share the error text

### Wrong Wallet Type (STRK instead of ETH)

**Problem**: "I installed MetaMask but wallet won't work"  
**Solution**:
- Check MetaMask → Network dropdown
- **See "Ethereum", "Base", "Arbitrum"?** → You have EVM, good to go ✓
- **See "Starknet"?** → You're on wrong network ❌
  - Click "Ethereum" or "Base" instead
- **See STRK token?** → That's Starknet, not compatible
  - x402hub only works with EVM networks
  - Install MetaMask from https://metamask.io if you don't have it

### No Tenants Show Up / "No Tenants Yet"

**Problem**: Dashboard is empty after creating tenant  
**Solution**:
1. Verify wallet is connected (address visible in top right)
2. Try refreshing the page (press `F5`)
3. Check if tenant actually created:
   ```bash
   curl https://x402-proxy.cxto21h.workers.dev/api/tenants | jq .
   ```
4. If API returns your tenant but dashboard doesn't show it:
   - Open browser console (F12)
   - Look for error messages
   - Share the error

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
