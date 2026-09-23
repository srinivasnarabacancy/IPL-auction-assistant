/** Formatting helpers for INR crore values used everywhere in the UI. */
export function useCurrency() {
  const crore = (value, { sign = false } = {}) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '—'
    const rounded = Math.round(value * 100) / 100
    const prefix = sign && rounded > 0 ? '+' : ''
    return `${prefix}₹${rounded.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`
  }

  /** Compact form for dense tables and chips. */
  const croreShort = (value) => {
    if (value === null || value === undefined) return '—'
    return `₹${(Math.round(value * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}Cr`
  }

  const percent = (value) => `${Math.round((value ?? 0) * 10) / 10}%`

  return { crore, croreShort, percent }
}
