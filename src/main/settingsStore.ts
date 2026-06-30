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

export async function getGoogleApiKey(): Promise<string | null> {
  const settings = await getAppSettings()
  const key = settings.googleApiKey
  return typeof key === 'string' && key.trim() ? key.trim() : null
}

export async function getGcalTokens(): Promise<Record<string, unknown> | null> {
  const s = await getStore()
  return (s.get('gcalTokens') as Record<string, unknown> | null) ?? null
}

export async function setGcalTokens(tokens: Record<string, unknown> | null): Promise<void> {
  const s = await getStore()
  if (tokens) s.set('gcalTokens', tokens)
  else s.delete('gcalTokens')
}
