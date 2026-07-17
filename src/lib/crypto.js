import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'

export const hashKey = (key) => createHash('sha256').update(key).digest('hex')

export function generateApiKey() {
  const key = 'dw_' + randomBytes(24).toString('hex')
  return { key, prefix: key.slice(0, 11) + '…', hash: hashKey(key) }
}

// comparación en tiempo constante para el login admin
export function safeEqual(a, b) {
  const ba = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ba.length !== bb.length) {
    // compara contra sí mismo para no filtrar longitud por timing
    timingSafeEqual(ba, ba)
    return false
  }
  return timingSafeEqual(ba, bb)
}
