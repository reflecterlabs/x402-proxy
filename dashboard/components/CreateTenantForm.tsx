'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useUser } from '@clerk/nextjs'
import { useFetchWallet } from '../lib/hooks/useFetchWallet'

export default function CreateTenantForm({ onSubmit }: any) {
  const { user, isLoaded: userLoaded } = useUser()
  const { wallet, isLoading: walletLoading } = useFetchWallet()
  
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm({
    defaultValues: {
      subdomain: '',
      name: '',
      wallet_address: '',
      network: 'starknet-sepolia',
      origin_url: '',
      origin_service: '',
    },
  })

  useEffect(() => {
    if (wallet?.publicKey) {
      setValue('wallet_address', wallet.publicKey)
    }
  }, [wallet?.publicKey, setValue])

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const onSubmitForm = async (data: any) => {
    setLoading(true)
    try {
      await onSubmit(data)
      setMessage('Tenant created successfully!')
      reset()
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('Failed to create tenant')
    }
    setLoading(false)
  }

  if (!userLoaded) {
    return <div className="text-center text-gray-600">Cargando...</div>
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="p-6 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
          <p className="font-medium">⚠ Inicia sesión para crear un tenant</p>
          <p className="text-sm mt-1">Haz clic en el botón "Conectar Wallet" en la esquina superior derecha para iniciar sesión.</p>
          <a href="/auth" className="mt-3 inline-block px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800">
            Ir a iniciar sesión
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Crear nuevo Tenant</h2>

      <form onSubmit={handleSubmit(onSubmitForm)} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Subdominio</label>
          <input
            {...register('subdomain', { required: 'El subdominio es requerido' })}
            placeholder="acme"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
          />
          {errors.subdomain && <p className="text-red-600 text-sm mt-1">{errors.subdomain.message}</p>}
          <p className="text-xs text-gray-600 mt-1">Tu prefijo de dominio único (ej: "micompania")</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Nombre del Tenant</label>
          <input
            {...register('name', { required: 'El nombre del tenant es requerido' })}
            placeholder="Mi API"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
          />
          {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
          <p className="text-xs text-gray-600 mt-1">Nombre visible para tu tenant (ej: "API Acme")</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Dirección Starknet</label>
          <input
            {...register('wallet_address', {
              required: 'La dirección del wallet es requerida',
              pattern: {
                value: /^0x[a-fA-F0-9]{1,64}$/,
                message: 'Formato de dirección Starknet inválido (debe ser 0x seguido de caracteres hexadecimales)'
              }
            })}
            placeholder="0x..."
            disabled={!!wallet?.publicKey}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary ${
              wallet?.publicKey ? 'bg-gray-50 cursor-not-allowed' : ''
            }`}
          />
          {errors.wallet_address && <p className="text-red-600 text-sm mt-1">{errors.wallet_address.message}</p>}
          {wallet?.publicKey && <p className="text-xs text-green-600 mt-1">✓ Conectado: {wallet.publicKey.slice(0, 6)}...{wallet.publicKey.slice(-4)}</p>}
          {!wallet?.publicKey && <p className="text-xs text-blue-600 mt-1">ℹ Sin wallet aún. Se creará cuando envíes el formulario.</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Red</label>
          <select
            {...register('network')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="starknet-sepolia">Starknet Sepolia (Testnet)</option>
            <option value="starknet">Starknet (Mainnet)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">URL de Origen (opcional)</label>
          <input
            {...register('origin_url')}
            placeholder="https://api.example.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
          />
          <p className="text-xs text-gray-600 mt-1">Dónde dirigir las solicitudes</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Servicio de Origen (opcional)</label>
          <input
            {...register('origin_service')}
            placeholder="mi-worker"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
          />
          <p className="text-xs text-gray-600 mt-1">Nombre del service binding de Cloudflare Workers</p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg text-sm font-medium ${
            message.includes('success') 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !user}
          className="w-full px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creando...' : !user ? 'Inicia sesión para crear' : 'Crear Tenant'}
        </button>
      </form>
    </div>
  )
}
