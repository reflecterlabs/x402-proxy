import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'x402hub Dashboard',
  description: 'Manage your payment-gated APIs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-white to-gray-50">{children}</body>
    </html>
  )
}
