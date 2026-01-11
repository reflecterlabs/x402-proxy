'use client'

import React, { ReactNode } from 'react'
import { ClerkProvider } from '@clerk/nextjs'
import { ChipiClientProvider } from '@chipi-stack/nextjs'

export function StarknetAuthProvider({ children }: { children: ReactNode }) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const chipiKey = process.env.NEXT_PUBLIC_CHIPI_API_KEY

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
          <p className="text-xs text-gray-500 mt-4">See SETUP_CLERK_CHIPI.md for configuration instructions</p>
        </div>
      </div>
    )
  }

  return (
    <ClerkProvider 
      publishableKey={clerkKey}
      signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}
      signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL}
      afterSignInUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL}
      afterSignUpUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL}
    >
      <ChipiClientProvider 
        apiPublicKey={chipiKey}
      >
        {children}
      </ChipiClientProvider>
    </ClerkProvider>
  )
}
