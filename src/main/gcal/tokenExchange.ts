import { GOOGLE_OAUTH_CONFIG } from '@shared/google-oauth-config'
import { getGoogleOAuthClientSecret } from '../loadEnv'

function normalizeTokens(data: Record<string, unknown>): Record<string, unknown> {
  const tokens = { ...data }
  if (typeof tokens.expires_in === 'number' && !tokens.expiry_date) {
    tokens.expiry_date = Date.now() + tokens.expires_in * 1000
  }
  return tokens
}

async function postToGoogleToken(params: Record<string, string>): Promise<Record<string, unknown>> {
  const clientSecret = getGoogleOAuthClientSecret()
  if (!clientSecret) {
    throw new Error(
      'Google OAuth client secret is not configured. Add GOOGLE_OAUTH_CLIENT_SECRET to your project .env file (see .env.example), then restart Mycel.'
    )
  }

  const body = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    client_secret: clientSecret,
    ...params
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })

  const data = (await res.json()) as Record<string, unknown>
  if (data.error) {
    const desc =
      typeof data.error_description === 'string' ? data.error_description : String(data.error)
    throw new Error(desc)
  }
  if (!res.ok) {
    throw new Error(`Google token request failed (${res.status})`)
  }
  return normalizeTokens(data)
}

export async function exchangeAuthCode(
  code: string,
  redirectUri: string
): Promise<Record<string, unknown>> {
  return postToGoogleToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  })
}

export async function refreshAuthTokens(refreshToken: string): Promise<Record<string, unknown>> {
  return postToGoogleToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  })
}
