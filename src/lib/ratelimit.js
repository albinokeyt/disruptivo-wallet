import { redis } from '../redis.js'

// Ventana fija por Redis. bucketKey identifica al sujeto (app, ip…); limit = peticiones por windowS.
export async function rateLimit(bucketKey, limit, windowS) {
  const slot = Math.floor(Date.now() / 1000 / windowS)
  const key = `rl:${bucketKey}:${slot}`
  let n
  try {
    n = await redis.incr(key)
    if (n === 1) await redis.expire(key, windowS + 1)
  } catch {
    // si Redis falla no bloqueamos el cobro (fail-open): el rate limit es defensa, no puerta principal
    return { ok: true, remaining: limit }
  }
  return { ok: n <= limit, remaining: Math.max(0, limit - n) }
}
