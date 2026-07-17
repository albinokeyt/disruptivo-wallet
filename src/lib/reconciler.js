import { q } from '../db.js'
import { redis } from '../redis.js'
import { reconcileCharge } from './charges.js'

// Resuelve cargos que quedaron ambiguos (status 'unknown' = timeout/red al cobrar) o 'pending' huérfanos
// (proceso muerto a mitad). Sin esto, un cargo sin confirmar quedaría colgado si la app consumidora no reintenta.
const UNKNOWN_GRACE = "interval '3 minutes'"   // deja a GHL asentar antes de decidir
const PENDING_ORPHAN = "interval '10 minutes'" // pending tan viejo = proceso caído mid-flight
const BATCH = 20
const LOCK_KEY = 'reconciler:lock'

async function sweepOnce(log) {
  const { rows } = await q(
    `SELECT * FROM charges
     WHERE (status='unknown' AND updated_at < now() - ${UNKNOWN_GRACE})
        OR (status='pending' AND updated_at < now() - ${PENDING_ORPHAN})
     ORDER BY updated_at ASC
     LIMIT ${BATCH}`
  )
  if (!rows.length) return { checked: 0, resolved: 0 }

  let resolved = 0
  for (const row of rows) {
    if (!row.connection_id) continue
    try {
      const rec = await reconcileCharge(row)
      if (rec.verified) {
        resolved++
      } else if (rec.absent) {
        // GHL confirma que NO se cobró: marcar failed para que un reintento re-ejecute limpiamente
        const { rowCount } = await q(
          `UPDATE charges SET status='failed', error=$1, updated_at=now()
           WHERE id=$2 AND status IN ('unknown','pending')`,
          ['GHL confirma que el cargo no se registró; reintenta con el mismo event_id', row.id]
        )
        if (rowCount) resolved++
      }
      // unreachable: se reintenta en el siguiente ciclo
    } catch (err) {
      log?.warn?.({ err: err.message, chargeId: row.id }, 'reconciliador: fallo en un cargo')
    }
  }
  return { checked: rows.length, resolved }
}

let timer = null

export function startReconciler(log, intervalMs = 60_000) {
  if (timer) return
  const tick = async () => {
    // lock corto: si hay varias réplicas, solo una barre por ciclo
    const got = await redis.set(LOCK_KEY, '1', 'PX', 55_000, 'NX').catch(() => null)
    if (!got) return
    try {
      const r = await sweepOnce(log)
      if (r.checked) log?.info?.(r, 'reconciliador: barrido')
    } catch (err) {
      log?.error?.({ err: err.message }, 'reconciliador: barrido falló')
    } finally {
      await redis.del(LOCK_KEY).catch(() => {})
    }
  }
  timer = setInterval(() => { tick() }, intervalMs)
  timer.unref?.() // no bloquear el cierre del proceso
  log?.info?.({ intervalMs }, 'reconciliador iniciado')
}

export function stopReconciler() {
  if (timer) clearInterval(timer)
  timer = null
}
