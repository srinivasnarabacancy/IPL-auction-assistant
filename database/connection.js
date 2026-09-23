import mongoose from 'mongoose'
import { config } from '../config/index.js'

let mode = 'memory'

/**
 * Connects to MongoDB when MONGODB_URI is configured. When it is not, the app
 * runs in "memory" mode and the repositories read from the bundled JSON seed.
 * Either way the rest of the app only talks to repositories, never to mongoose.
 */
export async function connectDatabase() {
  if (!config.mongoUri) {
    mode = 'memory'
    console.log('[db] MONGODB_URI not set - running in in-memory mode (seeded from players.json)')
    return mode
  }

  try {
    await mongoose.connect(config.mongoUri, { dbName: config.mongoDbName })
    mode = 'mongo'
    console.log(`[db] connected to MongoDB (${config.mongoDbName})`)
  } catch (error) {
    mode = 'memory'
    console.warn(`[db] MongoDB connection failed (${error.message}) - falling back to in-memory mode`)
  }
  return mode
}

export const getDatabaseMode = () => mode

export async function disconnectDatabase() {
  if (mode === 'mongo') await mongoose.disconnect()
}
