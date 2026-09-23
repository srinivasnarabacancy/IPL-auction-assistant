import crypto from 'node:crypto'
import { AUCTION_RULES } from '../../config/index.js'
import { playerRepository } from '../repositories/playerRepository.js'
import { analyseSquad, nextBidIncrement } from './squadService.js'

/**
 * In-memory auction sessions. Swapping this Map for a Mongo collection or Redis
 * is the only change needed to make auctions survive a restart or be shared
 * between users - nothing outside this module knows where the state lives.
 */
const sessions = new Map()

const round = (n) => Math.round(n * 100) / 100

const RIVAL_TEAMS = ['MI', 'CSK', 'RCB', 'KKR', 'GT', 'RR', 'SRH', 'DC', 'LSG', 'PBKS']

function newSession(budget, teamName) {
  return {
    id: crypto.randomUUID(),
    teamName: teamName || 'My Team',
    budget: round(budget ?? AUCTION_RULES.defaultPurse),
    squad: [], // { playerId, price, soldAt }
    lot: null, // { playerId, currentBid, leader, bidCount }
    history: [], // { type, playerId, playerName, price, leader, at }
    createdAt: new Date().toISOString(),
  }
}

export const auctionService = {
  create({ budget, teamName } = {}) {
    const session = newSession(budget, teamName)
    sessions.set(session.id, session)
    return session
  },

  get(id) {
    const session = sessions.get(id)
    if (!session) {
      const error = new Error('Auction session not found')
      error.status = 404
      throw error
    }
    return session
  },

  reset(id, { budget, teamName } = {}) {
    const existing = this.get(id)
    const session = newSession(budget ?? existing.budget, teamName ?? existing.teamName)
    session.id = existing.id
    sessions.set(session.id, session)
    return session
  },

  /** Put a player on the block at their base price. */
  async nominate(id, playerId) {
    const session = this.get(id)
    const player = await playerRepository.findById(playerId)
    if (!player) {
      const error = new Error(`Player ${playerId} not found`)
      error.status = 404
      throw error
    }
    if (session.squad.some((entry) => entry.playerId === player.id)) {
      const error = new Error(`${player.name} is already in your squad`)
      error.status = 409
      throw error
    }
    session.lot = { playerId: player.id, currentBid: player.basePrice, leader: null, bidCount: 0 }
    return session
  },

  /**
   * Places a bid. `bidder` is 'you' or 'rival'. The bid always moves by the
   * published increment for the current price band; the first bid sits at base
   * price so the opening bidder does not pay an increment for nothing.
   */
  bid(id, bidder = 'you') {
    const session = this.get(id)
    if (!session.lot) {
      const error = new Error('No player is currently on the block')
      error.status = 409
      throw error
    }

    const lot = session.lot
    const nextBid = lot.bidCount === 0 ? lot.currentBid : round(lot.currentBid + nextBidIncrement(lot.currentBid))

    if (bidder === 'you') {
      const summary = this.summarise(session)
      if (nextBid > summary.remainingBudget) {
        const error = new Error(
          `Bid of ₹${nextBid} Cr exceeds your remaining purse of ₹${summary.remainingBudget} Cr`,
        )
        error.status = 409
        throw error
      }
    }

    lot.currentBid = nextBid
    lot.leader = bidder === 'you' ? 'you' : RIVAL_TEAMS[Math.floor(Math.random() * RIVAL_TEAMS.length)]
    lot.bidCount += 1
    return session
  },

  /** Hammer falls. If you are the leading bidder the player joins your squad. */
  async sell(id) {
    const session = this.get(id)
    if (!session.lot) {
      const error = new Error('No player is currently on the block')
      error.status = 409
      throw error
    }

    const lot = session.lot
    const player = await playerRepository.findById(lot.playerId)
    const soldAt = new Date().toISOString()

    if (lot.leader === 'you') {
      session.squad.push({ playerId: player.id, price: lot.currentBid, soldAt })
      session.history.unshift({
        type: 'SOLD_TO_YOU', playerId: player.id, playerName: player.name,
        price: lot.currentBid, leader: 'you', at: soldAt,
      })
    } else if (lot.leader) {
      session.history.unshift({
        type: 'SOLD_TO_RIVAL', playerId: player.id, playerName: player.name,
        price: lot.currentBid, leader: lot.leader, at: soldAt,
      })
    } else {
      session.history.unshift({
        type: 'UNSOLD', playerId: player.id, playerName: player.name,
        price: lot.currentBid, leader: null, at: soldAt,
      })
    }

    session.lot = null
    return session
  },

  async unsold(id) {
    const session = this.get(id)
    if (!session.lot) return session
    const player = await playerRepository.findById(session.lot.playerId)
    session.history.unshift({
      type: 'UNSOLD', playerId: player.id, playerName: player.name,
      price: session.lot.currentBid, leader: null, at: new Date().toISOString(),
    })
    session.lot = null
    return session
  },

  async release(id, playerId) {
    const session = this.get(id)
    session.squad = session.squad.filter((entry) => entry.playerId !== playerId)
    return session
  },

  summarise(session) {
    // Synchronous summary used inside bid validation; prices are already known
    // so it does not need the full player objects to compute the purse.
    const totalSpent = round(session.squad.reduce((sum, e) => sum + e.price, 0))
    return { remainingBudget: round(session.budget - totalSpent), totalSpent }
  },

  /** Full session view with hydrated players and the squad analysis. */
  async view(id) {
    const session = this.get(id)
    const squadEntries = await Promise.all(
      session.squad.map(async (entry) => ({
        player: await playerRepository.findById(entry.playerId),
        price: entry.price,
        soldAt: entry.soldAt,
      })),
    )
    const lot = session.lot
      ? { ...session.lot, player: await playerRepository.findById(session.lot.playerId) }
      : null

    return {
      id: session.id,
      teamName: session.teamName,
      budget: session.budget,
      createdAt: session.createdAt,
      lot,
      squad: squadEntries.filter((e) => e.player),
      history: session.history.slice(0, 50),
      summary: analyseSquad(squadEntries, session.budget),
      nextIncrement: lot ? nextBidIncrement(lot.currentBid) : null,
    }
  },
}
