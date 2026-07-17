import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { api, fmtDate } from '../api.js'
import { Card, Button, Input, Select, Modal, Badge, Th, Td, Empty } from '../components/ui.jsx'

const STATUS_BADGE = {
  active: 'active', trial: 'test', comped: 'connected', scheduled: 'pending', expired: 'disconnected', canceled: 'revoked',
}
const DerivedBadge = ({ s }) => <Badge status={STATUS_BADGE[s] || 'disconnected'} />

const EMPTY = { location_id: '', target: '', status: 'active', months: '', notes: '' }

export default function Subscriptions() {
  const [subs, setSubs] = useState(null)
  const [apps, setApps] = useState([])
  const [plans, setPlans] = useState([])
  const [conns, setConns] = useState([])
  const [creating, setCreating] = useState(null)
  const [extend, setExtend] = useState(null) // { sub, months }
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => api.get('/api/admin/subscriptions').then((d) => setSubs(d.subscriptions)).catch((e) => setError(e.message))
  useEffect(() => {
    load()
    api.get('/api/admin/apps').then((d) => setApps(d.apps)).catch(() => {})
    api.get('/api/admin/plans').then((d) => setPlans(d.plans)).catch(() => {})
    api.get('/api/admin/connections').then((d) => setConns(d.connections)).catch(() => {})
  }, [])

  const create = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const body = { location_id: creating.location_id.trim(), status: creating.status, notes: creating.notes }
      if (creating.months) body.months = Number(creating.months)
      if (creating.target.startsWith('app:')) body.app_id = Number(creating.target.slice(4))
      else if (creating.target.startsWith('plan:')) body.plan_id = Number(creating.target.slice(5))
      await api.post('/api/admin/subscriptions', body)
      setCreating(null); load()
    } catch (err) { alert(err.message) } finally { setBusy(false) }
  }

  const patch = async (id, body) => { await api.patch(`/api/admin/subscriptions/${id}`, body).catch((e) => alert(e.message)); load() }
  const cancel = async (s) => {
    if (!confirm(`¿Cortar el acceso de ${s.location_name} a ${s.app_name || s.plan_name}?`)) return
    await api.del(`/api/admin/subscriptions/${s.id}`).catch((e) => alert(e.message)); load()
  }

  const set = (k) => (e) => setCreating((s) => ({ ...s, [k]: e.target.value }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Suscripciones y accesos</h1>
        <Button onClick={() => setCreating({ ...EMPTY })}><Plus size={15} className="inline -mt-0.5 mr-1" />Dar acceso</Button>
      </div>
      <p className="text-sm text-ink2 -mt-3">Da acceso a una subcuenta a una app o plan — por tiempo (meses) o indefinido, de pago o de cortesía. Tus apps preguntan el acceso con <code className="text-gold">GET /api/v1/access/&lt;locationId&gt;</code>.</p>

      {error && <Empty>{error}</Empty>}
      {subs && subs.length === 0 && <Card><Empty>Aún no has dado ningún acceso.</Empty></Card>}
      {subs && subs.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Subcuenta</Th><Th>App / Plan</Th><Th>Estado</Th><Th>Desde</Th><Th>Hasta</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <Td>
                    {s.location_name}
                    {s.notes && <div className="text-[11px] text-mut max-w-56 truncate" title={s.notes}>{s.notes}</div>}
                  </Td>
                  <Td className="text-ink2">{s.app_name || <span className="text-gold">plan: {s.plan_name}</span>}</Td>
                  <Td><DerivedBadge s={s.derived} /></Td>
                  <Td className="text-ink2 whitespace-nowrap">{fmtDate(s.starts_at)}</Td>
                  <Td className="text-ink2 whitespace-nowrap">{s.ends_at ? fmtDate(s.ends_at) : '∞'}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <button className="text-xs text-ink2 hover:text-gold mr-3" onClick={() => setExtend({ sub: s, months: 1 })}>Prorrogar</button>
                    {s.derived !== 'canceled' && s.derived !== 'expired' && (
                      <button className="text-xs text-bad/80 hover:text-bad" onClick={() => cancel(s)}>Cortar</button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {creating && (
        <Modal title="Dar acceso" onClose={() => setCreating(null)}>
          <form onSubmit={create} className="space-y-4">
            <Select label="Subcuenta" value={creating.location_id} onChange={set('location_id')}>
              <option value="">— elige —</option>
              {conns.map((c) => <option key={c.id} value={c.location_id}>{c.alias || c.name || c.location_id}</option>)}
            </Select>
            <Select label="App o plan" value={creating.target} onChange={set('target')}>
              <option value="">— elige —</option>
              <optgroup label="Apps">{apps.map((a) => <option key={`app${a.id}`} value={`app:${a.id}`}>{a.name}</option>)}</optgroup>
              <optgroup label="Planes">{plans.map((p) => <option key={`plan${p.id}`} value={`plan:${p.id}`}>{p.name}</option>)}</optgroup>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Estado" value={creating.status} onChange={set('status')}>
                <option value="active">Activo (pagado)</option>
                <option value="trial">Prueba</option>
                <option value="comped">Cortesía</option>
              </Select>
              <Input label="Duración (meses, vacío = indefinido)" type="number" min="1" value={creating.months} onChange={set('months')} />
            </div>
            <Input label="Nota (opcional)" value={creating.notes} onChange={set('notes')} placeholder="p. ej. pagó por transferencia" />
            <Button className="w-full" disabled={busy || !creating.location_id || !creating.target}>Conceder acceso</Button>
          </form>
        </Modal>
      )}

      {extend && (
        <Modal title={`Prorrogar acceso`} onClose={() => setExtend(null)}>
          <div className="space-y-4">
            <p className="text-sm text-ink2">{extend.sub.location_name} → {extend.sub.app_name || extend.sub.plan_name}</p>
            <Input label="Meses a partir de ahora" type="number" min="1" value={extend.months} onChange={(e) => setExtend((x) => ({ ...x, months: e.target.value }))} />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={async () => { await patch(extend.sub.id, { months: Number(extend.months) || 1, status: extend.sub.derived === 'canceled' || extend.sub.derived === 'expired' ? 'active' : undefined }); setExtend(null) }}>
                Extender
              </Button>
              <Button variant="ghost" onClick={async () => { await patch(extend.sub.id, { ends_at: null, status: (extend.sub.derived === 'canceled' || extend.sub.derived === 'expired') ? 'active' : undefined }); setExtend(null) }}>Hacer indefinido</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
