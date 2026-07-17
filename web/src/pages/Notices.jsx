import { useEffect, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { api, fmtDate } from '../api.js'
import { Card, Button, Input, Select, Modal, Empty, Toggle } from '../components/ui.jsx'

const LEVELS = { info: 'text-gold border-gold/30', success: 'text-ok border-ok/30', warning: 'text-warn border-warn/30', danger: 'text-bad border-bad/30' }
const EMPTY = { title: '', body: '', level: 'info', show_in_store: false, active: true }

export default function Notices() {
  const [notices, setNotices] = useState(null)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => api.get('/api/admin/notices').then((d) => setNotices(d.notices)).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      if (editing.id) await api.patch(`/api/admin/notices/${editing.id}`, editing)
      else await api.post('/api/admin/notices', editing)
      setEditing(null); load()
    } catch (err) { alert(err.message) } finally { setBusy(false) }
  }
  const remove = async (n) => { if (!confirm(`¿Eliminar el aviso "${n.title}"?`)) return; await api.del(`/api/admin/notices/${n.id}`).catch((e) => alert(e.message)); load() }
  const set = (k) => (e) => setEditing((s) => ({ ...s, [k]: e.target.value }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Avisos y notificaciones</h1>
        <Button onClick={() => setEditing({ ...EMPTY })}><Plus size={15} className="inline -mt-0.5 mr-1" />Nuevo aviso</Button>
      </div>
      <p className="text-sm text-ink2 -mt-3">Comunicados internos y, si marcas «mostrar en tienda», banners que verán los visitantes del marketplace.</p>

      {error && <Empty>{error}</Empty>}
      {notices && notices.length === 0 && <Card><Empty>Sin avisos.</Empty></Card>}
      {notices && notices.length > 0 && (
        <div className="space-y-3">
          {notices.map((n) => (
            <Card key={n.id} className={`border-l-4 ${LEVELS[n.level] || LEVELS.info} ${n.active ? '' : 'opacity-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{n.title}</div>
                  {n.body && <p className="text-sm text-ink2 mt-1">{n.body}</p>}
                  <div className="text-[11px] text-mut mt-2">
                    {fmtDate(n.created_at)} · {n.show_in_store ? 'en tienda' : 'interno'} · {n.active ? 'activo' : 'inactivo'}
                  </div>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button className="text-xs text-ink2 hover:text-gold" onClick={() => setEditing({ ...n })}><Pencil size={13} /></button>
                  <button className="text-xs text-bad/80 hover:text-bad" onClick={() => remove(n)}>×</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? 'Editar aviso' : 'Nuevo aviso'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4">
            <Input label="Título" value={editing.title} onChange={set('title')} autoFocus />
            <label className="block">
              <span className="block text-xs text-ink2 mb-1.5">Cuerpo</span>
              <textarea className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 text-sm text-ink outline-none focus:border-gold/60 min-h-24" value={editing.body || ''} onChange={set('body')} />
            </label>
            <Select label="Nivel" value={editing.level} onChange={set('level')}>
              <option value="info">Info</option><option value="success">Éxito</option><option value="warning">Aviso</option><option value="danger">Urgente</option>
            </Select>
            <div className="flex gap-6">
              <Toggle checked={editing.show_in_store} onChange={(v) => setEditing((s) => ({ ...s, show_in_store: v }))} label="Mostrar en tienda" />
              <Toggle checked={editing.active} onChange={(v) => setEditing((s) => ({ ...s, active: v }))} label="Activo" />
            </div>
            <Button className="w-full" disabled={busy || !editing.title.trim()}>{editing.id ? 'Guardar' : 'Crear aviso'}</Button>
          </form>
        </Modal>
      )}
    </div>
  )
}
