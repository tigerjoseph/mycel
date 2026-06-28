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
