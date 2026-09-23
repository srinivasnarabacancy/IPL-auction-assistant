import fs from 'node:fs'
import path from 'node:path'
import { config } from '../../../config/index.js'

const INDEX_FILE = path.join(config.storageDir, 'vector-index.json')

function cosine(a, b) {
  // Vectors are stored L2-normalised, so the dot product is the cosine.
  let sum = 0
  for (let i = 0; i < a.length; i += 1) sum += a[i] * b[i]
  return sum
}

/**
 * A file-backed in-process vector index.
 *
 * This is the seam for a real vector database: implement `add` / `search` /
 * `load` against Qdrant, pgvector or Supabase and nothing else in the app
 * changes. The corpus here is a few hundred chunks, so an exhaustive cosine
 * scan is both exact and instant.
 */
export class MemoryVectorStore {
  constructor() {
    this.documents = []
    this.idf = {}
    this.provider = null
  }

  reset() {
    this.documents = []
  }

  add(documents) {
    this.documents.push(...documents)
  }

  search(queryVector, topK = 6) {
    return this.documents
      .map((doc) => ({ ...doc, score: cosine(queryVector, doc.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ embedding, ...rest }) => rest)
  }

  get size() {
    return this.documents.length
  }

  persist() {
    fs.mkdirSync(path.dirname(INDEX_FILE), { recursive: true })
    fs.writeFileSync(
      INDEX_FILE,
      JSON.stringify({
        provider: this.provider,
        idf: this.idf,
        builtAt: new Date().toISOString(),
        documents: this.documents,
      }),
    )
    return INDEX_FILE
  }

  load() {
    if (!fs.existsSync(INDEX_FILE)) return false
    const raw = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'))
    this.documents = raw.documents || []
    this.idf = raw.idf || {}
    this.provider = raw.provider || null
    return true
  }
}

export const vectorStore = new MemoryVectorStore()
export { INDEX_FILE }
