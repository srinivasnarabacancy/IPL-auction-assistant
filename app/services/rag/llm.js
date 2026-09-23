import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import { config } from '../../../config/index.js'

/**
 * The single seam between the assistant and whichever model generates answers.
 * Both providers expose the same two functions, so `chatService` never knows
 * which one is active.
 */

let anthropicClient = null
let geminiClient = null

const usingGemini = () => config.llmProvider === 'gemini' && Boolean(config.googleApiKey)
const usingAnthropic = () =>
  config.llmProvider === 'anthropic' &&
  Boolean(config.anthropicApiKey || process.env.ANTHROPIC_AUTH_TOKEN)

export const isLlmConfigured = () => usingGemini() || usingAnthropic()

/** Human-readable label for /api/health and the UI badge. */
export const llmLabel = () => {
  if (usingGemini()) return config.geminiModel
  if (usingAnthropic()) return config.anthropicModel
  return 'retrieval-only-fallback'
}

// ---------------------------------------------------------------- Gemini ----

function getGemini() {
  if (!geminiClient) geminiClient = new GoogleGenAI({ apiKey: config.googleApiKey })
  return geminiClient
}

/**
 * Gemini takes the system prompt as its own field and expects turns as
 * `{ role, parts }`, where the assistant role is called "model" rather than
 * "assistant" - the one shape difference from the Anthropic messages array.
 */
function toGeminiRequest({ system, messages }) {
  return {
    model: config.geminiModel,
    contents: messages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    })),
    config: {
      systemInstruction: system,
      maxOutputTokens: 4096,
      temperature: 0.3,
    },
  }
}

// --------------------------------------------------------------- Anthropic --

function getAnthropic() {
  if (!anthropicClient) {
    anthropicClient = config.anthropicApiKey
      ? new Anthropic({ apiKey: config.anthropicApiKey })
      : new Anthropic()
  }
  return anthropicClient
}

/** Keeps a chat turn responsive; Claude thinks adaptively by default. */
const ANTHROPIC_OUTPUT_CONFIG = { effort: 'medium' }

// ------------------------------------------------------------------ Public --

/** Streams an answer, yielding `{ type: 'token', text }` chunks. */
export async function* streamAnswer({ system, messages }) {
  if (usingGemini()) {
    const stream = await getGemini().models.generateContentStream(toGeminiRequest({ system, messages }))
    for await (const chunk of stream) {
      const text = chunk.text
      if (text) yield { type: 'token', text }
    }
    return
  }

  const stream = getAnthropic().messages.stream({
    model: config.anthropicModel,
    max_tokens: 16000,
    output_config: ANTHROPIC_OUTPUT_CONFIG,
    system,
    messages,
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield { type: 'token', text: event.delta.text }
    }
  }

  const final = await stream.finalMessage()
  if (final.stop_reason === 'refusal') {
    yield { type: 'token', text: '\n\n_The model declined to answer this question._' }
  }
}

export async function answerOnce({ system, messages }) {
  if (usingGemini()) {
    const response = await getGemini().models.generateContent(toGeminiRequest({ system, messages }))
    return response.text ?? ''
  }

  const response = await getAnthropic().messages.create({
    model: config.anthropicModel,
    max_tokens: 8000,
    output_config: ANTHROPIC_OUTPUT_CONFIG,
    system,
    messages,
  })

  if (response.stop_reason === 'refusal') return 'The model declined to answer this question.'

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
}
