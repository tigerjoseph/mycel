export const ALL_STAGES = ['Lead', 'Active', 'Won', 'Lost'] as const
export type ProjectStage = (typeof ALL_STAGES)[number]

export const WON_STAGE = 'Won'
export const LOST_STAGE = 'Lost'

const STAGE_DISPLAY: Record<ProjectStage, string> = {
  Lead: 'Lead',
  Active: 'Active',
  Won: 'Closed',
  Lost: 'Lost'
}

export function getStageDisplayLabel(stage: string): string {
  return STAGE_DISPLAY[stage as ProjectStage] ?? stage
}

export function getStageColumnColor(stage: string): string {
  if (stage === 'Lead') return 'var(--stage-lead)'
  if (stage === 'Active') return 'var(--stage-active)'
  if (stage === WON_STAGE) return 'var(--won)'
  if (stage === LOST_STAGE) return 'var(--lost)'
  return 'var(--text-muted)'
}

export function getStageDotColor(stage: string, isActive: boolean): string {
  if (!isActive) return 'var(--border)'
  return getStageColumnColor(stage)
}

export function getStageLabelColor(stage: string, isActive: boolean): string {
  if (!isActive) return 'var(--text-muted)'
  return getStageColumnColor(stage)
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
  if (stage === 'Active') {
    return {
      color: 'var(--stage-active)',
      background: 'var(--stage-active-bg)',
      border: 'var(--stage-active-border)'
    }
  }
  if (stage === 'Lead') {
    return {
      color: 'var(--stage-lead)',
      background: 'var(--stage-lead-bg)',
      border: 'var(--stage-lead-border)'
    }
  }
  return {
    color: 'var(--text)',
    background: 'var(--surface)',
    border: 'var(--border)'
  }
}
