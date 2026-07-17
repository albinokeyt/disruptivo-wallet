import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateApiKey, hashKey, safeEqual } from '../src/lib/crypto.js'
import { numOr } from '../src/db.js'
import { buildAuthUrl } from '../src/lib/ghl.js'

test('generateApiKey produce claves con prefijo dw_ y hash estable', () => {
  const { key, prefix, hash } = generateApiKey()
  assert.match(key, /^dw_[0-9a-f]{48}$/)
  assert.ok(prefix.startsWith('dw_'))
  assert.equal(hash, hashKey(key))
  // dos claves distintas no colisionan
  assert.notEqual(generateApiKey().key, generateApiKey().key)
})

test('hashKey es determinista y sensible al valor', () => {
  assert.equal(hashKey('abc'), hashKey('abc'))
  assert.notEqual(hashKey('abc'), hashKey('abd'))
})

test('safeEqual compara correctamente y no lanza con longitudes distintas', () => {
  assert.equal(safeEqual('secreto', 'secreto'), true)
  assert.equal(safeEqual('secreto', 'secretO'), false)
  assert.equal(safeEqual('corto', 'muchomaslargo'), false)
  assert.equal(safeEqual('', ''), true)
})

test('numOr normaliza strings de pg y rechaza no-numéricos', () => {
  assert.equal(numOr('12.5'), 12.5)
  assert.equal(numOr(0), 0)
  assert.equal(numOr(''), null)
  assert.equal(numOr(null), null)
  assert.equal(numOr(undefined), null)
  assert.equal(numOr('abc'), null)
  assert.equal(numOr('abc', 7), 7)
  assert.equal(numOr(undefined, 50), 50)
})

test('buildAuthUrl incluye scopes y el state cuando se pasa', () => {
  const cfg = { client_id: 'cid123' }
  const url = new URL(buildAuthUrl(cfg, 'https://x.test/cb', { scopes: ['charges.write'], state: 's1' }))
  assert.equal(url.searchParams.get('client_id'), 'cid123')
  assert.equal(url.searchParams.get('redirect_uri'), 'https://x.test/cb')
  assert.equal(url.searchParams.get('scope'), 'charges.write')
  assert.equal(url.searchParams.get('state'), 's1')
  assert.equal(url.searchParams.get('response_type'), 'code')
  // sin state no aparece el parámetro
  const url2 = new URL(buildAuthUrl(cfg, 'https://x.test/cb'))
  assert.equal(url2.searchParams.get('state'), null)
})
