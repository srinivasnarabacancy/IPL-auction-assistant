import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { squadApi } from '@/api/resources.js'

const STORAGE_KEY = 'ipl-auction-assistant:squad'
const DEFAULT_BUDGET = 120

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return { budget: parsed.budget ?? DEFAULT_BUDGET, entries: parsed.entries ?? [] }
  } catch {
    return null
  }
}

/**
 * The user's squad and purse.
 *
 * Membership is held locally (so the UI is instant and survives a reload) while
 * the analytical summary comes from `POST /squad/analyse`, keeping one
 * authoritative implementation of the auction rules on the server.
 */
export const useSquadStore = defineStore('squad', () => {
  const persisted = loadPersisted()

  const budget = ref(persisted?.budget ?? DEFAULT_BUDGET)
  const entries = ref(persisted?.entries ?? []) // { playerId, price, player }
  const summary = ref(null)
  const analysing = ref(false)
  const error = ref(null)

  const playerIds = computed(() => entries.value.map((entry) => entry.playerId))
  const has = (playerId) => playerIds.value.includes(playerId)
  const size = computed(() => entries.value.length)

  const localSpent = computed(
    () => Math.round(entries.value.reduce((sum, entry) => sum + entry.price, 0) * 100) / 100,
  )
  const localRemaining = computed(() => Math.round((budget.value - localSpent.value) * 100) / 100)

  const payload = () => ({
    budget: budget.value,
    squad: entries.value.map(({ playerId, price }) => ({ playerId, price })),
  })

  async function analyse() {
    analysing.value = true
    error.value = null
    try {
      const result = await squadApi.analyse(payload())
      summary.value = result.summary
    } catch (err) {
      error.value = err
    } finally {
      analysing.value = false
    }
  }

  function add(player, price) {
    if (has(player.id)) return
    entries.value = [...entries.value, { playerId: player.id, price: price ?? player.basePrice, player }]
  }

  function remove(playerId) {
    entries.value = entries.value.filter((entry) => entry.playerId !== playerId)
  }

  function toggle(player, price) {
    if (has(player.id)) remove(player.id)
    else add(player, price)
  }

  function updatePrice(playerId, price) {
    entries.value = entries.value.map((entry) =>
      entry.playerId === playerId ? { ...entry, price: Number(price) || 0 } : entry,
    )
  }

  function setBudget(value) {
    budget.value = Math.max(1, Number(value) || DEFAULT_BUDGET)
  }

  function clear() {
    entries.value = []
  }

  /** Bulk-replace the squad, used when importing an auction room result. */
  function replaceFrom(auctionSquad, auctionBudget) {
    entries.value = auctionSquad.map((entry) => ({
      playerId: entry.player.id,
      price: entry.price,
      player: entry.player,
    }))
    if (auctionBudget) budget.value = auctionBudget
  }

  watch(
    [entries, budget],
    () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ budget: budget.value, entries: entries.value }),
      )
      analyse()
    },
    { deep: true, immediate: true },
  )

  return {
    budget, entries, summary, analysing, error,
    playerIds, size, localSpent, localRemaining,
    has, add, remove, toggle, updatePrice, setBudget, clear, replaceFrom, analyse, payload,
  }
})
