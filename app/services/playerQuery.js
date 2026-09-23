/**
 * Pure filtering / sorting / searching over the player catalogue.
 * No IO here, so the chat assistant and the REST layer share exactly one
 * definition of what "Indian middle-order batter under 5 crore" means.
 */

const SORTERS = {
  rating: (a, b) => b.rating - a.rating,
  name: (a, b) => a.name.localeCompare(b.name),
  basePrice: (a, b) => b.basePrice - a.basePrice,
  basePriceAsc: (a, b) => a.basePrice - b.basePrice,
  runs: (a, b) => (b.stats.batting.runs || 0) - (a.stats.batting.runs || 0),
  strikeRate: (a, b) => (b.stats.batting.strikeRate || 0) - (a.stats.batting.strikeRate || 0),
  wickets: (a, b) => (b.stats.bowling.wickets || 0) - (a.stats.bowling.wickets || 0),
  economy: (a, b) => (a.stats.bowling.economy || 99) - (b.stats.bowling.economy || 99),
  age: (a, b) => a.age - b.age,
}

const matchesText = (player, search) => {
  const haystack = [
    player.name,
    player.country,
    player.team2025,
    player.role,
    player.battingStyle,
    player.bowlingStyle,
    player.battingOrder,
    player.bowlingType,
    ...(player.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(search.toLowerCase())
}

/**
 * @param {Array} players full catalogue
 * @param {object} filters { search, role, roles, nationality, battingOrder, bowlingType,
 *                           tags, minPrice, maxPrice, minRating, capped, excludeIds }
 */
export function filterPlayers(players, filters = {}) {
  const {
    search,
    role,
    roles,
    nationality,
    battingOrder,
    bowlingType,
    tags,
    minPrice,
    maxPrice,
    minRating,
    capped,
    excludeIds,
  } = filters

  const roleSet = roles?.length ? new Set(roles) : role ? new Set([role]) : null
  const tagList = tags?.length ? tags.map((t) => t.toLowerCase()) : null
  const excluded = excludeIds?.length ? new Set(excludeIds) : null

  return players.filter((player) => {
    if (excluded?.has(player.id)) return false
    if (roleSet && !roleSet.has(player.role)) return false
    if (nationality && player.nationality !== nationality) return false
    if (battingOrder && player.battingOrder !== battingOrder) return false
    if (bowlingType && player.bowlingType !== bowlingType) return false
    if (typeof minPrice === 'number' && player.basePrice < minPrice) return false
    if (typeof maxPrice === 'number' && player.basePrice > maxPrice) return false
    if (typeof minRating === 'number' && player.rating < minRating) return false
    if (typeof capped === 'boolean' && player.capped !== capped) return false
    if (search && !matchesText(player, search)) return false
    if (tagList) {
      const playerTags = (player.tags || []).map((t) => t.toLowerCase())
      if (!tagList.some((tag) => playerTags.some((pt) => pt.includes(tag)))) return false
    }
    return true
  })
}

export function sortPlayers(players, sortBy = 'rating') {
  const sorter = SORTERS[sortBy] || SORTERS.rating
  return [...players].sort(sorter)
}

export function paginate(players, page = 1, pageSize = 24) {
  const total = players.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(Math.max(1, page), totalPages)
  const start = (current - 1) * pageSize
  return {
    items: players.slice(start, start + pageSize),
    pagination: { page: current, pageSize, total, totalPages },
  }
}

/** Distinct filter values, so the frontend never hardcodes a dropdown. */
export function buildFacets(players) {
  const collect = (key) => [...new Set(players.map((p) => p[key]).filter(Boolean))].sort()
  const tags = [...new Set(players.flatMap((p) => p.tags || []))].sort()
  return {
    roles: collect('role'),
    nationalities: collect('nationality'),
    battingOrders: collect('battingOrder').filter((o) => o !== 'N/A'),
    bowlingTypes: collect('bowlingType'),
    teams: collect('team2025'),
    countries: collect('country'),
    tags,
    priceRange: {
      min: Math.min(...players.map((p) => p.basePrice)),
      max: Math.max(...players.map((p) => p.basePrice)),
    },
  }
}
