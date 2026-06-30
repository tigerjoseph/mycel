import { GOOGLE_OAUTH_CONFIG, googleOAuthFunctionUrl } from '@shared/google-oauth-config'

function normalizeTokens(data: Record<string, unknown>): Record<string, unknown> {
  const tokens = { ...data }
  if (typeof tokens.expires_in === 'number' && !tokens.expiry_date) {
    tokens.expiry_date = Date.now() + tokens.expires_in * 1000
  }
  return tokens
}

async function postToGoogleOAuth(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(googleOAuthFunctionUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GOOGLE_OAUTH_CONFIG.supabaseAnonKey}`
    },
    body: JSON.stringify(body)
  })

  const data = (await res.json()) as Record<string, unknown>
  if (data.error) {
    const desc = typeof data.error_description === 'string' ? data.error_description : String(data.error)
    throw new Error(desc)
  }
  if (!res.ok) {
    throw new Error(`Token request failed (${res.status})`)
  }
  return normalizeTokens(data)
}

export async function exchangeAuthCode(
  code: string,
  redirectUri: string
): Promise<Record<string, unknown>> {
  return postToGoogleOAuth({ action: 'exchange', code, redirect_uri: redirectUri })
}

export async function refreshAuthTokens(refreshToken: string): Promise<Record<string, unknown>> {
  return postToGoogleOAuth({ action: 'refresh', refresh_token: refreshToken })
}
