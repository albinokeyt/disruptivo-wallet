import { useEffect, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { api, fmtUsd } from '../api.js'
import { Card, Button, Input, Select, Modal, Th, Td, Empty } from '../components/ui.jsx'

const EMPTY = { code: '', ghl_meter_id: '', name: '', unit_label: 'unidad', price_type: 'fixed', default_price: '', min_price: '', max_price: '' }

export default function Meters() {
  const [meters, setMeters] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null | { ...meter } (id ausente = nueva)
  const [busy, setBusy] = useState(false)

  const load = () => api.get('/api/admin/meters').then((d) => setMeters(d.meters)).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (editing.id) await api.patch(`/api/admin/meters/${editing.id}`, editing)
      else await api.post('/api/admin/meters', editing)
      setEditing(null)
      load()
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (m) => {
    if (!confirm(`¿Eliminar la tarifa "${m.code}"? Si tiene cobros asociados solo se desactivará.`)) return
    await api.del(`/api/admin/meters/${m.id}`).catch((e) => alert(e.message))
    load()
  }

  const set = (k) => (e) => setEditing((s) => ({ ...s, [k]: e.target.value }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Tarifas (billing meters)</h1>
        <Button onClick={() => setEditing({ ...EMPTY })}><Plus size={15} className="inline -mt-0.5 mr-1" />Nueva tarifa</Button>
      </div>
      <p className="text-sm text-ink2 -mt-3">
        Cada tarifa apunta a un <b>billing meter</b> creado en la app del marketplace de GHL (App → Pricing → Billing
        Meters, tipo <i>Custom Event API</i>). El <code className="text-gold">code</code> es el alias corto que usan tus apps al cobrar.
      </p>

      {error && <Empty>{error}</Empty>}
      {meters && meters.length === 0 && (
        <Card><Empty>Sin tarifas. Crea el meter en el portal de GHL y regístralo aquí con su meterId.</Empty></Card>
      )}
      {meters && meters.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Código</Th>
                <Th>Nombre</Th>
                <Th>Meter de GHL</Th>
                <Th>Tipo</Th>
                <Th className="text-right">Precio/unidad</Th>
                <Th className="text-right">Cobros</Th>
                <Th>Activa</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {meters.map((m) => (
                <tr key={m.id} className={m.active ? '' : 'opacity-50'}>
                  <Td><code className="text-gold text-xs">{m.code}</code></Td>
                  <Td>{m.name}<div className="text-[11px] text-mut">por {m.unit_label}</div></Td>
                  <Td><code className="text-xs text-ink2">{m.ghl_meter_id}</code></Td>
                  <Td className="text-ink2">{m.price_type === 'dynamic' ? 'Dinámico' : 'Fijo'}</Td>
                  <Td className="text-right tabular-nums">
                    {fmtUsd(m.default_price === null ? null : Number(m.default_price))}
                    {m.price_type === 'dynamic' && (
                      <div className="text-[11px] text-mut">
                        {Number(m.min_price ?? 0)} – {Number(m.max_price ?? 0)}
                      </div>
                    )}
                  </Td>
                  <Td className="text-right tabular-nums">{m.charges_count}</Td>
                  <Td>{m.active ? 'Sí' : 'No'}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <button className="text-xs text-ink2 hover:text-gold mr-3" onClick={() => setEditing({ ...m })}>
                      <Pencil size={14} className="inline -mt-0.5" /> Editar
                    </button>
                    <button className="text-xs text-bad/80 hover:text-bad" onClick={() => remove(m)}>Eliminar</button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {editing && (
        <Modal title={editing.id ? `Editar tarifa "${editing.code}"` : 'Nueva tarifa'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Código (alias para tus apps)" placeholder="mensajes-ia" value={editing.code} onChange={set('code')} />
              <Input label="Meter ID de GHL" placeholder="65f0c1…" value={editing.ghl_meter_id} onChange={set('ghl_meter_id')} />
            </div>
            <Input label="Nombre" placeholder="Mensajes de IA" value={editing.name} onChange={set('name')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Unidad" placeholder="mensaje" value={editing.unit_label} onChange={set('unit_label')} />
              <Select label="Tipo de precio" value={editing.price_type} onChange={set('price_type')}>
                <option value="fixed">Fijo (siempre el precio por defecto)</option>
                <option value="dynamic">Dinámico (la app puede mandar price)</option>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label={`Precio por defecto (USD)${editing.price_type === 'fixed' ? ' *' : ''}`} type="number" step="0.000001" min="0" required={editing.price_type === 'fixed'} value={editing.default_price ?? ''} onChange={set('default_price')} />
              <Input label="Mínimo (dinámico)" type="number" step="0.000001" min="0" value={editing.min_price ?? ''} onChange={set('min_price')} disabled={editing.price_type !== 'dynamic'} />
              <Input label="Máximo (dinámico)" type="number" step="0.000001" min="0" value={editing.max_price ?? ''} onChange={set('max_price')} disabled={editing.price_type !== 'dynamic'} />
            </div>
            <p className="text-[11px] text-mut">
              El precio y el rango deben coincidir con lo configurado en el meter del portal de GHL — GHL es quien cobra;
              esta tarifa es el espejo local para validar y contabilizar.
            </p>
            <Button className="w-full" disabled={busy}>{editing.id ? 'Guardar cambios' : 'Crear tarifa'}</Button>
          </form>
        </Modal>
      )}
    </div>
  )
}
