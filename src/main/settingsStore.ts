// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let storeInit: Promise<any> | null = null

/** One shared electron-store instance — parallel async init used to create duplicate stores and wipe keys. */
async function getStore(): Promise<any> {
  if (store) return store
  if (!storeInit) {
    storeInit = import('electron-store').then((mod) => {
      const Store = mod.default
      store = new Store({
        name: 'mycel-settings',
        defaults: {
          theme: 'light',
          appearance: 'bold-light',
          settings: {}
        }
      })
      return store
    })
  }
  return storeInit
}

export async function getAppSettings(): Promise<Record<string, unknown>> {
  const s = await getStore()
  return (s.get('settings') || {}) as Record<string, unknown>
}

export async function setAppSettings(partial: Record<string, unknown>): Promise<void> {
  const s = await getStore()
  const current = (s.get('settings') || {}) as Record<string, unknown>
  const next = { ...current, ...partial }
  for (const [key, value] of Object.entries(partial)) {
    if (value === undefined) delete next[key]
  }
  s.set('settings', next)
}

export async function getGoogleApiKey(): Promise<string | null> {
  const settings = await getAppSettings()
  const key = settings.googleApiKey
  return typeof key === 'string' && key.trim() ? key.trim() : null
}

export async function getTheme(): Promise<string> {
  const s = await getStore()
  return s.get('theme', 'light') as string
}

export async function setTheme(theme: string): Promise<void> {
  const s = await getStore()
  s.set('theme', theme)
}

export async function getAppearance(): Promise<string> {
  const s = await getStore()
  return s.get('appearance', 'bold-light') as string
}

export async function setAppearance(appearance: string): Promise<void> {
  const s = await getStore()
  s.set('appearance', appearance)
}

async function migrateLegacyGcalTokens(): Promise<Record<string, unknown> | null> {
  const s = await getStore()
  const legacy = s.get('gcalTokens') as Record<string, unknown> | null | undefined
  if (!legacy || typeof legacy !== 'object') return null
  await setAppSettings({ gcalTokens: legacy })
  s.delete('gcalTokens')
  return legacy
}

export async function getGcalTokens(): Promise<Record<string, unknown> | null> {
  const settings = await getAppSettings()
  const nested = settings.gcalTokens
  if (nested && typeof nested === 'object') {
    return nested as Record<string, unknown>
  }
  return migrateLegacyGcalTokens()
}

export async function setGcalTokens(tokens: Record<string, unknown> | null): Promise<void> {
  if (!tokens) {
    await setAppSettings({ gcalTokens: undefined })
    const s = await getStore()
    s.delete('gcalTokens')
    return
  }

  const settings = await getAppSettings()
  const existing = (settings.gcalTokens as Record<string, unknown> | null) ?? {}
  const merged = { ...existing, ...tokens }
  if (existing.refresh_token && !tokens.refresh_token) {
    merged.refresh_token = existing.refresh_token
  }
  await setAppSettings({ gcalTokens: merged })
  const s = await getStore()
  s.delete('gcalTokens')
}
