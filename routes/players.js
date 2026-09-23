import { Router } from 'express'
import { z } from 'zod'
import { playerRepository } from '../app/repositories/playerRepository.js'
import { filterPlayers, sortPlayers, paginate, buildFacets } from '../app/services/playerQuery.js'
import { asyncRoute } from '../app/middleware/errorHandler.js'
import { validate } from '../app/middleware/validate.js'

const router = Router()

const numeric = z.coerce.number().optional()
const listQuery = z.object({
  search: z.string().trim().optional(),
  role: z.enum(['Batter', 'Bowler', 'All-rounder', 'Wicketkeeper']).optional(),
  nationality: z.enum(['Indian', 'Overseas']).optional(),
  battingOrder: z.string().optional(),
  bowlingType: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  minPrice: numeric,
  maxPrice: numeric,
  minRating: numeric,
  capped: z.enum(['true', 'false']).optional(),
  sortBy: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(24),
})

router.get(
  '/',
  validate(listQuery, 'query'),
  asyncRoute(async (req, res) => {
    const { sortBy, page, pageSize, tags, capped, ...filters } = req.query
    const all = await playerRepository.findAll()
    const matched = filterPlayers(all, {
      ...filters,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
      capped: capped === undefined ? undefined : capped === 'true',
    })
    const sorted = sortPlayers(matched, sortBy)
    res.json(paginate(sorted, page, pageSize))
  }),
)

router.get(
  '/facets',
  asyncRoute(async (req, res) => {
    res.json(buildFacets(await playerRepository.findAll()))
  }),
)

const compareQuery = z.object({
  ids: z.string().min(1, 'Provide a comma-separated list of player ids'),
})

router.get(
  '/compare',
  validate(compareQuery, 'query'),
  asyncRoute(async (req, res) => {
    const ids = req.query.ids.split(',').map((id) => id.trim()).filter(Boolean)
    const players = await playerRepository.findByIds(ids)
    if (!players.length) {
      const error = new Error('No players found for the supplied ids')
      error.status = 404
      throw error
    }
    res.json({ players, bests: computeBests(players) })
  }),
)

router.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const player = await playerRepository.findById(req.params.id)
    if (!player) {
      const error = new Error(`Player ${req.params.id} not found`)
      error.status = 404
      throw error
    }
    const all = await playerRepository.findAll()
    const similar = sortPlayers(
      filterPlayers(all, { role: player.role, excludeIds: [player.id] }),
      'rating',
    ).slice(0, 4)
    res.json({ player, similar })
  }),
)

/** Which player leads on each comparable metric - drives the highlight in the compare table. */
function computeBests(players) {
  const metrics = {
    rating: 'max',
    basePrice: 'min',
    'stats.matches': 'max',
    'stats.batting.runs': 'max',
    'stats.batting.average': 'max',
    'stats.batting.strikeRate': 'max',
    'stats.bowling.wickets': 'max',
    'stats.bowling.economy': 'min',
    'stats.bowling.average': 'min',
  }
  const read = (obj, path) => path.split('.').reduce((acc, key) => acc?.[key], obj)

  return Object.fromEntries(
    Object.entries(metrics).map(([path, direction]) => {
      const scored = players
        .map((player) => ({ id: player.id, value: read(player, path) }))
        .filter((row) => typeof row.value === 'number' && row.value > 0)
      if (!scored.length) return [path, null]
      const best = scored.reduce((a, b) =>
        direction === 'max' ? (b.value > a.value ? b : a) : b.value < a.value ? b : a,
      )
      return [path, best.id]
    }),
  )
}

export default router
