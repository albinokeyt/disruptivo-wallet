import { useEffect, useState } from 'react'
import { Plus, KeyRound, Copy, Check, MapPin } from 'lucide-react'
import { api, fmtUsd, fmtDate } from '../api.js'
import { Card, Button, Input, Badge, Modal, Th, Td, Empty, Toggle } from '../components/ui.jsx'

function ScopeModal({ app, onClose, onSaved }) {
  const [conns, setConns] = useState(null)
  const [all, setAll] = useState(!Array.isArray(app.allowed_location_ids))
  const [selected, setSelected] = useState(new Set(Array.isArray(app.allowed_location_ids) ? app.allowed_location_ids : []))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get('/api/admin/connections').then((d) => setConns(d.connections)).catch(() => setConns([]))
  }, [])

  const toggle = (locId) => {
    setSelected((s) => {
      const n = new Set(s)
      n.has(locId) ? n.delete(locId) : n.add(locId)
      return n
    })
  }

  const save = async () => {
    setBusy(true)
    try {
      await api.patch(`/api/admin/apps/${app.id}`, { allowed_location_ids: all ? null : [...selected] })
      onSaved()
      onClose()
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={`Subcuentas de "${app.name}"`} onClose={onClose}>
      <p className="text-xs text-ink2 mb-4">A qué subcuentas puede cobrar esta API key. Limitar el alcance reduce el daño si la clave se filtra.</p>
      <label className="flex items-center gap-2 text-sm mb-3">
        <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
        Todas las subcuentas conectadas (actuales y futuras)
      </label>
      {!all && (
        <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded-xl p-3">
          {conns === null && <p className="text-xs text-mut">Cargando…</p>}
          {conns?.length === 0 && <p className="text-xs text-mut">No hay conexiones todavía.</p>}
          {conns?.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.has(c.location_id)} onChange={() => toggle(c.location_id)} />
              <span>{c.alias || c.name || c.location_id}</span>
              <code className="text-[10px] text-mut">{c.location_id}</code>
            </label>
          ))}
        </div>
      )}
      <Button className="w-full mt-4" disabled={busy || (!all && selected.size === 0)} onClick={save}>
        Guardar alcance
      </Button>
    </Modal>
  )
}

function KeyReveal({ apiKey, appName, onClose }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <Modal title={`API key de "${appName}"`} onClose={onClose}>
      <p className="text-sm text-ink2 mb-3">
        Guárdala ahora: <b className="text-warn">solo se muestra una vez</b>. La app consumidora la envía en el header{' '}
        <code className="text-gold">Authorization: Bearer …</code>
      </p>
      <div className="flex gap-2">
        <code className="flex-1 bg-bg border border-border rounded-xl px-3 py-2.5 text-xs break-all">{apiKey}</code>
        <Button variant="ghost" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />}</Button>
      </div>
      <div className="mt-4 text-xs text-mut">
        Ejemplo de cobro:
        <pre className="bg-bg border border-border rounded-xl p-3 mt-2 overflow-x-auto text-[11px] leading-relaxed">{`curl -X POST $BASE/api/v1/charges \\
  -H "Authorization: Bearer ${apiKey.slice(0, 14)}…" \\
  -H "Content-Type: application/json" \\
  -d '{"location_id":"<locationId>","meter":"<codigo>","units":3,"event_id":"pedido-123"}'`}</pre>
      </div>
    </Modal>
  )
}

export default function Apps() {
  const [apps, setApps] = useState(null)
  const [error, setError] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [reveal, setReveal] = useState(null) // { apiKey, appName }
  const [scoping, setScoping] = useState(null) // app en edición de alcance
  const [busy, setBusy] = useState(false)

  const load = () => api.get('/api/admin/apps').then((d) => setApps(d.apps)).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const create = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const d = await api.post('/api/admin/apps', { name: newName })
      setShowNew(false)
      setNewName('')
      setReveal({ apiKey: d.api_key, appName: d.app.name })
      load()
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  const regenerate = async (app) => {
    if (!confirm(`¿Regenerar la API key de "${app.name}"? La clave actual dejará de funcionar al instante.`)) return
    const d = await api.post(`/api/admin/apps/${app.id}/regenerate`).catch((e) => alert(e.message))
    if (d) {
      setReveal({ apiKey: d.api_key, appName: d.app.name })
      load()
    }
  }

  const patch = async (app, body) => {
    await api.patch(`/api/admin/apps/${app.id}`, body).catch((e) => alert(e.message))
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Apps consumidoras</h1>
        <Button onClick={() => setShowNew(true)}><Plus size={15} className="inline -mt-0.5 mr-1" />Nueva app</Button>
      </div>
      <p className="text-sm text-ink2 -mt-3">
        Cada app (Hermes, tus próximas herramientas…) recibe una API key y cobra a través de esta pasarela.
      </p>

      {error && <Empty>{error}</Empty>}
      {apps && apps.length === 0 && <Card><Empty>Todavía no hay apps. Crea la primera para obtener su API key.</Empty></Card>}
      {apps && apps.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>App</Th>
                <Th>API key</Th>
                <Th className="text-right">Cobros</Th>
                <Th className="text-right">Facturado</Th>
                <Th>Modo prueba</Th>
                <Th>Estado</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id}>
                  <Td>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-[11px] text-mut">creada {fmtDate(a.created_at)}</div>
                  </Td>
                  <Td><code className="text-xs text-ink2">{a.key_prefix}</code></Td>
                  <Td className="text-right tabular-nums">{a.charges_count}</Td>
                  <Td className="text-right tabular-nums">{fmtUsd(a.amount_total)}</Td>
                  <Td><Toggle checked={a.test_mode} onChange={(v) => patch(a, { test_mode: v })} /></Td>
                  <Td><Badge status={a.status} /></Td>
                  <Td className="text-right whitespace-nowrap">
                    <button
                      className="text-xs text-ink2 hover:text-gold mr-3"
                      title="Subcuentas a las que puede cobrar"
                      onClick={() => setScoping(a)}
                    >
                      <MapPin size={14} className="inline -mt-0.5" />{' '}
                      {Array.isArray(a.allowed_location_ids) ? `${a.allowed_location_ids.length} subcuentas` : 'Todas'}
                    </button>
                    <button
                      className="text-xs text-ink2 hover:text-gold mr-3"
                      title="Regenerar API key"
                      onClick={() => regenerate(a)}
                    >
                      <KeyRound size={15} className="inline -mt-0.5" /> Regenerar
                    </button>
                    {a.status === 'active' ? (
                      <button className="text-xs text-bad/80 hover:text-bad" onClick={() => patch(a, { status: 'revoked' })}>
                        Revocar
                      </button>
                    ) : (
                      <button className="text-xs text-ok/80 hover:text-ok" onClick={() => patch(a, { status: 'active' })}>
                        Reactivar
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showNew && (
        <Modal title="Nueva app consumidora" onClose={() => setShowNew(false)}>
          <form onSubmit={create} className="space-y-4">
            <Input
              label="Nombre"
              placeholder="p. ej. Hermes Setter"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <Button className="w-full" disabled={busy || !newName.trim()}>Crear y generar API key</Button>
          </form>
        </Modal>
      )}
      {reveal && <KeyReveal apiKey={reveal.apiKey} appName={reveal.appName} onClose={() => setReveal(null)} />}
      {scoping && <ScopeModal app={scoping} onClose={() => setScoping(null)} onSaved={load} />}
    </div>
  )
}
