'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import Header from '@/components/Header'
import TenantsList from '@/components/TenantsList'
import CreateTenantForm from '@/components/CreateTenantForm'
import Dashboard from '@/components/Dashboard'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://x402-proxy.cxto21h.workers.dev'

export default function Home() {
  const [view, setView] = useState<'dashboard' | 'tenants' | 'create'>('dashboard')
  const [tenants, setTenants] = useState<any[]>([])
  const [selectedTenant, setSelectedTenant] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE}/api/tenants`)
      setTenants(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch tenants:', error)
    }
    setLoading(false)
  }

  const handleCreateTenant = async (data: any) => {
    try {
      await axios.post(`${API_BASE}/api/tenants`, data)
      await fetchTenants()
      setView('tenants')
    } catch (error) {
      console.error('Failed to create tenant:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      <Header view={view} setView={setView} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'dashboard' && (
          <Dashboard 
            tenants={tenants} 
            onSelectTenant={(tenant: any) => {
              setSelectedTenant(tenant)
              setView('tenants')
            }}
          />
        )}

        {view === 'tenants' && (
          <TenantsList 
            tenants={tenants} 
            selectedTenant={selectedTenant}
            onRefresh={fetchTenants}
          />
        )}

        {view === 'create' && (
          <CreateTenantForm onSubmit={handleCreateTenant} />
        )}
      </main>
    </div>
  )
}
