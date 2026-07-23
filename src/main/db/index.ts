import { createClient, type Client } from '@libsql/client'
import { app } from 'electron'
import { join } from 'path'
import { copyFile, mkdir, readdir, stat, unlink } from 'fs/promises'
import { SCHEMA } from './schema'
import { noteBodyPreview } from './notePreview'

let db: Client | null = null

async function backupDatabase(dbPath: string): Promise<void> {
  try {
    await stat(dbPath)
    const backupDir = join(app.getPath('userData'), 'backups')
    await mkdir(backupDir, { recursive: true })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    await copyFile(dbPath, join(backupDir, `mycel-${timestamp}.db`))

    const backups = (await readdir(backupDir))
      .filter((name) => name.startsWith('mycel-') && name.endsWith('.db'))
      .sort()
    for (const name of backups.slice(0, -10)) {
      await unlink(join(backupDir, name))
    }
  } catch (error) {
    console.error('Database backup failed:', error)
  }
}

async function backfillNotePreviews(client: Client): Promise<void> {
  const result = await client.execute(
    `SELECT id, body FROM notes
     WHERE (body_preview = '' OR body_preview IS NULL)
       AND body != '' AND body != '<p></p>'`
  )
  for (const row of result.rows) {
    const preview = noteBodyPreview((row.body as string) || '')
    await client.execute({
      sql: 'UPDATE notes SET body_preview = ? WHERE id = ?',
      args: [preview, row.id as string]
    })
  }
}

export async function initDb(): Promise<void> {
  const dbPath = join(app.getPath('userData'), 'mycel.db')
  await backupDatabase(dbPath)
  db = createClient({ url: `file:${dbPath}` })

  // Run each CREATE TABLE statement
  const statements = SCHEMA.split(';').filter((s) => s.trim())
  for (const stmt of statements) {
    await db.execute(stmt)
  }

  try {
    await db.execute('ALTER TABLE notes ADD COLUMN body_preview TEXT NOT NULL DEFAULT ""')
  } catch {
    // column already exists
  }

  try {
    await db.execute('ALTER TABLE projects ADD COLUMN value_cents INTEGER')
  } catch {
    // column already exists
  }

  try {
    await db.execute('ALTER TABLE projects ADD COLUMN closed_at INTEGER')
  } catch {
    // column already exists
  }

  try {
    await db.execute('ALTER TABLE projects ADD COLUMN stage_changed_at INTEGER')
  } catch {
    // column already exists
  }

  try {
    await db.execute('ALTER TABLE projects ADD COLUMN follow_up_manual TEXT')
  } catch {
    // column already exists
  }

  await db.execute(
    `UPDATE projects SET closed_at = updated_at
     WHERE stage = 'Won' AND closed_at IS NULL`
  )

  await db.execute(
    `UPDATE projects SET stage_changed_at = updated_at
     WHERE stage_changed_at IS NULL`
  )

  await db.execute(`UPDATE projects SET stage = 'Active' WHERE stage = 'Closing'`)

  await db.execute(
    `UPDATE content_scripts SET stage = 'Pre-production' WHERE stage IN ('To prep', 'Pre-production')`
  )
  await db.execute(
    `UPDATE content_scripts SET stage = 'Production' WHERE stage IN ('Shooting', 'In Editing')`
  )
  await db.execute(`UPDATE content_scripts SET stage = 'Done' WHERE stage = 'Done'`)
  await db.execute(
    `UPDATE content_scripts SET stage = 'Pre-production'
     WHERE stage NOT IN ('Pre-production', 'Production', 'Done')`
  )

  await backfillNotePreviews(db)
}

export function getDb(): Client {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return db
}
