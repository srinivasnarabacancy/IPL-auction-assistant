import { createApp } from '../bootstrap/app.js'
import { connectDatabase } from '../database/connection.js'
import { ensureIndex } from '../app/services/rag/ingest.js'

/**
 * Serverless entry point (Vercel).
 *
 * `server.js` owns the long-running process locally; here the platform owns it,
 * so the app is created once per warm instance and the async bootstrap is
 * memoised - without the guard every invocation would reconnect the database
 * and reload the vector index.
 */
const app = createApp()
let bootstrap = null

function ready() {
  // A rejected promise must not be cached, or one transient failure would
  // poison every later request handled by this instance.
  bootstrap ??= (async () => {
    await connectDatabase()
    await ensureIndex()
  })().catch((error) => {
    bootstrap = null
    throw error
  })
  return bootstrap
}

export default async function handler(req, res) {
  try {
    await ready()
  } catch (error) {
    // Serve anyway: most endpoints do not need the index, and a boot failure
    // should degrade the assistant rather than 500 the entire deployment.
    console.error('[boot] initialisation failed, serving in degraded mode:', error.message)
  }
  return app(req, res)
}
