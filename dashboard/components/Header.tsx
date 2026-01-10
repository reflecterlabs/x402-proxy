export default function Header({ view, setView }: any) {
  return (
    <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-dark">
            x402<span className="text-primary">hub</span>
          </h1>
        </div>

        <nav className="flex gap-4">
          <button
            onClick={() => setView('dashboard')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              view === 'dashboard'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setView('tenants')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              view === 'tenants'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Tenants
          </button>
          <button
            onClick={() => setView('create')}
            className="px-4 py-2 rounded-lg font-medium bg-primary text-white hover:bg-dark transition"
          >
            + New Tenant
          </button>
        </nav>
      </div>
    </header>
  )
}
