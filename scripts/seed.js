import fs from 'node:fs'
import path from 'node:path'
import { config } from '../config/index.js'
import { connectDatabase, disconnectDatabase, getDatabaseMode } from '../database/connection.js'
import { playerRepository } from '../app/repositories/playerRepository.js'

await connectDatabase()

if (getDatabaseMode() !== 'mongo') {
  console.error('[seed] MONGODB_URI is not set - nothing to seed. In-memory mode reads players.json directly.')
  process.exit(1)
}

const players = JSON.parse(fs.readFileSync(path.join(config.seedsDir, 'players.json'), 'utf8'))
const count = await playerRepository.replaceAll(players)
console.log(`[seed] loaded ${count} players into MongoDB`)
await disconnectDatabase()
