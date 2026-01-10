'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'

export default function CreateTenantForm({ onSubmit }: any) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      subdomain: '',
      wallet_address: '',
      network: 'base-sepolia',
      origin_url: '',
      origin_service: '',
    },
  })

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
          <label className="block text-sm font-medium text-gray-900 mb-2">Wallet Address</label>
          <input
            {...register('wallet_address', { required: 'Wallet address is required' })}
            placeholder="0x..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
          />
          {errors.wallet_address && <p className="text-red-600 text-sm mt-1">{errors.wallet_address.message}</p>}
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

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-dark transition disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Tenant'}
        </button>
      </form>
    </div>
  )
}
