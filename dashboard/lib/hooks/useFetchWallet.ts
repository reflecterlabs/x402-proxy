'use client'

import { useCallback } from 'react'
import { useGetWallet } from '@chipi-stack/nextjs'
import { useUser, useAuth } from '@clerk/nextjs'

/**
 * Hook personalizado para obtener la wallet del usuario desde ChipiPay
 * Sigue el patrón de Open-The-Doorz
 */
export function useFetchWallet() {
  const { user: clerkUser } = useUser()
  const { getToken: getClerkToken } = useAuth()

  const getBearerToken = useCallback(async () => {
    if (clerkUser) {
      return await getClerkToken()
    }
    return null
  }, [clerkUser, getClerkToken])

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
