import { Router } from 'express'
import { z } from 'zod'
import { AUCTION_RULES } from '../config/index.js'
import { chatService } from '../app/services/rag/chatService.js'
import { vectorStore } from '../app/services/rag/vectorStore.js'
import { buildIndex } from '../app/services/rag/ingest.js'
import { asyncRoute } from '../app/middleware/errorHandler.js'
import { validate } from '../app/middleware/validate.js'

const router = Router()

const askBody = z.object({
  question: z.string().trim().min(2).max(2000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .default([]),
  squad: z.array(z.object({ playerId: z.string(), price: z.number().nonnegative().optional() })).default([]),
  budget: z.number().positive().default(AUCTION_RULES.defaultPurse),
  focusPlayerIds: z.array(z.string()).default([]),
})

router.get('/meta', (req, res) => {
  res.json({
    llmConfigured: chatService.isLlmConfigured(),
    llm: chatService.llmLabel(),
    indexedDocuments: vectorStore.size,
    embeddingProvider: vectorStore.provider,
    suggestions: chatService.suggestions,
  })
})

router.post(
  '/ask',
  validate(askBody),
  asyncRoute(async (req, res) => {
    res.json(await chatService.ask(req.body))
  }),
)

/** Server-sent events: `token` events as text arrives, then one `context` event. */
router.post(
  '/stream',
  validate(askBody),
  asyncRoute(async (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`)

    // Watch the response, not the request: `req` emits 'close' as soon as the
    // POST body has been consumed, which would abort the stream immediately.
    let closed = false
    res.on('close', () => {
      closed = true
    })

    try {
      for await (const event of chatService.askStream(req.body)) {
        if (closed) return
        send(event)
      }
      send({ type: 'done' })
    } catch (error) {
      console.error('[chat/stream]', error)
      send({ type: 'error', message: error.message })
    } finally {
      res.end()
    }
  }),
)

router.post(
  '/reindex',
  asyncRoute(async (req, res) => {
    res.json(await buildIndex({ log: () => {} }))
  }),
)

export default router
