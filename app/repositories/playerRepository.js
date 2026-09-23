import fs from 'node:fs'
import path from 'node:path'
import { config } from '../../config/index.js'
import { getDatabaseMode } from '../../database/connection.js'
import { Player } from '../models/Player.js'

let memoryCache = null

function loadSeed() {
  if (!memoryCache) {
    const file = path.join(config.seedsDir, 'players.json')
    memoryCache = JSON.parse(fs.readFileSync(file, 'utf8'))
  }
  return memoryCache
}

/**
 * The only place the rest of the app touches player storage.
 *
 * Filtering and sorting deliberately live in `services/playerQuery.js` as pure
 * functions over the full set: the catalogue is small (tens of players) and
 * keeping one implementation avoids a Mongo dialect drifting from the in-memory
 * one. When the catalogue grows, push the predicate down into `findAll` here -
 * every caller already goes through this interface.
 */
export const playerRepository = {
  async findAll() {
    if (getDatabaseMode() === 'mongo') {
      const docs = await Player.find({}).lean()
      if (docs.length) return docs.map(stripMongoFields)
    }
    return loadSeed()
  },

  async findById(id) {
    const all = await this.findAll()
    return all.find((player) => player.id === id || player.slug === id) || null
  },

  async findByIds(ids) {
    const all = await this.findAll()
    const byId = new Map(all.map((player) => [player.id, player]))
    // Preserve the caller's ordering rather than the catalogue's.
    return ids.map((id) => byId.get(id)).filter(Boolean)
  },

  async replaceAll(players) {
    if (getDatabaseMode() !== 'mongo') {
      memoryCache = players
      return players.length
    }
    await Player.deleteMany({})
    await Player.insertMany(players)
    return players.length
  },
}

function stripMongoFields({ _id, createdAt, updatedAt, ...rest }) {
  return rest
}
