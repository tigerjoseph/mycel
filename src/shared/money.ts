export function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(cents / 100)
}

export function formatUsdCompact(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 10_000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(dollars)
  }
  return formatUsdFromCents(cents)
}

export function formatUsdInputFromCents(cents: number | null | undefined): string {
  if (cents == null || cents <= 0) return ''
  return formatUsdFromCents(cents)
}

export function parseDollarToCents(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const cleaned = trimmed.replace(/[$,\s]/g, '')
  const dollars = Number.parseFloat(cleaned)
  if (Number.isNaN(dollars) || dollars < 0) return null
  return Math.round(dollars * 100)
}

export const PIPELINE_STAGES = ['Lead', 'Active', 'Closing'] as const
export const CLOSED_WON_STAGE = 'Won'

export type RevenuePeriod = 'month' | 'ytd' | 'year' | 'total'

export const REVENUE_PERIODS: { id: RevenuePeriod; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'ytd', label: 'YTD' },
  { id: 'year', label: 'Year' },
  { id: 'total', label: 'Total' }
]

export function periodRange(
  period: RevenuePeriod,
  now = new Date()
): { start: number | null; end: number | null } {
  if (period === 'total') return { start: null, end: null }

  const year = now.getFullYear()
  const month = now.getMonth()

  if (period === 'month') {
    return {
      start: new Date(year, month, 1).getTime(),
      end: new Date(year, month + 1, 0, 23, 59, 59, 999).getTime()
    }
  }

  if (period === 'ytd') {
    return {
      start: new Date(year, 0, 1).getTime(),
      end: now.getTime()
    }
  }

  const start = new Date(now)
  start.setFullYear(start.getFullYear() - 1)
  start.setHours(0, 0, 0, 0)
  return { start: start.getTime(), end: now.getTime() }
}

export function sumProjectValueCents(
  projects: { stage: string; valueCents?: number | null }[],
  stages: readonly string[]
): number {
  return projects.reduce((sum, p) => {
    if (!stages.includes(p.stage)) return sum
    return sum + (p.valueCents ?? 0)
  }, 0)
}

export function sumClosedValueCents(
  projects: {
    stage: string
    valueCents?: number | null
    closedAt?: number | null
    updatedAt?: number
  }[],
  period: RevenuePeriod
): number {
  const { start, end } = periodRange(period)
  return projects.reduce((sum, p) => {
    if (p.stage !== CLOSED_WON_STAGE) return sum
    const value = p.valueCents ?? 0
    if (value <= 0) return sum
    const wonAt = p.closedAt ?? p.updatedAt ?? 0
    if (start != null && wonAt < start) return sum
    if (end != null && wonAt > end) return sum
    return sum + value
  }, 0)
}
