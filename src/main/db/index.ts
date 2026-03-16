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
}

export function getDb(): Client {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return db
}
