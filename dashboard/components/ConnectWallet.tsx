'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { useGetWallet } from '@chipi-stack/nextjs'

export default function ConnectWallet() {
  const { user, isLoaded: userLoaded } = useUser()
  const { signOut } = useClerk()
  
  const { data: wallet } = useGetWallet()

  if (!userLoaded) {
    return (
      <button disabled className="px-4 py-2 rounded-lg bg-gray-200 text-gray-500">
        Cargando...
      </button>
    )
  }

  if (!user) {
    return (
      <button
        onClick={() => window.location.href = '/auth'}
        className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-dark transition"
      >
        Conectar Wallet
      </button>
    )
  }

  const displayAddress = wallet?.publicKey 
    ? `${wallet.publicKey.slice(0, 6)}...${wallet.publicKey.slice(-4)}`
    : 'Generando...'

  return (
    <div className="flex items-center gap-3">
      <div className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
        🔗 {displayAddress}
      </div>
      <button
        onClick={() => signOut()}
        className="px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100 transition"
      >
        Desconectar
      </button>
    </div>
  )
}
