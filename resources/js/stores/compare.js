import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'ipl-auction-assistant:compare'
const MAX_SLOTS = 4

/** The comparison shortlist, shared between the explorer and the Compare view. */
export const useCompareStore = defineStore('compare', () => {
  const ids = ref(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))

  const count = computed(() => ids.value.length)
  const isFull = computed(() => ids.value.length >= MAX_SLOTS)
  const has = (id) => ids.value.includes(id)

  function toggle(id) {
    if (has(id)) ids.value = ids.value.filter((existing) => existing !== id)
    else if (!isFull.value) ids.value = [...ids.value, id]
  }

  const remove = (id) => { ids.value = ids.value.filter((existing) => existing !== id) }
  const clear = () => { ids.value = [] }
  const set = (next) => { ids.value = next.slice(0, MAX_SLOTS) }

  watch(ids, (value) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)), { deep: true })

  return { ids, count, isFull, maxSlots: MAX_SLOTS, has, toggle, remove, clear, set }
})
