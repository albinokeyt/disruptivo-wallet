import { q } from '../db.js'
import { redis } from '../redis.js'
import { reconcileCharge } from './charges.js'

// Sana el ledger para cargos que quedaron sin confirmar: 'unknown' (timeout/red al cobrar) o
// 'pending' huérfano (proceso muerto a mitad). REGLA DE ORO: el reconciliador SOLO promociona a
// 'created' cuando GHL confirma el cargo. NUNCA fabrica un 'failed' desde una simple ausencia en
// la lista de GHL (que no es autoritativa por consistencia eventual): un 'failed' falso haría que
// el reintento del consumidor re-ejecutara el cobro → doble cargo al wallet.
const UNKNOWN_GRACE = "interval '3 minutes'"    // deja a GHL asentar antes de tocar un 'unknown'
const PENDING_ORPHAN = "interval '10 minutes'"  // pending tan viejo = proceso caído mid-flight
const BATCH = 20
const LOCK_KEY = 'reconciler:lock'
const LOCK_TTL_MS = 10 * 60 * 1000 // cubre el peor barrido (BATCH filas con timeouts de GHL)

async function sweepOnce(log) {
  const { rows } = await q(
    `SELECT id, status, connection_id, updated_at FROM charges
     WHERE (status='unknown' AND updated_at < now() - ${UNKNOWN_GRACE})
        OR (status='pending' AND updated_at < now() - ${PENDING_ORPHAN})
     ORDER BY updated_at ASC
     LIMIT ${BATCH}`
  )
  if (!rows.length) return { checked: 0, promoted: 0 }

  let promoted = 0
  for (const row of rows) {
    if (!row.connection_id) continue
    try {
      const rec = await reconcileCharge(row)
      if (rec.verified) {
        promoted++
        continue
      }
      // GHL no reconoce el cargo. NO marcar 'failed' (no es autoritativo). Para un 'pending'
      // huérfano lo dejamos claramente ambiguo como 'unknown' (concurrencia optimista: no tocar
      // si algo cambió la fila desde el SELECT, p. ej. un reintento acaba de reclamarla).
      if (rec.absent && row.status === 'pending') {
        await q(
          `UPDATE charges SET status='unknown',
             error='Cargo huérfano sin confirmación de GHL; se resolverá al reintentar o revisar',
             updated_at=now()
           WHERE id=$1 AND status='pending' AND updated_at=$2`,
          [row.id, row.updated_at]
        )
      }
      // 'unknown' ausente o inaccesible: se deja como está. El siguiente ciclo reintenta la
      // promoción (si GHL se vuelve consistente) o lo resuelve el reintento del consumidor / el admin.
    } catch (err) {
      log?.warn?.({ err: err.message, chargeId: row.id }, 'reconciliador: fallo en un cargo')
    }
  }
  return { checked: rows.length, promoted }
}

let running = false
let timer = null

export function startReconciler(log, intervalMs = 60_000) {
  if (timer) return
  const tick = async () => {
    if (running) return // no solapar barridos dentro del mismo proceso
    running = true
    const lockVal = `${process.pid}-${Math.random().toString(36).slice(2)}`
    let owned = false
    try {
      owned = Boolean(await redis.set(LOCK_KEY, lockVal, 'PX', LOCK_TTL_MS, 'NX'))
      if (!owned) return // otra réplica está barriendo
      const r = await sweepOnce(log)
      if (r.checked) log?.info?.(r, 'reconciliador: barrido')
    } catch (err) {
      log?.error?.({ err: err.message }, 'reconciliador: barrido falló')
    } finally {
      if (owned) {
        // liberar solo si el lock sigue siendo nuestro (compare-and-delete, como en ghl.js)
        await redis.eval(
          `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end`,
          1, LOCK_KEY, lockVal
        ).catch(() => {})
      }
      running = false
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
