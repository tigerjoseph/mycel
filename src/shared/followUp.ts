import { daysInStage, isPipelineStage, type ProjectForNudge } from './projectNudges'

const DAY_MS = 24 * 60 * 60 * 1000

export const FOLLOW_UP_WARN_DAYS = 7
export const FOLLOW_UP_URGENT_DAYS = 30

export type FollowUpUrgency = 'none' | 'warn' | 'urgent'

export interface FollowUpHint {
  urgency: FollowUpUrgency
  reason: string
}

export function daysSinceContact(lastContactedAt: number | null, now = Date.now()): number | null {
  if (lastContactedAt == null) return null
  return Math.max(0, Math.floor((now - lastContactedAt) / DAY_MS))
}

export function formatLastContacted(lastContactedAt: number | null, now = Date.now()): string {
  if (lastContactedAt == null) return 'Never contacted'
  const days = daysSinceContact(lastContactedAt, now)!
  if (days === 0) return 'Contacted today'
  if (days === 1) return 'Contacted yesterday'
  if (days < 7) return `Contacted ${days} days ago`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return `Last contacted ${weeks} week${weeks === 1 ? '' : 's'} ago`
  }
  const months = Math.floor(days / 30)
  return `Last contacted ${months} month${months === 1 ? '' : 's'} ago`
}

export function contactFollowUpUrgency(
  lastContactedAt: number | null,
  now = Date.now()
): FollowUpUrgency {
  if (lastContactedAt == null) return 'urgent'
  const days = daysSinceContact(lastContactedAt, now)!
  if (days >= FOLLOW_UP_URGENT_DAYS) return 'urgent'
  if (days >= FOLLOW_UP_WARN_DAYS) return 'warn'
  return 'none'
}

export function getProjectFollowUpHint(
  project: ProjectForNudge,
  lastContactedAt: number | null,
  now = Date.now()
): FollowUpHint | null {
  if (!isPipelineStage(project.stage)) return null

  const contactUrgency = contactFollowUpUrgency(lastContactedAt, now)
  const stageDays = daysInStage(project, now)
  const stuckInStage = stageDays >= 3

  if (contactUrgency === 'urgent') {
    return {
      urgency: 'urgent',
      reason: lastContactedAt == null ? 'No touchpoints logged yet' : formatLastContacted(lastContactedAt, now)
    }
  }

  if (contactUrgency === 'warn') {
    return {
      urgency: 'warn',
      reason: formatLastContacted(lastContactedAt, now)
    }
  }

  if (stuckInStage) {
    return {
      urgency: 'warn',
      reason: `In ${project.stage} for ${stageDays} day${stageDays === 1 ? '' : 's'} — consider a check-in`
    }
  }

  return null
}

export function followUpAccentColor(urgency: FollowUpUrgency): string {
  if (urgency === 'urgent') return 'var(--follow-up-urgent)'
  if (urgency === 'warn') return 'var(--follow-up-warn)'
  return 'var(--border)'
}
