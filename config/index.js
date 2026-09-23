import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const here = path.dirname(fileURLToPath(import.meta.url))

/** Project root. `config/` sits directly under it, so one level up. */
export const BASE_PATH = path.resolve(here, '..')

dotenv.config({ path: path.join(BASE_PATH, '.env') })

const num = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const config = {
  port: num(process.env.PORT, 4000),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  mongoUri: process.env.MONGODB_URI || '',
  mongoDbName: process.env.MONGODB_DB_NAME || 'ipl_auction',

  /** 'gemini' | 'anthropic'. Defaults to whichever key is present. */
  llmProvider: process.env.LLM_PROVIDER || (process.env.GOOGLE_API_KEY ? 'gemini' : 'anthropic'),

  googleApiKey: process.env.GOOGLE_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
  // gemini-embedding-001 natively returns 3072 dims; 768 keeps the index small
  // and is the size the other projects in this stack use.
  geminiEmbeddingDimensions: num(process.env.GEMINI_EMBEDDING_DIMENSIONS, 768),

  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-opus-5',

  /** 'local' | 'gemini' | 'cohere' */
  embeddingProvider: process.env.EMBEDDING_PROVIDER || 'local',
  cohereApiKey: process.env.COHERE_API_KEY || '',
  cohereModel: process.env.COHERE_MODEL || 'embed-english-v3.0',

  ragTopK: num(process.env.RAG_TOP_K, 6),

  // Checked-in source data lives under database/, generated artefacts under storage/.
  seedsDir: path.join(BASE_PATH, 'database', 'seeds'),
  knowledgeBaseDir: path.join(BASE_PATH, 'database', 'knowledge-base'),
  storageDir: path.join(BASE_PATH, 'storage'),
  clientDist: path.join(BASE_PATH, 'dist'),
}

/** Auction constants. Kept here so a future "league settings" feature has one place to change. */
export const AUCTION_RULES = {
  defaultPurse: 120,
  minSquadSize: 18,
  maxSquadSize: 25,
  maxOverseas: 8,
  maxOverseasInXI: 4,
  roles: ['Batter', 'Bowler', 'All-rounder', 'Wicketkeeper'],
  nationalities: ['Indian', 'Overseas'],
  /** Bid increments in INR crore, keyed by the price floor they apply above. */
  bidIncrements: [
    { above: 5, step: 0.25 },
    { above: 2, step: 0.2 },
    { above: 1, step: 0.1 },
    { above: 0, step: 0.05 },
  ],
}
