import { randomBytes } from 'node:crypto'
import { redis } from '../redis.js'
import { config } from '../config.js'

const COOKIE = 'dw_session'
const TTL = 60 * 60 * 24 * 7

// crossSite=true para sesiones creadas dentro del iframe de GHL (SSO): el navegador solo envía la
// cookie en un iframe de terceros si es SameSite=None; Secure (+ Partitioned/CHIPS). Login directo → Lax.
export async function createSession(req, reply, { crossSite = false } = {}) {
  const token = randomBytes(32).toString('hex')
  await redis.set(`sess:${token}`, '1', 'EX', TTL)
  reply.setCookie(COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: crossSite ? 'none' : 'lax',
    // SameSite=None EXIGE Secure; en directo, transporte real (trustProxy) con APP_BASE_URL de respaldo
    secure: crossSite || req?.protocol === 'https' || config.appBaseUrl.startsWith('https'),
    partitioned: crossSite || undefined, // CHIPS: cookie particionada para el bloqueo de 3rd-party
    maxAge: TTL,
  })
}

export async function destroySession(req, reply) {
  const token = req.cookies?.[COOKIE]
  if (token) await redis.del(`sess:${token}`)
  reply.clearCookie(COOKIE, { path: '/' })
}

export async function isAdmin(req) {
  const token = req.cookies?.[COOKIE]
  if (!token) return false
  return Boolean(await redis.get(`sess:${token}`))
}

export async function requireAdmin(req, reply) {
  if (!(await isAdmin(req))) {
    return reply.code(401).send({ error: 'No autorizado' })
  }
}
