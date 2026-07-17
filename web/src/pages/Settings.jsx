import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Card, Button, Input, Toggle, Empty } from '../components/ui.jsx'

export default function Settings() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = () => api.get('/api/admin/settings').then(setData).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  if (error) return <Empty>{error}</Empty>
  if (!data) return <Empty>Cargando…</Empty>

  const setGhl = (k) => (e) => setData((d) => ({ ...d, ghl_app: { ...d.ghl_app, [k]: e.target.value } }))

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setSaved(false)
    try {
      await api.put('/api/admin/settings', { ghl_app: data.ghl_app, test_mode: data.test_mode })
      setSaved(true)
      load()
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-bold">Configuración</h1>

      <form onSubmit={save} className="space-y-6">
        <Card>
          <h2 className="text-sm font-semibold mb-1">App del marketplace de GHL</h2>
          <p className="text-xs text-ink2 mb-4 leading-relaxed">
            Los cobros al wallet <b>exigen una app del marketplace</b> con scopes{' '}
            <code className="text-gold">charges.write</code> y <code className="text-gold">charges.readonly</code> y sus
            billing meters creados en App → Pricing. Un Private Integration Token (PIT) <b>no puede</b> crear cargos —
            solo sirve para lecturas auxiliares.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Input label="Client ID" value={data.ghl_app.client_id} onChange={setGhl('client_id')} />
            <Input label="Client Secret" type="password" placeholder="(sin cambios)" value={data.ghl_app.client_secret} onChange={setGhl('client_secret')} />
            <Input label="App ID (id de la app en el marketplace)" value={data.ghl_app.app_id} onChange={setGhl('app_id')} />
            <Input
              label="Company ID (agencia, opcional)"
              hint="Solo como respaldo: normalmente llega solo con el OAuth de cada subcuenta."
              value={data.ghl_app.company_id}
              onChange={setGhl('company_id')}
            />
            <Input
              label="PIT de agencia (opcional)"
              type="password"
              placeholder="(sin cambios)"
              hint="Token de integración privada, solo para lecturas auxiliares."
              value={data.ghl_app.pit_token}
              onChange={setGhl('pit_token')}
              className="lg:col-span-2"
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold mb-3">OAuth</h2>
          <div className="text-xs text-ink2 space-y-2">
            <p>
              Redirect URL para pegar en la app del marketplace:{' '}
              <code className="text-gold break-all">{data.redirect_uri}</code>
            </p>
            <p>
              URL base actual: <code className="text-ink">{data.app_base_url || '(define APP_BASE_URL en el entorno)'}</code>
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold mb-3">Modo prueba global</h2>
          <Toggle
            checked={data.test_mode}
            onChange={(v) => setData((d) => ({ ...d, test_mode: v }))}
            label="Registrar todos los cobros como prueba (no se toca el wallet de GHL)"
          />
        </Card>

        <div className="flex items-center gap-3">
          <Button disabled={busy}>{busy ? 'Guardando…' : 'Guardar configuración'}</Button>
          {saved && <span className="text-ok text-sm">Guardado ✓</span>}
        </div>
      </form>
    </div>
  )
}
