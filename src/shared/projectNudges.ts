import { PIPELINE_STAGES } from './money'

const DAY_MS = 24 * 60 * 60 * 1000

export const PROJECT_STAGE_NUDGE_MS = 3 * DAY_MS

export interface ProjectForNudge {
  id: string
  name: string
  stage: string
  stageChangedAt?: number | null
  updatedAt: number
}

export function isPipelineStage(stage: string): boolean {
  return (PIPELINE_STAGES as readonly string[]).includes(stage)
}

export function daysInStage(project: ProjectForNudge, now = Date.now()): number {
  const stageAt = project.stageChangedAt ?? project.updatedAt
  return Math.max(1, Math.floor((now - stageAt) / DAY_MS))
}

export function findProjectsDueForStageNudge(
  projects: ProjectForNudge[],
  lastNudgedAt: Record<string, number>,
  now = Date.now()
): ProjectForNudge[] {
  return projects
    .filter((p) => {
      if (!isPipelineStage(p.stage)) return false
      const stageAt = p.stageChangedAt ?? p.updatedAt
      if (now - stageAt < PROJECT_STAGE_NUDGE_MS) return false
      const lastNudge = lastNudgedAt[p.id] ?? 0
      if (now - lastNudge < PROJECT_STAGE_NUDGE_MS) return false
      return true
    })
    .sort((a, b) => {
      const aAt = a.stageChangedAt ?? a.updatedAt
      const bAt = b.stageChangedAt ?? b.updatedAt
      return aAt - bAt
    })
}

export function formatStageNudgeMessage(
  project: ProjectForNudge,
  moreCount: number,
  now = Date.now()
): string {
  const days = daysInStage(project, now)
  const label = project.name || 'Untitled project'
  const suffix = moreCount > 0 ? ` (+${moreCount} more)` : ''
  return `"${label}" stuck in ${project.stage} for ${days} day${days === 1 ? '' : 's'}${suffix}`
}
