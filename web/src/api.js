export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try { data = await res.json() } catch { /* respuestas sin cuerpo */ }
  if (!res.ok) throw new ApiError(data?.error || `Error ${res.status}`, res.status)
  return data
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
}

export const fmtUsd = (n) =>
  n === null || n === undefined
    ? '—'
    : new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 }).format(n)

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
