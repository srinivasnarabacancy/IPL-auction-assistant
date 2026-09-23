/**
 * Turns a natural-language question into structured catalogue filters.
 *
 * Vector search alone is unreliable for hard constraints ("under ₹5 crore",
 * "Indian only"), so the assistant runs this deterministic parser alongside
 * retrieval and feeds the exact matches into the prompt. Anything it cannot
 * parse simply comes back empty and retrieval carries the question.
 */

const ROLE_PATTERNS = [
  [/\ball[\s-]?rounders?\b/i, 'All-rounder'],
  [/\b(wicket[\s-]?keepers?|keepers?|wk)\b/i, 'Wicketkeeper'],
  [/\b(bowlers?|pacers?|seamers?|spinners?)\b/i, 'Bowler'],
  [/\b(bat(s?men|ters?|smen)?)\b/i, 'Batter'],
]

const ORDER_PATTERNS = [
  [/\b(middle[\s-]?order)\b/i, 'Middle-order'],
  [/\b(top[\s-]?order|openers?|opening)\b/i, 'Top-order'],
  [/\b(lower[\s-]?order|tail)\b/i, 'Lower-order'],
]

const TAG_PATTERNS = [
  [/\bdeath\b/i, 'Death bowling'],
  [/\bpower[\s-]?play\b/i, 'Powerplay'],
  [/\bfinisher|finishing\b/i, 'Finisher'],
  [/\banchor\b/i, 'Anchor'],
  [/\byorker/i, 'Yorkers'],
  [/\beconom/i, 'Economy'],
  [/\bwicket[\s-]?tak/i, 'Wicket-taker'],
  [/\bnew ball\b/i, 'New ball'],
  [/\bmiddle[\s-]?overs?\b/i, 'Middle-overs'],
  [/\bleader(ship)?|captain/i, 'Leadership'],
  [/\buncapped\b/i, 'Uncapped'],
]

/** Matches "under 5 crore", "below ₹5.5 cr", "less than 3", "upto 2cr". */
const MAX_PRICE = /(?:under|below|less than|cheaper than|up ?to|max(?:imum)?|within|budget of)\s*₹?\s*(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)?/i
const MIN_PRICE = /(?:over|above|more than|at least|min(?:imum)?)\s*₹?\s*(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)?/i

export function parseQuery(question) {
  const filters = {}
  const text = question || ''

  const role = ROLE_PATTERNS.find(([pattern]) => pattern.test(text))
  if (role) filters.role = role[1]

  const order = ORDER_PATTERNS.find(([pattern]) => pattern.test(text))
  if (order) {
    filters.battingOrder = order[1]
    // "middle-order batsmen" implies a batter even if the word is ambiguous.
    if (!filters.role) filters.role = 'Batter'
  }

  if (/\bindian?\b|\bdomestic\b|\buncapped indian\b/i.test(text)) filters.nationality = 'Indian'
  if (/\boverseas\b|\bforeign\b|\binternational player\b/i.test(text)) filters.nationality = 'Overseas'

  if (/\bspinners?\b|\bspin\b/i.test(text)) filters.bowlingType = 'Spin'
  if (/\bpacers?\b|\bseamers?\b|\bfast bowlers?\b|\bpace\b/i.test(text)) filters.bowlingType = 'Pace'

  const maxMatch = text.match(MAX_PRICE)
  if (maxMatch) filters.maxPrice = Number(maxMatch[1])
  const minMatch = text.match(MIN_PRICE)
  if (minMatch) filters.minPrice = Number(minMatch[1])

  const tags = TAG_PATTERNS.filter(([pattern]) => pattern.test(text)).map(([, tag]) => tag)
  if (tags.length) filters.tags = tags

  // "death bowler" should mean a bowler who bowls at the death, not a hitter
  // tagged "Death hitter" - so pin the role when both signals are present.
  if (tags.includes('Death bowling') && /\bbowler|bowling\b/i.test(text) && !filters.role) {
    filters.role = 'Bowler'
  }

  return filters
}

export const hasStructuredIntent = (filters) => Object.keys(filters).length > 0
