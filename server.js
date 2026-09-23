import { config } from './config/index.js'
import { createApp } from './bootstrap/app.js'
import { connectDatabase } from './database/connection.js'
import { ensureIndex } from './app/services/rag/ingest.js'

async function start() {
  await connectDatabase()
  await ensureIndex()

  createApp().listen(config.port, () => {
    console.log(`[server] IPL Auction Assistant API on http://localhost:${config.port}/api`)
  })
}

start().catch((error) => {
  console.error('[server] failed to start', error)
  process.exit(1)
})
