'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useUser } from '@clerk/nextjs'
import { useFetchWallet } from '../lib/hooks/useFetchWallet'

export default function CreateTenantForm({ onSubmit }: any) {
  const { user, isLoaded: userLoaded } = useUser()
  const { wallet, isLoading: walletLoading } = useFetchWallet()
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      name: '',
    },
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const onSubmitForm = async (data: any) => {
    // Validaciones
    if (!user) {
      setMessage({ type: 'error', text: 'Debes estar autenticado' })
      return
    }

    if (!wallet?.publicKey) {
      setMessage({ type: 'error', text: 'Necesitas conectar tu wallet de Starknet primero' })
      return
    }

    if (!data.name || data.name.trim().length < 3) {
      setMessage({ type: 'error', text: 'El nombre debe tener al menos 3 caracteres' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      // Generar subdomain a partir del nombre (lowercase, sin espacios, solo alphanumerico)
      const subdomain = data.name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .substring(0, 30)

      if (!subdomain) {
        setMessage({ type: 'error', text: 'El nombre debe contener caracteres alfanuméricos' })
        setLoading(false)
        return
      }

      const tenantData = {
        name: data.name.trim(),
        subdomain,
        wallet_address: wallet.publicKey,
        network: 'starknet-sepolia',
        origin_url: null,
        origin_service: null,
      }

      await onSubmit(tenantData)
      setMessage({ 
        type: 'success', 
        text: `✅ Tenant "${data.name}" creado exitosamente. Subdomain: ${subdomain}.x402-proxy.pages.dev` 
      })
      reset()
      setTimeout(() => setMessage(null), 5000)
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error?.message || 'Error al crear el tenant' 
      })
    }
    setLoading(false)
  }

  if (!userLoaded) {
    return <div className="text-center text-gray-600">Cargando autenticación...</div>
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto">
        <div className="p-6 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
          <p className="font-medium">⚠️ Inicia sesión para crear un tenant</p>
          <p className="text-sm mt-1">Haz clic en "Sign In" en la esquina superior derecha</p>
          <a href="/auth" className="mt-3 inline-block px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 text-sm">
            Ir a iniciar sesión
          </a>
        </div>
      </div>
    )
  }

  if (walletLoading) {
    return <div className="text-center text-gray-600">Conectando wallet...</div>
  }

  if (!wallet?.publicKey) {
    return (
      <div className="max-w-md mx-auto">
        <div className="p-6 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
          <p className="font-medium">🔗 Conecta tu wallet de Starknet</p>
          <p className="text-sm mt-1">Haz clic en el botón de wallet en la esquina superior derecha</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Crear Tenant</h2>
        <p className="text-sm text-gray-600 mt-1">Simple y rápido</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmitForm)} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        {/* Nombre del Tenant */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Nombre del Tenant *
          </label>
          <input
            {...register('name', { 
              required: 'El nombre es requerido',
              minLength: { value: 3, message: 'Mínimo 3 caracteres' },
              maxLength: { value: 50, message: 'Máximo 50 caracteres' }
            })}
            placeholder="Mi Aplicación"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={loading}
          />
          {errors.name && (
            <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">Se convertirá en tu subdominio automáticamente</p>
        </div>

        {/* Mostrar wallet conectado */}
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600">Wallet Starknet conectado:</p>
          <p className="text-sm font-mono text-gray-900 truncate">
            {wallet.publicKey}
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !user || !wallet?.publicKey}
          className={`w-full py-2 px-4 rounded-lg font-medium text-white transition ${
            loading || !user || !wallet?.publicKey
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {loading ? 'Creando...' : 'Crear Tenant'}
        </button>
      </form>
    </div>
  )
}
