export default function Dashboard({ tenants, onSelectTenant }: any) {
  const totalTenants = tenants.length
  const totalRevenue = tenants.reduce((sum: number, t: any) => sum + (t.revenue || 0), 0)
  const totalRequests = tenants.reduce((sum: number, t: any) => sum + (t.total_requests || 0), 0)

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tenants</p>
              <p className="text-3xl font-bold text-gray-900">{totalTenants}</p>
            </div>
            <div className="text-4xl">🏢</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-primary">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-3xl font-bold text-gray-900">{totalRequests.toLocaleString()}</p>
            </div>
            <div className="text-4xl">⚡</div>
          </div>
        </div>
      </div>

      {/* Recent Tenants */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="font-bold text-gray-900">Recent Tenants</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {tenants.length === 0 ? (
            <p className="px-6 py-8 text-center text-gray-600">No tenants yet</p>
          ) : (
            tenants.slice(0, 5).map((tenant: any) => (
              <div
                key={tenant.id}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition"
                onClick={() => onSelectTenant(tenant)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{tenant.subdomain}</p>
                    <p className="text-sm text-gray-600">{tenant.wallet_address?.slice(0, 10)}...</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{tenant.network}</p>
                    <p className="text-sm text-gray-600">{tenant.status}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
