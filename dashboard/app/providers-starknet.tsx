'use client'

import React, { ReactNode } from 'react'
import { ClerkProvider } from '@clerk/nextjs'
import { ChipiClientProvider } from '@chipi-stack/nextjs'

export function StarknetAuthProvider({ children }: { children: ReactNode }) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const chipiKey = process.env.NEXT_PUBLIC_CHIPI_API_KEY
  const chipiUrl = process.env.NEXT_PUBLIC_CHIPI_ALPHA_URL

  if (!clerkKey || !chipiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-500">Configuration Error</h1>
          <p className="text-gray-400">Missing required environment variables:</p>
          <ul className="text-left inline-block space-y-1 text-sm text-gray-300">
            {!clerkKey && <li>- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</li>}
            {!chipiKey && <li>- NEXT_PUBLIC_CHIPI_API_KEY</li>}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <ClerkProvider publishableKey={clerkKey}>
      <ChipiClientProvider 
        apiPublicKey={chipiKey}
        alphaUrl={chipiUrl}
      >
        {children}
      </ChipiClientProvider>
    </ClerkProvider>
  )
}
