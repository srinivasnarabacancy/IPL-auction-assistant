import { connectDatabase, disconnectDatabase } from '../database/connection.js'
import { buildIndex } from '../app/services/rag/ingest.js'

/**
 * `--soft` reports a failure without failing the process.
 *
 * Locally you want a bad ingest to be loud, so the default exits non-zero.
 * During a deploy the trade is reversed: an embedding provider being briefly
 * unavailable should not block a release, because the app degrades to
 * catalogue-only answers on its own rather than breaking.
 */
const soft = process.argv.includes('--soft')

await connectDatabase()
try {
  await buildIndex()
} catch (error) {
  if (!soft) throw error
  console.warn(`[rag] index build failed: ${error.message?.slice(0, 160)}`)
  console.warn('[rag] continuing without a prebuilt index - retrieval will be unavailable until it is rebuilt')
}
await disconnectDatabase()
