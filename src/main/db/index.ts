import { createClient, type Client } from '@libsql/client'
import { app } from 'electron'
import { join } from 'path'
import { SCHEMA } from './schema'
import { noteBodyPreview } from './notePreview'

let db: Client | null = null

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
  db = createClient({ url: `file:${dbPath}` })

  // Run each CREATE TABLE statement
  const statements = SCHEMA.split(';').filter((s) => s.trim())
  for (const stmt of statements) {
    await db.execute(stmt)
  }

  // Delete any existing canvas docs
  await db.execute("DELETE FROM docs WHERE type = 'canvas'")

  try {
    await db.execute('ALTER TABLE notes ADD COLUMN body_preview TEXT NOT NULL DEFAULT ""')
  } catch {
    // column already exists
  }

  await backfillNotePreviews(db)
}

export function getDb(): Client {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return db
}
