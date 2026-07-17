import { randomBytes } from 'node:crypto'
import { redis } from '../redis.js'
import { config } from '../config.js'

const COOKIE = 'dw_session'
const TTL = 60 * 60 * 24 * 7

export async function createSession(req, reply) {
  const token = randomBytes(32).toString('hex')
  await redis.set(`sess:${token}`, '1', 'EX', TTL)
  reply.setCookie(COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    // transporte real (trustProxy resuelve X-Forwarded-Proto), con APP_BASE_URL como respaldo
    secure: req?.protocol === 'https' || config.appBaseUrl.startsWith('https'),
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
