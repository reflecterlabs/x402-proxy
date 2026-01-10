'use client'

import { createContext, useContext, useState, useEffect } from 'react'

interface AuthContextType {
  address: string | null
  isConnected: boolean
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(false)

  // Verificar conexión previa
  useEffect(() => {
    checkWalletConnection()
  }, [])

  const checkWalletConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = (await window.ethereum.request({
          method: 'eth_accounts',
        })) as string[]
        if (accounts.length > 0) {
          setAddress(accounts[0])
          setIsConnected(true)
        }
      } catch (error) {
        console.error('Error checking wallet:', error)
      }
    }
  }

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Por favor instala MetaMask o una wallet compatible')
      return
    }

    setLoading(true)
    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[]
      
      if (accounts.length > 0) {
        setAddress(accounts[0])
        setIsConnected(true)
        
        // Guardar en localStorage para persistencia
        localStorage.setItem('walletAddress', accounts[0])
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      alert('Error conectando wallet. Asegúrate de estar en Base network.')
    } finally {
      setLoading(false)
    }
  }

  const disconnectWallet = () => {
    setAddress(null)
    setIsConnected(false)
    localStorage.removeItem('walletAddress')
  }

  return (
    <AuthContext.Provider value={{ address, isConnected, connectWallet, disconnectWallet, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
