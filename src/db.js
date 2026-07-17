import pg from 'pg'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'

const { Pool } = pg
export const pool = new Pool({ connectionString: config.databaseUrl, max: 10 })
export const q = (text, params) => pool.query(text, params)

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations')

export async function migrate(log = console) {
  const client = await pool.connect()
  try {
    // lock de asesoramiento: dos instancias arrancando a la vez no compiten por las migraciones
    await client.query(`SELECT pg_advisory_lock(hashtext('disruptivo_wallet_migrations'))`)
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`)
    const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort()
    for (const file of files) {
      const done = await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [file])
      if (done.rowCount) continue
      const sql = await readFile(path.join(migrationsDir, file), 'utf8')
      try {
        await client.query('BEGIN')
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [file])
        await client.query('COMMIT')
        log.info?.(`migración aplicada: ${file}`)
      } catch (err) {
        await client.query('ROLLBACK')
        throw new Error(`migración ${file} falló: ${err.message}`)
      }
    }
  } finally {
    await client.query(`SELECT pg_advisory_unlock(hashtext('disruptivo_wallet_migrations'))`).catch(() => {})
    client.release()
  }
}

// pg devuelve NUMERIC como string; normaliza a número o null
export const numOr = (v, fallback = null) => {
  if (v === null || v === undefined || v === '') return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
