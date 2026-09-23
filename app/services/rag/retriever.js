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
  const queryVector = await embedder.embedQuery(question)
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
