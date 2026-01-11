'use client'

import { useCallback } from 'react'
import { useGetWallet } from '@chipi-stack/nextjs'
import { useUser, useAuth as useClerkAuth } from '@clerk/nextjs'

/**
 * Hook personalizado para obtener la wallet del usuario desde ChipiPay
 * Sigue el patrón de Open-The-Doorz
 */
export function useFetchWallet() {
  const { user: clerkUser } = useUser()
  const { getToken } = useClerkAuth()

  const getBearerToken = useCallback(async () => {
    if (clerkUser) {
      try {
        return await getToken()
      } catch (error) {
        console.error('Error getting Clerk token:', error)
        return null
      }
    }
    return null
  }, [clerkUser, getToken])

  const activeUserId = clerkUser?.id

  const { data: walletData, isLoading, error, refetch } = useGetWallet({
    getBearerToken,
    params: activeUserId ? {
      externalUserId: activeUserId
    } : undefined,
  })

  return {
    wallet: walletData,
    isLoading,
    error,
    refetch,
  }
}
