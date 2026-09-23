import { connectDatabase, disconnectDatabase } from '../database/connection.js'
import { buildIndex } from '../app/services/rag/ingest.js'

await connectDatabase()
await buildIndex()
await disconnectDatabase()
