import type { Metadata } from 'next'
import './globals.css'
import { StarknetAuthProvider } from './providers-starknet'

export const metadata: Metadata = {
  title: 'x402hub Dashboard | Starknet Payment Gateway',
  description: 'Manage your payment-gated APIs on Starknet with ChipiPay',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-white to-gray-50">
        <StarknetAuthProvider>
          {children}
        </StarknetAuthProvider>
      </body>
    </html>
  )
}
