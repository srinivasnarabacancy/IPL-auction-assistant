import { config, AUCTION_RULES } from '../../../config/index.js'
import { playerRepository } from '../../repositories/playerRepository.js'
import { filterPlayers, sortPlayers } from '../playerQuery.js'
import { analyseSquad, projectPurchase } from '../squadService.js'
import { isLlmConfigured, llmLabel, streamAnswer, answerOnce } from './llm.js'
import { parseQuery, hasStructuredIntent } from './queryParser.js'
import { retrieve } from './retriever.js'

const MAX_HISTORY_MESSAGES = 12
const MAX_CANDIDATES = 8
/** How many recent turns to scan for a carried-over player reference. */
const CARRY_OVER_TURNS = 4

const SYSTEM_PROMPT = `You are the IPL Auction Assistant: an expert analyst helping a franchise plan and execute an IPL auction.

You help with four things:
1. Finding players that fit a stated need, budget and role.
2. Comparing players against each other for a specific role.
3. Explaining auction rules, squad composition rules and budget strategy.
4. Reasoning about the user's current squad, purse and what they can still afford.

Ground every factual claim in the CONTEXT provided in the user message. The context contains
retrieved rule excerpts, matching players from the catalogue, and the user's live squad state.
If the context does not contain what you need, say so plainly rather than inventing a player,
a statistic or a rule.

Style:
- Lead with the answer. Be concise and concrete.
- Quote prices as "₹X Cr" and always mention base price when recommending a player.
- When recommending players, give a short reason tied to their numbers or role tags, and where
  it matters note whether they are Indian or Overseas, because the overseas limit binds squads.
- When the user's budget is in the context, check recommendations against it and say what is
  affordable.
- Use short markdown: a lead sentence, then a compact list. Never output a giant table.
- Never invent statistics. Every number you quote must appear in the context.`

function formatPlayerLine(player) {
  const b = player.stats.batting
  const w = player.stats.bowling
  const bits = [
    `${player.name} (${player.role}, ${player.nationality}, base ₹${player.basePrice} Cr, rating ${player.rating})`,
  ]
  if (player.battingOrder && player.battingOrder !== 'N/A') bits.push(`bats ${player.battingOrder}`)
  if (b.runs) bits.push(`${b.runs} runs @ avg ${b.average}, SR ${b.strikeRate}`)
  if (w.wickets) bits.push(`${w.wickets} wkts @ econ ${w.economy}, avg ${w.average}`)
  if (player.tags?.length) bits.push(`tags: ${player.tags.join(', ')}`)
  return `- ${bits.join(' — ')}`
}

function formatSquadContext(summary, squadEntries) {
  if (!summary) return ''
  const roles = Object.entries(summary.roleDistribution)
    .map(([role, n]) => `${role}: ${n}`)
    .join(', ')
  const names = squadEntries.length
    ? squadEntries.map((e) => `${e.player.name} (₹${e.price} Cr)`).join('; ')
    : 'none yet'

  return [
    `Total purse: ₹${summary.budget} Cr`,
    `Spent: ₹${summary.totalSpent} Cr`,
    `Remaining purse: ₹${summary.remainingBudget} Cr`,
    `Squad size: ${summary.squadSize} (min ${summary.limits.minSquadSize}, max ${summary.limits.maxSquadSize})`,
    `Indian: ${summary.indianCount}, Overseas: ${summary.overseasCount} (limit ${summary.limits.maxOverseas}, only ${summary.limits.maxOverseasInXI} may play)`,
    `Role distribution: ${roles}`,
    summary.slotsToMinimum > 0
      ? `Slots still needed to reach the minimum squad: ${summary.slotsToMinimum}, averaging ₹${summary.costPerRemainingSlot} Cr per slot`
      : 'Minimum squad size already met',
    summary.violations.length
      ? `Open issues: ${summary.violations.map((v) => v.message).join(' ')}`
      : 'No squad rule violations.',
    `Current squad: ${names}`,
  ].join('\n')
}

/**
 * Assembles everything the model needs to answer: retrieved knowledge-base
 * chunks, deterministic catalogue matches for any hard constraints in the
 * question, the named players the user referred to, and the live squad state.
 */
export async function buildContext({ question, history = [], squad = [], budget, focusPlayerIds = [] }) {
  const players = await playerRepository.findAll()
  const filters = parseQuery(question)

  const candidates = hasStructuredIntent(filters)
    ? sortPlayers(filterPlayers(players, filters), 'rating').slice(0, MAX_CANDIDATES)
    : []

  // A follow-up like "how much would he cost?" names nobody, so fall back to
  // whoever the last couple of turns were about - otherwise the pronoun loses
  // the retrieval target and the answer claims the player is not in context.
  let namedPlayers = findNamedPlayers(question, players)
  if (!namedPlayers.length) {
    const recentTurns = history.slice(-CARRY_OVER_TURNS).map((turn) => turn.content).join(' ')
    if (recentTurns) namedPlayers = findNamedPlayers(recentTurns, players).slice(0, 3)
  }

  const focusPlayers = focusPlayerIds.length
    ? players.filter((player) => focusPlayerIds.includes(player.id))
    : []

  const squadEntries = await hydrateSquad(squad, players)
  const summary = analyseSquad(squadEntries, budget ?? AUCTION_RULES.defaultPurse)

  const sources = await retrieve(question, config.ragTopK)

  // A projection for every explicitly referenced player answers
  // "how much budget will remain if I buy X" without a second round trip.
  const projections = [...new Set([...focusPlayers, ...namedPlayers])]
    .slice(0, 5)
    .map((player) => projectPurchase(summary, player))

  return { filters, candidates, namedPlayers, focusPlayers, squadEntries, summary, sources, projections }
}

/**
 * Finds players the question refers to by name.
 *
 * Full names always match. A bare surname expands to everyone who shares it -
 * "iyer" should offer both Iyers rather than nothing - except where the user
 * already disambiguated that surname with a full name, so "Suryakumar Yadav"
 * does not also drag in Kuldeep Yadav and Mayank Yadav.
 */
function findNamedPlayers(question, players) {
  const lowered = question.toLowerCase()
  const mentions = (needle) => new RegExp(`\\b${escapeRegex(needle)}\\b`, 'i').test(lowered)

  const fullNameMatches = players.filter((player) => mentions(player.name))
  const disambiguated = new Set(fullNameMatches.map(surnameOf).filter(Boolean))

  const surnameMatches = players.filter((player) => {
    const surname = surnameOf(player)
    return Boolean(surname) && !disambiguated.has(surname) && mentions(surname)
  })

  const seen = new Set()
  return [...fullNameMatches, ...surnameMatches].filter((player) => {
    if (seen.has(player.id)) return false
    seen.add(player.id)
    return true
  })
}

const surnameOf = (player) => {
  const parts = player.name.split(' ')
  const surname = parts.slice(1).join(' ').toLowerCase()
  return surname.length > 3 ? surname : ''
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

async function hydrateSquad(squad, players) {
  const byId = new Map(players.map((player) => [player.id, player]))
  return squad
    .map((entry) => {
      const player = entry.player || byId.get(entry.playerId || entry.id)
      if (!player) return null
      return { player, price: entry.price ?? player.basePrice }
    })
    .filter(Boolean)
}

function renderContext(ctx) {
  const blocks = []

  if (ctx.sources.length) {
    blocks.push(
      `## Retrieved knowledge\n\n${ctx.sources.map((s) => `### ${s.title} (${s.source})\n${s.snippet}`).join('\n\n')}`,
    )
  }

  if (ctx.candidates.length) {
    const described = Object.entries(ctx.filters)
      .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join('/') : value}`)
      .join(', ')
    blocks.push(
      `## Catalogue matches for the constraints in the question (${described})\n\n${ctx.candidates.map(formatPlayerLine).join('\n')}`,
    )
  }

  const referenced = [...new Set([...ctx.focusPlayers, ...ctx.namedPlayers])]
  if (referenced.length) {
    blocks.push(`## Players referred to in the question\n\n${referenced.map(formatPlayerLine).join('\n')}`)
  }

  blocks.push(`## User's live squad and budget\n\n${formatSquadContext(ctx.summary, ctx.squadEntries)}`)

  if (ctx.projections.length) {
    blocks.push(
      `## Budget projections if these players are bought at base price\n\n${ctx.projections
        .map(
          (p) =>
            `- ${p.playerName} at ₹${p.bid} Cr → purse left ₹${p.remainingAfter} Cr, squad ${p.squadSizeAfter}. ${p.affordable ? 'Affordable.' : `Not possible: ${p.blockers.join(' ')}`}`,
        )
        .join('\n')}`,
    )
  }

  return blocks.join('\n\n---\n\n')
}

function buildMessages(question, ctx, history = []) {
  const messages = history
    .slice(-MAX_HISTORY_MESSAGES)
    .filter((turn) => turn.role === 'user' || turn.role === 'assistant')
    .map((turn) => ({ role: turn.role, content: String(turn.content) }))

  messages.push({
    role: 'user',
    content: `CONTEXT\n\n${renderContext(ctx)}\n\n---\n\nQUESTION: ${question}`,
  })
  return messages
}

/**
 * Deterministic answer used when no LLM key is configured. It is intentionally
 * plain: it reports exactly what retrieval and the catalogue found, so the
 * product is still usable and the RAG pipeline is still observable.
 */
function composeFallbackAnswer(question, ctx) {
  const parts = []
  const s = ctx.summary

  // A bare name ("iyer") produces no structured filters, so fall back to the
  // players the question named rather than answering with rules alone.
  const referenced = [...new Set([...ctx.focusPlayers, ...ctx.namedPlayers])]
  if (!ctx.candidates.length && referenced.length) {
    parts.push(`**${referenced.length} player${referenced.length === 1 ? '' : 's'}** matching that name:`)
    parts.push(
      referenced
        .map((p) => {
          const b = p.stats.batting
          const w = p.stats.bowling
          const line = b.runs
            ? `${b.runs} runs @ SR ${b.strikeRate}`
            : w.wickets
              ? `${w.wickets} wkts @ econ ${w.economy}`
              : `rating ${p.rating}`
          return `- **${p.name}** — ${p.role}, ${p.nationality}, base **₹${p.basePrice} Cr**, ${line}`
        })
        .join('\n'),
    )
  }

  if (ctx.candidates.length) {
    const described = []
    if (ctx.filters.nationality) described.push(ctx.filters.nationality)
    if (ctx.filters.battingOrder) described.push(ctx.filters.battingOrder.toLowerCase())
    if (ctx.filters.role) described.push(`${ctx.filters.role.toLowerCase()}s`)
    if (ctx.filters.tags?.length) described.push(`tagged ${ctx.filters.tags.join('/')}`)
    if (typeof ctx.filters.maxPrice === 'number') described.push(`under ₹${ctx.filters.maxPrice} Cr`)

    parts.push(`**${ctx.candidates.length} match${ctx.candidates.length === 1 ? '' : 'es'}** for ${described.join(' ') || 'your query'}:`)
    parts.push(
      ctx.candidates
        .map((p) => {
          const affordable = p.basePrice <= s.remainingBudget ? '' : ' _(over your remaining purse)_'
          return `- **${p.name}** — ${p.role}, ${p.nationality}, base **₹${p.basePrice} Cr**, rating ${p.rating}${affordable}`
        })
        .join('\n'),
    )
  }

  if (ctx.projections.length) {
    parts.push('**Budget impact:**')
    parts.push(
      ctx.projections
        .map((p) =>
          p.affordable
            ? `- Buying **${p.playerName}** at ₹${p.bid} Cr leaves **₹${p.remainingAfter} Cr** and a squad of ${p.squadSizeAfter}.`
            : `- **${p.playerName}** is not possible right now: ${p.blockers.join(' ')}`,
        )
        .join('\n'),
    )
  }

  if (ctx.sources.length) {
    const rules = ctx.sources.filter((source) => source.type === 'rule').slice(0, 2)
    if (rules.length) {
      parts.push('**From the knowledge base:**')
      parts.push(rules.map((r) => `> **${r.title}** — ${r.snippet.slice(0, 400).trim()}…`).join('\n\n'))
    }
  }

  parts.push(
    `**Your position:** ₹${s.remainingBudget} Cr left of ₹${s.budget} Cr, ${s.squadSize} players (${s.indianCount} Indian / ${s.overseasCount} overseas).`,
  )
  parts.push(
    '_Set `GOOGLE_API_KEY` in `.env` to get full conversational answers; this is the retrieval-only fallback._',
  )

  return parts.join('\n\n')
}

/**
 * Pulls the innermost human-readable `message` out of a provider error.
 *
 * Gemini wraps an entire escaped JSON document inside its outer `message`
 * field, and Anthropic prefixes a status code before its JSON, so a regex over
 * the raw text reaches the wrong layer. Parsing and recursing finds the actual
 * sentence regardless of how deeply it is nested.
 */
function deepestMessage(text) {
  const start = text.indexOf('{')
  if (start === -1) return null

  let parsed
  try {
    parsed = JSON.parse(text.slice(start))
  } catch {
    return null
  }

  let found = null
  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    for (const [key, value] of Object.entries(node)) {
      if (key === 'message' && typeof value === 'string') found = deepestMessage(value) ?? value
      else walk(value)
    }
  }
  walk(parsed)
  return found
}

function summariseApiError(error) {
  const raw = error?.message ?? String(error)
  const cleaned = (deepestMessage(raw) ?? raw).replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, '')
  return cleaned.length > 140 ? `${cleaned.slice(0, 140)}\u2026` : cleaned
}

export const chatService = {
  isLlmConfigured,
  llmLabel,

  suggestions: [
    'Show Indian middle-order batsmen under ₹5 crore.',
    'I need a death bowler. Show suitable options.',
    'We have ₹12 crore remaining. What type of players can we target?',
    'Compare Jasprit Bumrah and Rashid Khan.',
    'How much budget will remain if I buy Hardik Pandya?',
    'What are the overseas player rules for a squad?',
  ],

  async ask({ question, history = [], squad = [], budget, focusPlayerIds = [] }) {
    const ctx = await buildContext({ question, history, squad, budget, focusPlayerIds })
    const answer = isLlmConfigured()
      ? await answerOnce({ system: SYSTEM_PROMPT, messages: buildMessages(question, ctx, history) })
      : composeFallbackAnswer(question, ctx)

    return { answer, ...publicContext(ctx) }
  },

  /** Async generator of SSE-ready events: token* then a final `sources` event. */
  async *askStream({ question, history = [], squad = [], budget, focusPlayerIds = [] }) {
    const ctx = await buildContext({ question, history, squad, budget, focusPlayerIds })

    if (isLlmConfigured()) {
      let produced = false
      try {
        for await (const event of streamAnswer({ system: SYSTEM_PROMPT, messages: buildMessages(question, ctx, history) })) {
          produced = true
          yield event
        }
      } catch (error) {
        // A bad key or a transient API failure should not leave an empty
        // bubble: explain it, then still answer from retrieval.
        console.error('[chat] LLM call failed:', error.message)
        if (!produced) {
          yield { type: 'token', text: `_${llmLabel()} is unavailable — ${summariseApiError(error)}. Answering from retrieval only._\n\n` }
          for (const piece of composeFallbackAnswer(question, ctx).match(/[\s\S]{1,24}/g) || []) {
            yield { type: 'token', text: piece }
          }
        }
      }
    } else {
      // Chunk the fallback so the UI's streaming path is exercised identically.
      const text = composeFallbackAnswer(question, ctx)
      for (const piece of text.match(/[\s\S]{1,24}/g) || []) {
        yield { type: 'token', text: piece }
      }
    }

    yield { type: 'context', ...publicContext(ctx) }
  },
}

function publicContext(ctx) {
  return {
    sources: ctx.sources,
    matchedPlayers: ctx.candidates,
    referencedPlayers: [...new Set([...ctx.focusPlayers, ...ctx.namedPlayers])],
    projections: ctx.projections,
    filters: ctx.filters,
    summary: ctx.summary,
    llm: llmLabel(),
  }
}
