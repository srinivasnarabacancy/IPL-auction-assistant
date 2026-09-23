/**
 * Minimal markdown renderer for assistant answers.
 *
 * The input is escaped before any formatting is applied, so model output can
 * never inject markup into the page. Only the small subset the assistant is
 * prompted to produce is supported: headings, bold, italics, inline code,
 * blockquotes and unordered lists.
 */

const escapeHtml = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/**
 * Code spans are lifted out before the emphasis rules run and restored
 * afterwards, so underscores inside things like `ANTHROPIC_API_KEY` are not
 * mistaken for italics.
 */
const inline = (text) => {
  const codeSpans = []
  const withPlaceholders = text.replace(/`([^`]+)`/g, (_match, code) => {
    codeSpans.push(code)
    return `\u0000${codeSpans.length - 1}\u0000`
  })

  const formatted = withPlaceholders
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')

  return formatted.replace(/\u0000(\d+)\u0000/g, (_match, index) => `<code>${codeSpans[index]}</code>`)
}

export function renderMarkdown(source) {
  if (!source) return ''

  const lines = escapeHtml(source).split('\n')
  const out = []
  let listOpen = false
  let quoteOpen = false

  const closeList = () => {
    if (listOpen) {
      out.push('</ul>')
      listOpen = false
    }
  }
  const closeQuote = () => {
    if (quoteOpen) {
      out.push('</blockquote>')
      quoteOpen = false
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (!line.trim()) {
      closeList()
      closeQuote()
      continue
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/)
    if (heading) {
      closeList()
      closeQuote()
      out.push(`<h3>${inline(heading[2])}</h3>`)
      continue
    }

    const quote = line.match(/^&gt;\s?(.*)$/)
    if (quote) {
      closeList()
      if (!quoteOpen) {
        out.push('<blockquote>')
        quoteOpen = true
      }
      out.push(`<p>${inline(quote[1])}</p>`)
      continue
    }
    closeQuote()

    const item = line.match(/^\s*[-*+]\s+(.*)$/)
    if (item) {
      if (!listOpen) {
        out.push('<ul>')
        listOpen = true
      }
      out.push(`<li>${inline(item[1])}</li>`)
      continue
    }

    closeList()
    out.push(`<p>${inline(line)}</p>`)
  }

  closeList()
  closeQuote()
  return out.join('')
}
