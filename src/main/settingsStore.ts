// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: any = null

async function getStore(): Promise<any> {
  if (!store) {
    const mod = await import('electron-store')
    const Store = mod.default
    store = new Store({
      name: 'mycel-settings',
      defaults: {
        theme: 'light',
        appearance: 'bold-light',
        settings: {}
      }
    })
  }
  return store
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

export async function getGcalTokens(): Promise<Record<string, unknown> | null> {
  const s = await getStore()
  return (s.get('gcalTokens') as Record<string, unknown> | null) ?? null
}

export async function setGcalTokens(tokens: Record<string, unknown> | null): Promise<void> {
  const s = await getStore()
  if (!tokens) {
    s.delete('gcalTokens')
    return
  }
  const existing = (s.get('gcalTokens') as Record<string, unknown> | null) ?? {}
  const merged = { ...existing, ...tokens }
  if (existing.refresh_token && !tokens.refresh_token) {
    merged.refresh_token = existing.refresh_token
  }
  s.set('gcalTokens', merged)
}
