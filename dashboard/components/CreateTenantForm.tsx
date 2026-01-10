'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../app/providers'

export default function CreateTenantForm({ onSubmit }: any) {
  const { address, isConnected } = useAuth()
  
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm({
    defaultValues: {
      subdomain: '',
      wallet_address: '',
      network: 'base-sepolia',
      origin_url: '',
      origin_service: '',
    },
  })

  useEffect(() => {
    if (isConnected && address) {
      setValue('wallet_address', address)
    }
  }, [isConnected, address, setValue])

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Create New Tenant</h2>

      <form onSubmit={handleSubmit(onSubmitForm)} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Subdomain</label>
          <input
            {...register('subdomain', { required: 'Subdomain is required' })}
            placeholder="acme"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
          />
          {errors.subdomain && <p className="text-red-600 text-sm mt-1">{errors.subdomain.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Wallet Address (EVM)</label>
          <input
            {...register('wallet_address', {
              required: 'Wallet address is required',
              pattern: {
                value: /^0x[a-fA-F0-9]{40}$/,
                message: 'Invalid Ethereum address format (must be 0x followed by 40 hex characters)'
              }
            })}
            placeholder="0x..."
            disabled={isConnected}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary ${
              isConnected ? 'bg-gray-50 cursor-not-allowed' : ''
            }`}
          />
          {errors.wallet_address && <p className="text-red-600 text-sm mt-1">{errors.wallet_address.message}</p>}
          {isConnected && <p className="text-xs text-green-600 mt-1">✓ Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>}
          {!isConnected && <p className="text-xs text-amber-600 mt-1">⚠ Connect your wallet first (Base network)</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Network</label>
          <select
            {...register('network')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="base-sepolia">Base Sepolia (Testnet)</option>
            <option value="base">Base (Mainnet)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Origin URL (optional)</label>
          <input
            {...register('origin_url')}
            placeholder="https://api.example.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
          />
          <p className="text-xs text-gray-600 mt-1">Where to proxy requests to</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Origin Service (optional)</label>
          <input
            {...register('origin_service')}
            placeholder="my-worker"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
          />
          <p className="text-xs text-gray-600 mt-1">Cloudflare Workers service binding name</p>
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

        {!isConnected && (
          <div className="p-4 rounded-lg bg-amber-50 text-amber-700 text-sm border border-amber-200">
            <p className="font-medium">⚠ Connect your wallet to create a tenant</p>
            <p className="text-xs mt-1">Click the "Connect Wallet" button in the top right corner to proceed.</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !isConnected}
          className="w-full px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : !isConnected ? 'Connect wallet to create' : 'Create Tenant'}
        </button>
      </form>
    </div>
  )
}
