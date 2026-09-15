import { getDb } from '../db'

export async function compostActivityEvents(now = Date.now()): Promise<number> {
  const db = getDb()
  const result = await db.execute({
    sql: 'DELETE FROM activity_events WHERE expires_at IS NOT NULL AND expires_at < ?',
    args: [now]
  })
  return Number(result.rowsAffected ?? 0)
}
