import { isGcalConnected } from './auth'
import { syncCalendarContacts } from './sync'

const SYNC_INTERVAL_MS = 30 * 60 * 1000

let timer: ReturnType<typeof setInterval> | null = null
let running = false

async function tick(): Promise<void> {
  if (running) return
  running = true
  try {
    if (!(await isGcalConnected())) return
    await syncCalendarContacts()
  } catch (err) {
    console.error('[gcal] background sync failed:', err)
  } finally {
    running = false
  }
}

export function startGcalBackgroundSync(): void {
  if (timer) return
  void tick()
  timer = setInterval(() => {
    void tick()
  }, SYNC_INTERVAL_MS)
}

export function stopGcalBackgroundSync(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
