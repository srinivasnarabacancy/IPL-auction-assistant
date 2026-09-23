import { Router } from 'express'
import { AUCTION_RULES } from '../config/index.js'
import { getDatabaseMode } from '../database/connection.js'
import { vectorStore } from '../app/services/rag/vectorStore.js'
import { chatService } from '../app/services/rag/chatService.js'
import playersRouter from './players.js'
import squadRouter from './squad.js'
import auctionRouter from './auction.js'
import chatRouter from './chat.js'

const router = Router()

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: getDatabaseMode(),
    llm: chatService.llmLabel(),
    vectorIndex: { documents: vectorStore.size, provider: vectorStore.provider },
    rules: AUCTION_RULES,
  })
})

router.use('/players', playersRouter)
router.use('/squad', squadRouter)
router.use('/auction', auctionRouter)
router.use('/chat', chatRouter)

export default router
