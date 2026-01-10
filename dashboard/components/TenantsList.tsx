import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://x402-proxy.cxto21h.workers.dev'

export default function TenantsList({ tenants, selectedTenant, onRefresh }: any) {
  const handleDelete = async (tenantId: string) => {
    if (confirm('Are you sure you want to deactivate this tenant?')) {
      try {
        await axios.delete(`${API_BASE}/api/tenants/${tenantId}`)
        onRefresh()
      } catch (error) {
        console.error('Failed to delete tenant:', error)
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Tenants</h2>
        <button
          onClick={onRefresh}
          className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-900 font-medium hover:bg-gray-50 transition"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenants List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 px-4 py-3 bg-gray-50">
              <p className="font-medium text-sm text-gray-900">All Tenants</p>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {tenants.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-600">No tenants</p>
              ) : (
                tenants.map((tenant: any) => (
                  <div
                    key={tenant.id}
                    className={`px-4 py-3 cursor-pointer transition ${
                      selectedTenant?.id === tenant.id
                        ? 'bg-orange-50 border-l-4 border-primary'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium text-sm text-gray-900">{tenant.subdomain}</p>
                    <p className="text-xs text-gray-600 mt-1">{tenant.status}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Tenant Details */}
        {selectedTenant && (
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedTenant.subdomain}</h3>
                  <p className="text-sm text-gray-600 mt-1">ID: {selectedTenant.id}</p>
                </div>
                <button
                  onClick={() => handleDelete(selectedTenant.id)}
                  className="px-4 py-2 rounded-lg bg-red-50 text-red-600 font-medium hover:bg-red-100 transition"
                >
                  Deactivate
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-600">SUBDOMAIN</p>
                    <p className="text-sm text-gray-900 font-medium mt-1">
                      {selectedTenant.subdomain}.x402hub.com
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600">NETWORK</p>
                    <p className="text-sm text-gray-900 font-medium mt-1">{selectedTenant.network}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-gray-600">WALLET ADDRESS</p>
                    <p className="text-sm text-gray-900 font-mono mt-1 break-all">
                      {selectedTenant.wallet_address}
                    </p>
                  </div>
                  {selectedTenant.origin_url && (
                    <div className="col-span-2">
                      <p className="text-xs font-medium text-gray-600">ORIGIN URL</p>
                      <p className="text-sm text-blue-600 font-mono mt-1 break-all">
                        {selectedTenant.origin_url}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="font-bold text-gray-900 mb-4">Protected Routes</h4>
              <p className="text-sm text-gray-600">Configure routes for this tenant in the API</p>
            </div>
          </div>
        )}

        {!selectedTenant && (
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-12 flex items-center justify-center">
            <p className="text-gray-600 text-center">Select a tenant to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}
