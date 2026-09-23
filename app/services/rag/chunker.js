const MAX_CHUNK_CHARS = 1400
const OVERLAP_CHARS = 150

function splitLongText(text, maxChars = MAX_CHUNK_CHARS, overlap = OVERLAP_CHARS) {
  if (text.length <= maxChars) return [text]
  const parts = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length)
    parts.push(text.slice(start, end).trim())
    if (end === text.length) break
    start = end - overlap
  }
  return parts.filter(Boolean)
}

/**
 * Splits a markdown document along `##` headings, then splits any section that
 * is still too long. The document title and heading are prepended to every
 * chunk so a retrieved fragment always carries its own context.
 */
export function chunkMarkdown(content, fileName) {
  const titleMatch = content.match(/^#\s+(.+)$/m)
  const docTitle = titleMatch ? titleMatch[1].trim() : fileName

  const sections = content.split(/\n(?=##\s+)/)
  const chunks = []

  for (const rawSection of sections) {
    const section = rawSection.trim()
    if (!section) continue

    const headingMatch = section.match(/^##\s+(.+)$/m)
    const heading = headingMatch ? headingMatch[1].trim() : docTitle
    const body = section.replace(/^#{1,2}\s+.+$/m, '').trim()
    if (!body) continue

    for (const piece of splitLongText(body)) {
      chunks.push({
        text: `${docTitle} — ${heading}\n\n${piece}`,
        heading,
        title: heading,
        source: fileName,
        type: 'rule',
      })
    }
  }

  return chunks
}

/**
 * Renders a player row as a natural-language document. Retrieval quality for
 * questions like "I need a death bowler" depends far more on this text than on
 * the embedding model, so the wording deliberately mirrors how users ask.
 */
export function playerToDocument(player) {
  const { stats } = player
  const lines = [
    `${player.name} is a ${player.nationality} ${player.role.toLowerCase()} from ${player.country}, aged ${player.age}, with a base price of ₹${player.basePrice} crore.`,
    player.team2025 ? `He was with ${player.team2025} in the most recent season.` : '',
    player.capped ? 'He is a capped international player.' : 'He is an uncapped player.',
    player.battingStyle ? `Batting style: ${player.battingStyle}.` : '',
    player.battingOrder && player.battingOrder !== 'N/A'
      ? `He bats in the ${player.battingOrder.toLowerCase()} of the innings.`
      : '',
    player.bowlingStyle ? `Bowling style: ${player.bowlingStyle} (${player.bowlingType || 'n/a'}).` : '',
    (player.tags || []).length ? `Role tags and specialities: ${player.tags.join(', ')}.` : '',
    `Career: ${stats.matches} matches.`,
    stats.batting.runs
      ? `Batting: ${stats.batting.runs} runs at an average of ${stats.batting.average} and a strike rate of ${stats.batting.strikeRate}, with ${stats.batting.fifties} fifties, ${stats.batting.hundreds} hundreds and a best of ${stats.batting.highestScore}.`
      : '',
    stats.bowling.wickets
      ? `Bowling: ${stats.bowling.wickets} wickets at an economy of ${stats.bowling.economy} and an average of ${stats.bowling.average}, best figures ${stats.bowling.bestFigures}.`
      : '',
    `Overall assistant rating: ${player.rating} out of 100.`,
  ]

  return {
    text: lines.filter(Boolean).join(' '),
    heading: player.name,
    title: player.name,
    source: 'players.json',
    type: 'player',
    playerId: player.id,
  }
}
