import { nanoid } from 'nanoid'

export const CONTENT_CALENDAR_FOLDER = 'content calendar'

type SqlExec = {
  execute: (input: {
    sql: string
    args: (string | number | null)[]
  }) => Promise<{ rows: readonly unknown[] }>
}

/** Find or create the folder calendar posts are filed into. */
export async function ensureContentCalendarFolderId(exec: SqlExec): Promise<string> {
  const found = await exec.execute({
    sql: 'SELECT id FROM folders WHERE lower(name) = lower(?) LIMIT 1',
    args: [CONTENT_CALENDAR_FOLDER]
  })
  const existingId = (found.rows[0] as { id?: unknown } | undefined)?.id
  if (typeof existingId === 'string' && existingId) return existingId

  const id = nanoid()
  await exec.execute({
    sql: 'INSERT INTO folders (id, name, created_at) VALUES (?, ?, ?)',
    args: [id, CONTENT_CALENDAR_FOLDER, Date.now()]
  })
  return id
}
