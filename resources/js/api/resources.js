import { api, streamEvents } from './client.js'

export const playersApi = {
  list: (params, signal) => api.get('/players', { params, signal }),
  facets: () => api.get('/players/facets'),
  detail: (id) => api.get(`/players/${id}`),
  compare: (ids) => api.get('/players/compare', { params: { ids: ids.join(',') } }),
}

export const squadApi = {
  analyse: (payload) => api.post('/squad/analyse', payload),
  project: (payload) => api.post('/squad/project', payload),
  suggestions: (payload) => api.post('/squad/suggestions', payload),
  rules: () => api.get('/squad/rules'),
}

export const auctionApi = {
  create: (payload) => api.post('/auction/sessions', payload),
  get: (id) => api.get(`/auction/sessions/${id}`),
  reset: (id, payload) => api.post(`/auction/sessions/${id}/reset`, payload),
  nominate: (id, playerId) => api.post(`/auction/sessions/${id}/nominate`, { playerId }),
  bid: (id, bidder) => api.post(`/auction/sessions/${id}/bid`, { bidder }),
  sold: (id) => api.post(`/auction/sessions/${id}/sold`, {}),
  unsold: (id) => api.post(`/auction/sessions/${id}/unsold`, {}),
  release: (id, playerId) => api.del(`/auction/sessions/${id}/squad/${playerId}`),
}

export const chatApi = {
  meta: () => api.get('/chat/meta'),
  ask: (payload) => api.post('/chat/ask', payload),
  stream: (payload, onEvent, signal) => streamEvents('/chat/stream', payload, onEvent, signal),
}

export const systemApi = {
  health: () => api.get('/health'),
}
