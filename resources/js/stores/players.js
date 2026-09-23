import { defineStore } from 'pinia'
import { ref } from 'vue'
import { playersApi } from '@/api/resources.js'

/** Catalogue access plus a small cache of already-fetched player detail. */
export const usePlayersStore = defineStore('players', () => {
  const facets = ref(null)
  const facetsLoading = ref(false)
  const detailCache = ref(new Map())

  async function loadFacets() {
    if (facets.value || facetsLoading.value) return facets.value
    facetsLoading.value = true
    try {
      facets.value = await playersApi.facets()
    } finally {
      facetsLoading.value = false
    }
    return facets.value
  }

  async function loadDetail(id) {
    if (detailCache.value.has(id)) return detailCache.value.get(id)
    const detail = await playersApi.detail(id)
    detailCache.value.set(id, detail)
    detailCache.value.set(detail.player.id, detail)
    return detail
  }

  const list = (params, signal) => playersApi.list(params, signal)
  const compare = (ids) => playersApi.compare(ids)

  return { facets, facetsLoading, loadFacets, loadDetail, list, compare }
})
