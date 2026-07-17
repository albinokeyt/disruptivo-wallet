import { redis } from '../redis.js'

// Ventana fija por Redis. bucketKey identifica al sujeto (app, ip…); limit = peticiones por windowS.
// INCR + EXPIRE se hacen ATÓMICOS en un solo round-trip vía Lua: la clave nunca queda sin TTL
// (evita fugas de claves huérfanas si un EXPIRE separado fallara tras un INCR con éxito).
const SCRIPT = `local v = redis.call('INCR', KEYS[1]); redis.call('EXPIRE', KEYS[1], ARGV[1]); return v`

export async function rateLimit(bucketKey, limit, windowS) {
  const slot = Math.floor(Date.now() / 1000 / windowS)
  const key = `rl:${bucketKey}:${slot}`
  let n
  try {
    n = Number(await redis.eval(SCRIPT, 1, key, windowS + 1))
  } catch {
    // si Redis falla no bloqueamos el cobro (fail-open): el rate limit es defensa, no la puerta principal
    return { ok: true, remaining: limit }
  }
  return { ok: n <= limit, remaining: Math.max(0, limit - n) }
}
