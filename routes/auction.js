import { Router } from 'express'
import { z } from 'zod'
import { AUCTION_RULES } from '../config/index.js'
import { auctionService } from '../app/services/auctionService.js'
import { asyncRoute } from '../app/middleware/errorHandler.js'
import { validate } from '../app/middleware/validate.js'

const router = Router()

const createBody = z.object({
  budget: z.number().positive().max(1000).default(AUCTION_RULES.defaultPurse),
  teamName: z.string().trim().min(1).max(40).optional(),
})

router.post(
  '/sessions',
  validate(createBody),
  asyncRoute(async (req, res) => {
    const session = auctionService.create(req.body)
    res.status(201).json(await auctionService.view(session.id))
  }),
)

router.get('/sessions/:id', asyncRoute(async (req, res) => res.json(await auctionService.view(req.params.id))))

router.post(
  '/sessions/:id/reset',
  validate(createBody.partial()),
  asyncRoute(async (req, res) => {
    auctionService.reset(req.params.id, req.body)
    res.json(await auctionService.view(req.params.id))
  }),
)

router.post(
  '/sessions/:id/nominate',
  validate(z.object({ playerId: z.string() })),
  asyncRoute(async (req, res) => {
    await auctionService.nominate(req.params.id, req.body.playerId)
    res.json(await auctionService.view(req.params.id))
  }),
)

router.post(
  '/sessions/:id/bid',
  validate(z.object({ bidder: z.enum(['you', 'rival']).default('you') })),
  asyncRoute(async (req, res) => {
    auctionService.bid(req.params.id, req.body.bidder)
    res.json(await auctionService.view(req.params.id))
  }),
)

router.post(
  '/sessions/:id/sold',
  asyncRoute(async (req, res) => {
    await auctionService.sell(req.params.id)
    res.json(await auctionService.view(req.params.id))
  }),
)

router.post(
  '/sessions/:id/unsold',
  asyncRoute(async (req, res) => {
    await auctionService.unsold(req.params.id)
    res.json(await auctionService.view(req.params.id))
  }),
)

router.delete(
  '/sessions/:id/squad/:playerId',
  asyncRoute(async (req, res) => {
    await auctionService.release(req.params.id, req.params.playerId)
    res.json(await auctionService.view(req.params.id))
  }),
)

export default router
