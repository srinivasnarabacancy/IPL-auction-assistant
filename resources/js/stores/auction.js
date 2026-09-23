import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { auctionApi } from '@/api/resources.js'

const STORAGE_KEY = 'ipl-auction-assistant:auction-session'

/**
 * Mirrors a server-owned auction session. Only the session id is kept locally;
 * every mutation round-trips so the server stays the single source of truth for
 * bids, purse and squad.
 */
export const useAuctionStore = defineStore('auction', () => {
  const session = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const lot = computed(() => session.value?.lot ?? null)
  const squad = computed(() => session.value?.squad ?? [])
  const summary = computed(() => session.value?.summary ?? null)
  const history = computed(() => session.value?.history ?? [])
  const isLive = computed(() => Boolean(lot.value))
  const youLead = computed(() => lot.value?.leader === 'you')

  async function guard(operation) {
    loading.value = true
    error.value = null
    try {
      session.value = await operation()
      return session.value
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  /** Reattaches to a stored session, creating a fresh one if it has expired. */
  async function init(budget = 120, teamName) {
    const storedId = localStorage.getItem(STORAGE_KEY)
    if (storedId) {
      try {
        session.value = await auctionApi.get(storedId)
        return session.value
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    return start(budget, teamName)
  }

  async function start(budget, teamName) {
    const created = await guard(() => auctionApi.create({ budget, teamName }))
    localStorage.setItem(STORAGE_KEY, created.id)
    return created
  }

  const reset = (payload) => guard(() => auctionApi.reset(session.value.id, payload))
  const nominate = (playerId) => guard(() => auctionApi.nominate(session.value.id, playerId))
  const bid = (bidder = 'you') => guard(() => auctionApi.bid(session.value.id, bidder))
  const sold = () => guard(() => auctionApi.sold(session.value.id))
  const unsold = () => guard(() => auctionApi.unsold(session.value.id))
  const release = (playerId) => guard(() => auctionApi.release(session.value.id, playerId))

  return {
    session, loading, error,
    lot, squad, summary, history, isLive, youLead,
    init, start, reset, nominate, bid, sold, unsold, release,
  }
})
