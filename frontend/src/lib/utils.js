export const cn = (...c) => c.filter(Boolean).join(' ')

export const money = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n ?? 0)

export const compactMoney = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n ?? 0)

export const pct = (n, d = 1) => `${((n ?? 0) * 100).toFixed(d)}%`

export const RISK_COLORS = { Low: '#16a34a', Medium: '#d97706', High: '#dc2626' }
