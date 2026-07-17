import Redis from 'ioredis'
import { config } from './config.js'

// lazyConnect: importar este módulo no abre sockets (tests y arranque controlado).
// La primera orden conecta; el boot hace redis.ping() para fail-fast.
export const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true })

redis.on('error', (err) => {
  // ioredis reintenta en segundo plano; solo dejamos rastro para diagnóstico
  if (process.env.NODE_ENV !== 'test') console.error('[redis]', err.message)
})
