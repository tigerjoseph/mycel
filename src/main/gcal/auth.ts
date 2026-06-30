import { OAuth2Client } from 'google-auth-library'
import { createServer, type Server } from 'http'
import { shell } from 'electron'
import { GOOGLE_OAUTH_CONFIG } from '@shared/google-oauth-config'
import { getGcalTokens, setGcalTokens, setAppSettings } from '../settingsStore'
import { exchangeAuthCode, refreshAuthTokens } from './tokenExchange'

function buildAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    access_type: 'offline',
    scope: GOOGLE_OAUTH_CONFIG.scopes.join(' '),
    response_type: 'code',
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    redirect_uri: redirectUri,
    prompt: 'consent'
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

async function ensureFreshTokens(tokens: Record<string, unknown>): Promise<Record<string, unknown>> {
  const expiry = tokens.expiry_date as number | undefined
  if (expiry && Date.now() < expiry - 60_000) return tokens

  const refreshToken = tokens.refresh_token as string | undefined
  if (!refreshToken) return tokens

  const fresh = await refreshAuthTokens(refreshToken)
  const merged = { ...tokens, ...fresh }
  await setGcalTokens(merged)
  return merged
}

function runOAuthLoopback(): Promise<{ code: string; redirectUri: string }> {
  const { authPortStart, authPortEnd, callbackPath } = GOOGLE_OAUTH_CONFIG

  return new Promise((resolve, reject) => {
    let currentPort = authPortStart
    let server: Server | null = null
    let settled = false

    const finish = (fn: () => void): void => {
      if (settled) return
      settled = true
      if (server) server.close()
      fn()
    }

    const tryListen = (): void => {
      server = createServer((req, res) => {
        if (!req.url?.startsWith(callbackPath)) return

        const redirectUri = `http://localhost:${currentPort}${callbackPath}`
        const url = new URL(req.url, redirectUri)
        const authCode = url.searchParams.get('code')
        const err = url.searchParams.get('error')

        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(
          '<html><body style="font-family:system-ui;padding:24px">Connected. You can close this tab and return to Mycel.</body></html>'
        )

        if (err) finish(() => reject(new Error(err)))
        else if (authCode) finish(() => resolve({ code: authCode, redirectUri }))
        else finish(() => reject(new Error('No authorization code returned')))
      })

      server.on('error', (e: NodeJS.ErrnoException) => {
        if (e.code === 'EADDRINUSE' && currentPort < authPortEnd) {
          currentPort++
          server?.close()
          tryListen()
          return
        }
        finish(() => reject(e))
      })

      server.listen(currentPort, () => {
        const redirectUri = `http://localhost:${currentPort}${callbackPath}`
        void shell.openExternal(buildAuthUrl(redirectUri))
      })

      setTimeout(() => {
        finish(() => reject(new Error('Google sign-in timed out')))
      }, 180_000)
    }

    tryListen()
  })
}

export async function isGcalConnected(): Promise<boolean> {
  const tokens = await getGcalTokens()
  return Boolean(tokens?.refresh_token || tokens?.access_token)
}

export async function connectGoogleCalendar(): Promise<void> {
  const { code, redirectUri } = await runOAuthLoopback()
  const tokens = await exchangeAuthCode(code, redirectUri)
  await setGcalTokens(tokens)

  try {
    const oauth2 = new OAuth2Client(GOOGLE_OAUTH_CONFIG.clientId)
    oauth2.setCredentials(tokens)
    const res = await oauth2.request<{ id?: string }>({
      url: 'https://www.googleapis.com/calendar/v3/calendars/primary'
    })
    const email = res.data.id
    if (typeof email === 'string' && email.includes('@')) {
      await setAppSettings({ gcalUserEmail: email })
    }
  } catch {
    // Email is optional; tokens are what matter for persistence
  }
}

export async function disconnectGoogleCalendar(): Promise<void> {
  await setGcalTokens(null)
  await setAppSettings({ gcalUserEmail: undefined })
}

export async function getAuthorizedClient(): Promise<OAuth2Client> {
  const stored = await getGcalTokens()
  if (!stored?.access_token) throw new Error('Google Calendar not connected')

  const tokens = await ensureFreshTokens(stored)
  const oauth2 = new OAuth2Client(GOOGLE_OAUTH_CONFIG.clientId)
  oauth2.setCredentials(tokens)
  return oauth2
}
