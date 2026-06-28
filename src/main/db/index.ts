import { createClient, type Client } from '@libsql/client'
import { app } from 'electron'
import { join } from 'path'
import { SCHEMA } from './schema'

let db: Client | null = null

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
}

export function getDb(): Client {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return db
}
