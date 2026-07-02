import { ipcMain } from 'electron'
import { nanoid } from 'nanoid'
import { getDb } from '../db'

const WON_STAGE = 'Won'

function mapProjectRow(row: Record<string, unknown>, extras?: Record<string, unknown>) {
  const rawValue = row.value_cents
  const valueCents = typeof rawValue === 'number' ? rawValue : rawValue != null ? Number(rawValue) : null
  const rawClosed = row.closed_at
  const closedAt = typeof rawClosed === 'number' ? rawClosed : rawClosed != null ? Number(rawClosed) : null
  const rawStageChanged = row.stage_changed_at
  const stageChangedAt =
    typeof rawStageChanged === 'number'
      ? rawStageChanged
      : rawStageChanged != null
        ? Number(rawStageChanged)
        : null
  return {
    id: row.id,
    contactId: row.contact_id as string,
    name: row.name,
    stage: row.stage,
    valueCents: Number.isFinite(valueCents) ? valueCents : null,
    closedAt: Number.isFinite(closedAt) ? closedAt : null,
    stageChangedAt: Number.isFinite(stageChangedAt) ? stageChangedAt : null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
    ...extras
  }
}

async function resolveClosedAt(
  existing: Record<string, unknown> | null,
  stage: string,
  now: number
): Promise<number | null> {
  const rawPrior = existing?.closed_at
  const prior =
    typeof rawPrior === 'number' ? rawPrior : rawPrior != null ? Number(rawPrior) : null
  const hadClosed = Number.isFinite(prior) && prior! > 0

  if (stage === WON_STAGE) return hadClosed ? prior : now
  // Preserve close date for revenue history when stage changes away from Won.
  return hadClosed ? prior : null
}

function resolveValueCents(
  project: Record<string, unknown>,
  existing: Record<string, unknown> | null
): number | null {
  const hasIncoming = 'valueCents' in project || 'value_cents' in project
  if (!hasIncoming) {
    const raw = existing?.value_cents
    const n = typeof raw === 'number' ? raw : raw != null ? Number(raw) : null
    return Number.isFinite(n) ? n : null
  }
  const rawValue = project.valueCents ?? project.value_cents
  if (rawValue === null || rawValue === undefined || rawValue === '') return null
  const n = Number(rawValue)
  return Number.isFinite(n) ? n : null
}

export function registerProjectHandlers(): void {
  ipcMain.handle('projects:getAll', async () => {
    const db = getDb()
    const result = await db.execute({
      sql: `SELECT p.*, c.name as contact_name
            FROM projects p
            LEFT JOIN contacts c ON p.contact_id = c.id
            ORDER BY p.updated_at DESC`
    })
    return result.rows.map((row) =>
      mapProjectRow(row as Record<string, unknown>, {
        contactName: (row.contact_name as string) || ''
      })
    )
  })

  ipcMain.handle('projects:get', async (_e, contactId: string) => {
    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT * FROM projects WHERE contact_id = ? ORDER BY updated_at DESC',
      args: [contactId]
    })
    return result.rows.map((row) => mapProjectRow(row as Record<string, unknown>))
  })

  ipcMain.handle('projects:getById', async (_e, id: string) => {
    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT * FROM projects WHERE id = ?',
      args: [id]
    })
    if (result.rows.length === 0) return null
    return mapProjectRow(result.rows[0] as Record<string, unknown>)
  })

  ipcMain.handle('projects:upsert', async (_e, project: Record<string, unknown>) => {
    const db = getDb()
    const now = Date.now()
    const id = (project.id as string) || nanoid()

    let existing: Record<string, unknown> | null = null
    if (project.id) {
      const row = await db.execute({ sql: 'SELECT * FROM projects WHERE id = ?', args: [id] })
      if (row.rows.length > 0) existing = row.rows[0] as Record<string, unknown>
    }

    const contactId = (project.contactId ?? project.contact_id ?? existing?.contact_id) as string
    const name =
      project.name !== undefined ? (project.name as string) || '' : ((existing?.name as string) || '')
    const stage =
      (project.stage as string) || (existing?.stage as string) || 'Lead'
    const createdAt = (project.createdAt ?? project.created_at ?? existing?.created_at ?? now) as number
    const updatedAt = now
    const valueCents = resolveValueCents(project, existing)
    const closedAt = await resolveClosedAt(existing, stage, now)
    const priorStage = existing?.stage as string | undefined
    const stageChanged = !existing || priorStage !== stage
    const rawPriorStageAt = existing?.stage_changed_at
    const priorStageAt =
      typeof rawPriorStageAt === 'number'
        ? rawPriorStageAt
        : rawPriorStageAt != null
          ? Number(rawPriorStageAt)
          : null
    const stageChangedAt = stageChanged
      ? now
      : Number.isFinite(priorStageAt) && priorStageAt! > 0
        ? priorStageAt!
        : createdAt

    await db.execute({
      sql: `INSERT OR REPLACE INTO projects (id, contact_id, name, stage, value_cents, closed_at, stage_changed_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, contactId, name, stage, valueCents, closedAt, stageChangedAt, createdAt, updatedAt]
    })

    return {
      id,
      contactId,
      name,
      stage,
      valueCents: Number.isFinite(valueCents) ? valueCents : null,
      closedAt,
      stageChangedAt,
      createdAt,
      updatedAt
    }
  })

  ipcMain.handle('projects:delete', async (_e, id: string) => {
    const db = getDb()
    await db.execute({ sql: 'DELETE FROM milestones WHERE project_id = ?', args: [id] })
    await db.execute({ sql: 'DELETE FROM projects WHERE id = ?', args: [id] })
  })
}
