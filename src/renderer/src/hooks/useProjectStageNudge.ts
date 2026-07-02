import { useEffect } from 'react'
import {
  findProjectsDueForStageNudge,
  formatStageNudgeMessage,
  type ProjectForNudge
} from '@shared/projectNudges'
import { useUIStore } from '../store/ui'

function parseNudgeMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [id, ts] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof ts === 'number' && ts > 0) out[id] = ts
  }
  return out
}

export function useProjectStageNudge(): void {
  const showProjectNudge = useUIStore((s) => s.showProjectNudge)

  useEffect(() => {
    let cancelled = false

    const check = async (): Promise<void> => {
      try {
        const [projects, settings] = await Promise.all([
          window.mycel.getAllProjects(),
          window.mycel.getSettings()
        ])
        if (cancelled) return

        const nudges = parseNudgeMap(settings.projectStageNudges)
        const due = findProjectsDueForStageNudge(projects as ProjectForNudge[], nudges)
        if (due.length === 0) return

        const primary = due[0]
        const message = formatStageNudgeMessage(primary, due.length - 1)
        const now = Date.now()
        const nextNudges = { ...nudges }
        for (const p of due) nextNudges[p.id] = now

        await window.mycel.setSettings({ projectStageNudges: nextNudges })
        if (cancelled) return

        showProjectNudge({ message, projectId: primary.id })
      } catch {
        // ignore — nudge is non-critical
      }
    }

    const timer = window.setTimeout(() => {
      void check()
    }, 2500)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [showProjectNudge])
}
