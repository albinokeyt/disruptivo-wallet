import { q } from '../db.js'

const cache = new Map()
const TTL = 10_000

export async function getSetting(key) {
  const hit = cache.get(key)
  if (hit && hit.at > Date.now() - TTL) return hit.value
  const r = await q('SELECT value FROM settings WHERE key=$1', [key])
  const value = r.rows[0]?.value ?? null
  cache.set(key, { value, at: Date.now() })
  return value
}

export async function setSetting(key, value) {
  await q(
    `INSERT INTO settings(key, value, updated_at) VALUES($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value)]
  )
  cache.delete(key)
}

// credenciales de la app del marketplace de GHL: { client_id, client_secret, app_id, pit_token? }
export const getGhlConfig = async () => (await getSetting('ghl_app')) || {}

export const isGlobalTestMode = async () => Boolean(await getSetting('test_mode'))
