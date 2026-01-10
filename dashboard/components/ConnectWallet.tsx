'use client'

import { useAuth } from '@/app/providers'

export default function ConnectWallet() {
  const { address, isConnected, connectWallet, disconnectWallet, loading } = useAuth()

  const displayAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''

  return (
    <div className="flex items-center gap-3">
      {!isConnected ? (
        <button
          onClick={connectWallet}
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-dark transition disabled:opacity-50"
        >
          {loading ? 'Conectando...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <div className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
            🔗 {displayAddress}
          </div>
          <button
            onClick={disconnectWallet}
            className="px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100 transition"
          >
            Desconectar
          </button>
        </div>
      )}
    </div>
  )
}
