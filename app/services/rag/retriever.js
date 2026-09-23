import { config } from '../../../config/index.js'
import { createEmbeddings } from './embeddings.js'
import { vectorStore } from './vectorStore.js'

/**
 * Embeds the question and returns the best-matching chunks, over-fetching then
 * de-duplicating by (source, heading) so several overlapping splits of one
 * section cannot crowd out every other section.
 */
export async function retrieve(question, topK = config.ragTopK) {
  if (vectorStore.size === 0) return []

  const embedder = createEmbeddings(vectorStore.idf)

  // Embedding the question is a network call and can fail on its own - a quota
  // ceiling, a revoked key. That should cost the answer its retrieved context,
  // not the answer itself: the assistant still has the catalogue matches, the
  // live squad and the budget projections to work from.
  let queryVector
  try {
    queryVector = await embedder.embedQuery(question)
  } catch (error) {
    console.warn(`[rag] query embedding failed (${error.message?.slice(0, 100)}) - answering without retrieval`)
    return []
  }

  const rows = vectorStore.search(queryVector, topK * 3)

  const seen = new Set()
  const sources = []
  for (const row of rows) {
    const key = `${row.source}::${row.heading}`
    if (seen.has(key)) continue
    seen.add(key)
    sources.push({
      title: row.title,
      source: row.source,
      type: row.type,
      playerId: row.playerId || null,
      snippet: row.text,
      score: Math.round(row.score * 10000) / 10000,
    })
    if (sources.length >= topK) break
  }
  return sources
}
