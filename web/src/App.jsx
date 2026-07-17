import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { LayoutDashboard, Boxes, Receipt, Gauge, Plug, Settings as SettingsIcon, LogOut, Wallet } from 'lucide-react'
import { api } from './api.js'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Apps from './pages/Apps.jsx'
import Charges from './pages/Charges.jsx'
import Meters from './pages/Meters.jsx'
import Connections from './pages/Connections.jsx'
import Settings from './pages/Settings.jsx'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/apps', icon: Boxes, label: 'Apps' },
  { to: '/cobros', icon: Receipt, label: 'Cobros' },
  { to: '/tarifas', icon: Gauge, label: 'Tarifas' },
  { to: '/conexiones', icon: Plug, label: 'Conexiones' },
  { to: '/configuracion', icon: SettingsIcon, label: 'Configuración' },
]

export default function App() {
  const [auth, setAuth] = useState(null) // null = cargando, false = sin sesión, true = admin

  useEffect(() => {
    api.get('/api/admin/me').then(() => setAuth(true)).catch(() => setAuth(false))
  }, [])

  if (auth === null) {
    return <div className="min-h-screen grid place-items-center text-mut text-sm">Cargando…</div>
  }
  if (!auth) return <Login onLogin={() => setAuth(true)} />

  const logout = async () => {
    await api.post('/api/admin/logout').catch(() => {})
    setAuth(false)
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-border bg-card/50 flex flex-col">
        <div className="px-5 py-6 flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/30 grid place-items-center">
            <Wallet size={18} className="text-gold" />
          </span>
          <div>
            <div className="font-bold text-sm leading-tight">Disruptivo Wallet</div>
            <div className="text-[11px] text-mut leading-tight">Pasarela de cobros GHL</div>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive ? 'bg-gold/10 text-gold' : 'text-ink2 hover:bg-card2 hover:text-ink'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="m-3 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-ink2 hover:bg-card2 hover:text-ink"
        >
          <LogOut size={16} />
          Salir
        </button>
      </aside>
      <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-x-hidden">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/apps" element={<Apps />} />
          <Route path="/cobros" element={<Charges />} />
          <Route path="/tarifas" element={<Meters />} />
          <Route path="/conexiones" element={<Connections />} />
          <Route path="/configuracion" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
