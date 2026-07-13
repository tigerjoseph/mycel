export const ALL_STAGES = ['Lead', 'Active', 'Closing', 'Won', 'Lost'] as const
export type ProjectStage = (typeof ALL_STAGES)[number]

export const WON_STAGE = 'Won'
export const LOST_STAGE = 'Lost'

export function getStageDotColor(stage: string, isActive: boolean): string {
  if (!isActive) return 'var(--border)'
  if (stage === WON_STAGE) return 'var(--won)'
  if (stage === LOST_STAGE) return 'var(--lost)'
  return 'var(--accent)'
}

export function getStageLabelColor(stage: string, isActive: boolean): string {
  if (!isActive) return 'var(--text-muted)'
  if (stage === WON_STAGE) return 'var(--won)'
  if (stage === LOST_STAGE) return 'var(--lost)'
  return 'var(--text)'
}

export function getStageBadgeColors(stage: string): {
  color: string
  background: string
  border: string
} {
  if (stage === WON_STAGE) {
    return {
      color: 'var(--won)',
      background: 'var(--won-bg)',
      border: 'var(--won-border)'
    }
  }
  if (stage === LOST_STAGE) {
    return {
      color: 'var(--lost)',
      background: 'var(--lost-bg)',
      border: 'var(--lost-border)'
    }
  }
  return {
    color: 'var(--text)',
    background: 'var(--surface)',
    border: 'var(--border)'
  }
}
