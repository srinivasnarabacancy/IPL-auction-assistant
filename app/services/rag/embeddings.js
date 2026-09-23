import { GoogleGenAI } from '@google/genai'
import { config } from '../../../config/index.js'

// Wide enough that single-token queries (a bare surname, "yorkers") are not
// swamped by hash collisions from unrelated documents. At ~5k vocabulary terms
// this leaves the space sparse; the vectors are small and the corpus is tiny.
const DIMENSIONS = 4096
const MAX_RETRIES = 4
const STOPWORDS = new Set(
  'a an the and or of to in on for with is are was were be been at by from as it its his her he she they them this that these those who whom which what how why when where do does did not no you your we our i me my if then than so such can could should would may might will shall have has had'.split(' '),
)

export const tokenize = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9₹.\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/^[-.]+|[-.]+$/g, ''))
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))

/** Deterministic 32-bit string hash (FNV-1a). */
function hash(token) {
  let h = 0x811c9dc5
  for (let i = 0; i < token.length; i += 1) {
    h ^= token.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Local hashed TF-IDF embedder. Zero dependencies and no API key, which keeps
 * the RAG pipeline runnable out of the box; `idf` is learned at ingest time and
 * stored in the index so queries are scored on the same basis as documents.
 */
export class LocalEmbeddings {
  constructor(idf = {}) {
    this.name = 'local-hashed-tfidf'
    this.dimensions = DIMENSIONS
    this.idf = idf
  }

  static learnIdf(documents) {
    const docFreq = new Map()
    for (const doc of documents) {
      for (const token of new Set(tokenize(doc))) {
        docFreq.set(token, (docFreq.get(token) || 0) + 1)
      }
    }
    const total = documents.length || 1
    const idf = {}
    for (const [token, freq] of docFreq) {
      idf[token] = Math.log((total + 1) / (freq + 1)) + 1
    }
    return idf
  }

  embedOne(text) {
    const tokens = tokenize(text)
    const termFreq = new Map()
    for (const token of tokens) termFreq.set(token, (termFreq.get(token) || 0) + 1)

    const vector = new Float64Array(DIMENSIONS)
    for (const [token, count] of termFreq) {
      const weight = (1 + Math.log(count)) * (this.idf[token] ?? 1)
      const h = hash(token)
      const index = h % DIMENSIONS
      const sign = (h >>> 31) & 1 ? -1 : 1
      vector[index] += sign * weight
    }

    let norm = 0
    for (const value of vector) norm += value * value
    norm = Math.sqrt(norm) || 1
    return Array.from(vector, (value) => value / norm)
  }

  async embedDocuments(texts) {
    return texts.map((text) => this.embedOne(text))
  }

  async embedQuery(text) {
    return this.embedOne(text)
  }
}

/**
 * Gemini dense embeddings - the same model the team's other projects use.
 *
 * `outputDimensionality` truncates the native 3072-d vector. Google only
 * normalises the full-length output, so anything shorter must be L2-normalised
 * here; the vector store treats a dot product as a cosine and would score
 * un-normalised vectors incorrectly.
 */
export class GeminiEmbeddings {
  constructor() {
    this.name = `gemini:${config.geminiEmbeddingModel}@${config.geminiEmbeddingDimensions}`
    this.dimensions = config.geminiEmbeddingDimensions
    this.batchSize = 90
    this.client = new GoogleGenAI({ apiKey: config.googleApiKey })
  }

  #normalise(values) {
    let norm = 0
    for (const value of values) norm += value * value
    norm = Math.sqrt(norm) || 1
    return values.map((value) => value / norm)
  }

  /**
   * Retries on 429. The free tier allows 100 embed requests a minute, which a
   * deploy can trip if anything else has been hitting the key recently - and a
   * build that dies on a transient quota error is a build that fails for
   * reasons unrelated to the code. Google returns the wait in `retryDelay`, so
   * honour it rather than guessing.
   */
  async #embedBatch(batch, taskType, attempt = 0) {
    try {
      return await this.client.models.embedContent({
        model: config.geminiEmbeddingModel,
        contents: batch,
        config: { outputDimensionality: this.dimensions, taskType },
      })
    } catch (error) {
      const retriable = error?.status === 429 || error?.status >= 500
      if (!retriable || attempt >= MAX_RETRIES) throw error

      const suggested = Number(String(error.message ?? '').match(/"retryDelay"\s*:\s*"(\d+)s"/)?.[1])
      const waitMs = Number.isFinite(suggested) ? (suggested + 1) * 1000 : 2 ** attempt * 2000
      console.warn(`[rag] embeddings ${error.status} - retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})`)
      await new Promise((resolve) => setTimeout(resolve, waitMs))
      return this.#embedBatch(batch, taskType, attempt + 1)
    }
  }

  async #embed(texts, taskType) {
    const out = []
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const response = await this.#embedBatch(texts.slice(i, i + this.batchSize), taskType)
      out.push(...(response.embeddings ?? []).map((embedding) => this.#normalise(embedding.values ?? [])))
    }
    return out
  }

  async embedDocuments(texts) {
    return this.#embed(texts, 'RETRIEVAL_DOCUMENT')
  }

  async embedQuery(text) {
    const [embedding] = await this.#embed([text], 'RETRIEVAL_QUERY')
    return embedding
  }
}

/** Cohere dense embeddings - same interface, used when EMBEDDING_PROVIDER=cohere. */
export class CohereEmbeddings {
  constructor() {
    this.name = `cohere:${config.cohereModel}`
    this.dimensions = 1024
    this.batchSize = 90
  }

  async #embed(texts, inputType) {
    const out = []
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const response = await fetch('https://api.cohere.com/v1/embed', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.cohereApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: texts.slice(i, i + this.batchSize),
          model: config.cohereModel,
          input_type: inputType,
        }),
      })
      if (!response.ok) throw new Error(`Cohere embed failed: ${response.status} ${await response.text()}`)
      const json = await response.json()
      out.push(...json.embeddings)
    }
    return out
  }

  async embedDocuments(texts) {
    return this.#embed(texts, 'search_document')
  }

  async embedQuery(text) {
    const [embedding] = await this.#embed([text], 'search_query')
    return embedding
  }
}

/**
 * Falls back to the local embedder whenever the selected provider has no key,
 * so the app still boots and retrieves with zero configuration.
 */
export function createEmbeddings(idf) {
  if (config.embeddingProvider === 'gemini' && config.googleApiKey) return new GeminiEmbeddings()
  if (config.embeddingProvider === 'cohere' && config.cohereApiKey) return new CohereEmbeddings()
  return new LocalEmbeddings(idf)
}
