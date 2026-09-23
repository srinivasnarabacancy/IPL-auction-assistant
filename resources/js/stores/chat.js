import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { chatApi } from '@/api/resources.js'
import { useSquadStore } from './squad.js'

let nextId = 1

/**
 * Messages are created with `reactive` rather than as plain objects: the stream
 * handler holds a direct reference and mutates `content` token by token, and a
 * raw object pushed into a ref array would be mutated behind Vue's proxy and
 * never re-render.
 */
const createMessage = (role, content = '') =>
  reactive({
    id: nextId++,
    role,
    content,
    sources: [],
    matchedPlayers: [],
    referencedPlayers: [],
    projections: [],
    streaming: false,
    error: null,
  })

/**
 * Conversation state for the AI assistant. Every question carries the user's
 * live squad and purse so the answer is grounded in their actual position.
 */
export const useChatStore = defineStore('chat', () => {
  const messages = ref([])
  const meta = ref(null)
  const streaming = ref(false)
  let controller = null

  const isEmpty = computed(() => messages.value.length === 0)
  const suggestions = computed(() => meta.value?.suggestions ?? [])

  async function loadMeta() {
    if (meta.value) return meta.value
    meta.value = await chatApi.meta()
    return meta.value
  }

  /** History sent to the API: prior completed turns only, never the live one. */
  const historyPayload = () =>
    messages.value
      .filter((message) => !message.streaming && !message.error && message.content)
      .slice(-12)
      .map(({ role, content }) => ({ role, content }))

  async function ask(question, focusPlayerIds = []) {
    if (!question.trim() || streaming.value) return
    const squadStore = useSquadStore()

    const history = historyPayload()
    messages.value.push(createMessage('user', question.trim()))

    const reply = createMessage('assistant')
    reply.streaming = true
    messages.value.push(reply)

    streaming.value = true
    controller = new AbortController()

    try {
      await chatApi.stream(
        { question: question.trim(), history, focusPlayerIds, ...squadStore.payload() },
        (event) => {
          if (event.type === 'token') reply.content += event.text
          else if (event.type === 'context') Object.assign(reply, {
            sources: event.sources ?? [],
            matchedPlayers: event.matchedPlayers ?? [],
            referencedPlayers: event.referencedPlayers ?? [],
            projections: event.projections ?? [],
          })
          else if (event.type === 'error') reply.error = event.message
        },
        controller.signal,
      )
    } catch (err) {
      if (err.name !== 'AbortError') reply.error = err.message
    } finally {
      reply.streaming = false
      streaming.value = false
      controller = null
    }
  }

  function stop() {
    controller?.abort()
    streaming.value = false
  }

  function clear() {
    stop()
    messages.value = []
  }

  return { messages, meta, streaming, isEmpty, suggestions, loadMeta, ask, stop, clear }
})
