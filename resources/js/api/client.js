const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

async function parseError(response) {
  let payload = null
  try {
    payload = await response.json()
  } catch {
    // Non-JSON error body; fall through to the status text.
  }
  return new ApiError(
    payload?.error?.message || response.statusText || 'Request failed',
    response.status,
    payload?.error?.details,
  )
}

async function request(path, { method = 'GET', body, params, signal } = {}) {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue
      if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(key, v))
      else url.searchParams.set(key, value)
    }
  }

  const response = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })

  if (!response.ok) throw await parseError(response)
  return response.status === 204 ? null : response.json()
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  del: (path, options) => request(path, { ...options, method: 'DELETE' }),
}

/**
 * Opens a server-sent-event stream over POST and invokes `onEvent` for each
 * JSON payload. `fetch` is used rather than EventSource because EventSource
 * cannot send a request body.
 */
export async function streamEvents(path, body, onEvent, signal) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) throw await parseError(response)

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE frames are separated by a blank line; keep any partial tail buffered.
    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''

    for (const frame of frames) {
      const line = frame.split('\n').find((l) => l.startsWith('data: '))
      if (!line) continue
      try {
        onEvent(JSON.parse(line.slice(6)))
      } catch {
        // Ignore malformed frames rather than aborting a live answer.
      }
    }
  }
}
