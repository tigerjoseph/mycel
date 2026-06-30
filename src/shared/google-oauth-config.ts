/** Public Google OAuth config — same client + Supabase proxy as M2C (secret stays server-side). */
export const GOOGLE_OAUTH_CONFIG = {
  clientId: '840387768396-l7odqp6m0f7751j2ru199a11o5saqvu4.apps.googleusercontent.com',
  supabaseUrl: 'https://jiehgtzwcimvypckilne.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppZWhndHp3Y2ltdnlwY2tpbG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDAzNTQsImV4cCI6MjA3OTkxNjM1NH0.anTDAkRSF3KxD_iPxs8W26GwLyWsVVlrJGMU6uywjik',
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  authPortStart: 3000,
  authPortEnd: 3009,
  callbackPath: '/oauth2callback'
} as const

export function googleOAuthFunctionUrl(): string {
  return `${GOOGLE_OAUTH_CONFIG.supabaseUrl}/functions/v1/google-oauth`
}
