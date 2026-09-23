import fs from 'node:fs'
import path from 'node:path'
import { config } from '../../../config/index.js'
import { playerRepository } from '../../repositories/playerRepository.js'
import { chunkMarkdown, playerToDocument } from './chunker.js'
import { createEmbeddings, LocalEmbeddings } from './embeddings.js'
import { vectorStore } from './vectorStore.js'

/**
 * Builds the retrieval index from two sources:
 *   1. the markdown knowledge base (auction rules, squad rules, role guides)
 *   2. one generated document per player, so player questions are retrievable
 * Run via `npm run ingest`, or automatically on boot if no index exists.
 */
export async function buildIndex({ persist = true, log = console.log } = {}) {
  const ruleChunks = fs
    .readdirSync(config.knowledgeBaseDir)
    .filter((file) => file.endsWith('.md'))
    .flatMap((file) =>
      chunkMarkdown(fs.readFileSync(path.join(config.knowledgeBaseDir, file), 'utf8'), file),
    )

  const players = await playerRepository.findAll()
  const playerChunks = players.map(playerToDocument)

  const chunks = [...ruleChunks, ...playerChunks]
  const texts = chunks.map((chunk) => chunk.text)

  // IDF is learned from the corpus itself and stored alongside the vectors so
  // queries are weighted identically at search time.
  const idf = LocalEmbeddings.learnIdf(texts)
  const embedder = createEmbeddings(idf)
  const vectors = await embedder.embedDocuments(texts)

  vectorStore.reset()
  vectorStore.idf = idf
  vectorStore.provider = embedder.name
  vectorStore.add(
    chunks.map((chunk, i) => ({
      id: `${chunk.type}:${chunk.source}:${i}`,
      ...chunk,
      embedding: vectors[i],
    })),
  )

  log(`[rag] indexed ${ruleChunks.length} rule chunks + ${playerChunks.length} player docs using ${embedder.name}`)
  if (persist) log(`[rag] index written to ${vectorStore.persist()}`)
  return { ruleChunks: ruleChunks.length, playerChunks: playerChunks.length, provider: embedder.name }
}

/**
 * Loads a persisted index, rebuilding it when it is missing or was built by a
 * different embedding provider. Providers produce different vector widths, and
 * scoring a 768-d query against a 4096-d index yields silent nonsense rather
 * than an error - so the provider name is the cache key.
 */
export async function ensureIndex() {
  const loaded = vectorStore.load() && vectorStore.size > 0
  const currentProvider = createEmbeddings(vectorStore.idf).name

  if (loaded && vectorStore.provider === currentProvider) {
    console.log(`[rag] loaded index with ${vectorStore.size} documents (${vectorStore.provider})`)
    return
  }
  if (loaded) {
    console.log(`[rag] index was built with "${vectorStore.provider}" but "${currentProvider}" is active - rebuilding`)
  }
  await buildIndex()
}
