import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { BrowserWindow } from 'electron'
import { randomBytes } from 'crypto'
import { getAppSettings, setAppSettings } from '../settingsStore'
import { saveLibraryItem } from './saveItem'
import type { SaveLibraryPayload } from './types'
import { enrichLibraryItem } from './paths'

export const LIBRARY_PORT = 17321

let server: ReturnType<typeof createServer> | null = null

async function ensureLibraryToken(): Promise<string> {
  const settings = await getAppSettings()
  const existing = settings.libraryToken
  if (typeof existing === 'string' && existing.length >= 16) return existing
  const token = randomBytes(24).toString('hex')
  await setAppSettings({ libraryToken: token })
  return token
}

export async function getLibraryToken(): Promise<string> {
  return ensureLibraryToken()
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  })
  res.end(json)
}

function notifyRenderer(item: Record<string, unknown>): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('library:itemSaved', item)
    }
  }
}

async function handleSave(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const token = await ensureLibraryToken()
  const auth = req.headers.authorization ?? ''
  if (auth !== `Bearer ${token}`) {
    sendJson(res, 401, { error: 'Unauthorized' })
    return
  }

  try {
    const raw = await readBody(req)
    const payload = JSON.parse(raw) as SaveLibraryPayload
    const item = enrichLibraryItem(await saveLibraryItem(payload))
    notifyRenderer(item)
    sendJson(res, 200, { ok: true, item })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Save failed'
    sendJson(res, 400, { error: message })
  }
}

export async function startLibraryServer(): Promise<void> {
  if (server) return
  await ensureLibraryToken()

  server = createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {})
      return
    }

    if (req.method === 'GET' && req.url === '/health') {
      void ensureLibraryToken().then((token) => {
        sendJson(res, 200, { ok: true, port: LIBRARY_PORT, token })
      })
      return
    }

    if (req.method === 'POST' && req.url === '/save') {
      void handleSave(req, res)
      return
    }

    sendJson(res, 404, { error: 'Not found' })
  })

  await new Promise<void>((resolve, reject) => {
    server!.listen(LIBRARY_PORT, '127.0.0.1', () => resolve())
    server!.on('error', reject)
  })
}

export function stopLibraryServer(): void {
  if (server) {
    server.close()
    server = null
  }
}
