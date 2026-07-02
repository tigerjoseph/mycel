/** Public Google OAuth config — Desktop client ID; secret lives in .env */
export const GOOGLE_OAUTH_CONFIG = {
  clientId: '338958481786-ioh4klb7g0t9ioq25kb57jilu6kc38rf.apps.googleusercontent.com',
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  authPortStart: 3000,
  authPortEnd: 3009,
  callbackPath: '/oauth2callback'
} as const
