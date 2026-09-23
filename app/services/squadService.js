import { AUCTION_RULES } from '../../config/index.js'

const round = (n) => Math.round(n * 100) / 100

/**
 * Builds the full analytical view of a squad: spend, budget, composition and
 * rule violations. The frontend store mirrors the squad locally for instant
 * feedback, but this is the authoritative calculation used by the API and by
 * the AI assistant, so both always agree.
 *
 * @param {Array} squad entries of shape { player, price }
 * @param {number} budget total purse in INR crore
 */
export function analyseSquad(squad = [], budget = AUCTION_RULES.defaultPurse) {
  const entries = squad.filter((entry) => entry?.player)

  const totalSpent = round(entries.reduce((sum, e) => sum + (e.price ?? e.player.basePrice), 0))
  const remainingBudget = round(budget - totalSpent)
  const squadSize = entries.length
  const slotsToMinimum = Math.max(0, AUCTION_RULES.minSquadSize - squadSize)
  const slotsToMaximum = Math.max(0, AUCTION_RULES.maxSquadSize - squadSize)

  const count = (predicate) => entries.filter(predicate).length
  const overseasCount = count((e) => e.player.nationality === 'Overseas')
  const indianCount = squadSize - overseasCount

  const roleDistribution = AUCTION_RULES.roles.reduce((acc, role) => {
    acc[role] = count((e) => e.player.role === role)
    return acc
  }, {})

  const hasTag = (needle) =>
    entries.some((e) => (e.player.tags || []).some((t) => t.toLowerCase().includes(needle)))

  const violations = []
  if (remainingBudget < 0) {
    violations.push({
      code: 'OVER_BUDGET',
      severity: 'error',
      message: `Squad value exceeds the purse by ₹${round(Math.abs(remainingBudget))} Cr.`,
    })
  }
  if (overseasCount > AUCTION_RULES.maxOverseas) {
    violations.push({
      code: 'OVERSEAS_LIMIT',
      severity: 'error',
      message: `${overseasCount} overseas players selected - the limit is ${AUCTION_RULES.maxOverseas}.`,
    })
  }
  if (squadSize > AUCTION_RULES.maxSquadSize) {
    violations.push({
      code: 'SQUAD_TOO_LARGE',
      severity: 'error',
      message: `${squadSize} players selected - the maximum squad size is ${AUCTION_RULES.maxSquadSize}.`,
    })
  }
  if (squadSize > 0 && squadSize < AUCTION_RULES.minSquadSize) {
    violations.push({
      code: 'SQUAD_TOO_SMALL',
      severity: 'warning',
      message: `${slotsToMinimum} more player${slotsToMinimum === 1 ? '' : 's'} needed to reach the minimum squad of ${AUCTION_RULES.minSquadSize}.`,
    })
  }
  if (squadSize >= 5 && roleDistribution.Wicketkeeper === 0) {
    violations.push({ code: 'NO_KEEPER', severity: 'warning', message: 'No wicketkeeper in the squad.' })
  }
  if (squadSize >= 11 && roleDistribution.Wicketkeeper < 2) {
    violations.push({ code: 'ONE_KEEPER', severity: 'info', message: 'Only one wicketkeeper - most squads carry a backup.' })
  }
  if (squadSize >= 11 && !hasTag('death bowling')) {
    violations.push({ code: 'NO_DEATH_BOWLER', severity: 'warning', message: 'No specialist death bowler in the squad.' })
  }
  if (squadSize >= 11 && !hasTag('powerplay')) {
    violations.push({ code: 'NO_POWERPLAY', severity: 'info', message: 'No designated powerplay specialist in the squad.' })
  }
  if (squadSize >= 11 && roleDistribution.Bowler < 4) {
    violations.push({ code: 'THIN_ATTACK', severity: 'warning', message: `Only ${roleDistribution.Bowler} frontline bowlers - aim for at least 4.` })
  }

  const averageRating = squadSize ? round(entries.reduce((s, e) => s + e.player.rating, 0) / squadSize) : 0
  const costPerRemainingSlot = slotsToMinimum > 0 ? round(remainingBudget / slotsToMinimum) : null

  return {
    budget: round(budget),
    totalSpent,
    remainingBudget,
    spendPercentage: budget > 0 ? round((totalSpent / budget) * 100) : 0,
    squadSize,
    indianCount,
    overseasCount,
    overseasRemaining: Math.max(0, AUCTION_RULES.maxOverseas - overseasCount),
    slotsToMinimum,
    slotsToMaximum,
    costPerRemainingSlot,
    roleDistribution,
    averageRating,
    violations,
    isValid: violations.every((v) => v.severity !== 'error'),
    limits: {
      minSquadSize: AUCTION_RULES.minSquadSize,
      maxSquadSize: AUCTION_RULES.maxSquadSize,
      maxOverseas: AUCTION_RULES.maxOverseas,
      maxOverseasInXI: AUCTION_RULES.maxOverseasInXI,
    },
  }
}

/**
 * "How much budget will remain if I buy this player?" - the affordability check
 * used by both the auction room and the assistant.
 */
export function projectPurchase(summary, player, price) {
  const bid = typeof price === 'number' ? price : player.basePrice
  const remainingAfter = round(summary.remainingBudget - bid)
  const squadSizeAfter = summary.squadSize + 1
  const slotsStillNeeded = Math.max(0, AUCTION_RULES.minSquadSize - squadSizeAfter)

  const blockers = []
  if (remainingAfter < 0) blockers.push(`Exceeds the remaining purse by ₹${round(Math.abs(remainingAfter))} Cr.`)
  if (squadSizeAfter > AUCTION_RULES.maxSquadSize) blockers.push(`Squad would exceed ${AUCTION_RULES.maxSquadSize} players.`)
  if (player.nationality === 'Overseas' && summary.overseasCount >= AUCTION_RULES.maxOverseas) {
    blockers.push(`Overseas limit of ${AUCTION_RULES.maxOverseas} already reached.`)
  }

  return {
    playerId: player.id,
    playerName: player.name,
    bid: round(bid),
    remainingBefore: summary.remainingBudget,
    remainingAfter,
    squadSizeAfter,
    slotsStillNeeded,
    costPerRemainingSlot: slotsStillNeeded > 0 ? round(remainingAfter / slotsStillNeeded) : null,
    affordable: blockers.length === 0,
    blockers,
  }
}

/** Next legal bid for a current price, per the published increment ladder. */
export function nextBidIncrement(currentPrice) {
  const rule = AUCTION_RULES.bidIncrements.find((r) => currentPrice >= r.above)
  return rule ? rule.step : 0.05
}
