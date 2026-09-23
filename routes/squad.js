import { Router } from 'express'
import { z } from 'zod'
import { AUCTION_RULES } from '../config/index.js'
import { playerRepository } from '../app/repositories/playerRepository.js'
import { analyseSquad, projectPurchase } from '../app/services/squadService.js'
import { filterPlayers, sortPlayers } from '../app/services/playerQuery.js'
import { asyncRoute } from '../app/middleware/errorHandler.js'
import { validate } from '../app/middleware/validate.js'

const router = Router()

const squadEntry = z.object({
  playerId: z.string(),
  price: z.number().nonnegative().optional(),
})

const analyseBody = z.object({
  squad: z.array(squadEntry).default([]),
  budget: z.number().positive().default(AUCTION_RULES.defaultPurse),
})

async function hydrate(squad) {
  const players = await playerRepository.findByIds(squad.map((entry) => entry.playerId))
  const byId = new Map(players.map((player) => [player.id, player]))
  return squad
    .map((entry) => {
      const player = byId.get(entry.playerId)
      return player ? { player, price: entry.price ?? player.basePrice } : null
    })
    .filter(Boolean)
}

router.post(
  '/analyse',
  validate(analyseBody),
  asyncRoute(async (req, res) => {
    const entries = await hydrate(req.body.squad)
    res.json({ summary: analyseSquad(entries, req.body.budget), squad: entries })
  }),
)

const projectBody = analyseBody.extend({
  playerId: z.string(),
  price: z.number().nonnegative().optional(),
})

router.post(
  '/project',
  validate(projectBody),
  asyncRoute(async (req, res) => {
    const player = await playerRepository.findById(req.body.playerId)
    if (!player) {
      const error = new Error(`Player ${req.body.playerId} not found`)
      error.status = 404
      throw error
    }
    const summary = analyseSquad(await hydrate(req.body.squad), req.body.budget)
    res.json({ projection: projectPurchase(summary, player, req.body.price), summary })
  }),
)

/**
 * Suggests players for the gaps the squad analysis found, filtered to what the
 * remaining purse can actually afford.
 */
router.post(
  '/suggestions',
  validate(analyseBody),
  asyncRoute(async (req, res) => {
    const entries = await hydrate(req.body.squad)
    const summary = analyseSquad(entries, req.body.budget)
    const all = await playerRepository.findAll()
    const ownedIds = entries.map((entry) => entry.player.id)

    const needs = []
    if (summary.roleDistribution.Wicketkeeper < 2) needs.push({ need: 'Wicketkeeper depth', filters: { role: 'Wicketkeeper' } })
    if (summary.roleDistribution.Bowler < 4) needs.push({ need: 'Frontline bowling', filters: { role: 'Bowler' } })
    if (summary.roleDistribution['All-rounder'] < 3) needs.push({ need: 'All-round balance', filters: { role: 'All-rounder' } })
    if (summary.roleDistribution.Batter < 5) needs.push({ need: 'Top-order batting', filters: { role: 'Batter' } })
    if (!entries.some((e) => (e.player.tags || []).some((t) => t.toLowerCase().includes('death bowling')))) {
      needs.push({ need: 'Death-overs specialist', filters: { role: 'Bowler', tags: ['Death bowling'] } })
    }

    const suggestions = needs.map(({ need, filters }) => ({
      need,
      players: sortPlayers(
        filterPlayers(all, { ...filters, excludeIds: ownedIds, maxPrice: Math.max(0, summary.remainingBudget) }),
        'rating',
      ).slice(0, 4),
    }))

    res.json({ summary, suggestions: suggestions.filter((s) => s.players.length) })
  }),
)

router.get('/rules', (req, res) => res.json(AUCTION_RULES))

export default router
