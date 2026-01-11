'use client'

import { SignIn } from '@clerk/nextjs'
import { dark } from '@clerk/themes'

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">x402-proxy</h1>
          <p className="text-gray-400">Inicia sesión para continuar</p>
        </div>
        <SignIn
          appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: '#3b82f6',
              colorBackground: '#1f2937',
              colorInputBackground: '#374151',
              colorInputText: '#f3f4f6',
              colorText: '#f3f4f6',
              colorTextSecondary: '#d1d5db',
            },
          }}
          redirectUrl="/dashboard"
        />
      </div>
    </div>
  )
}
