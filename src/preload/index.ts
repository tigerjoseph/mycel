import { contextBridge, ipcRenderer } from 'electron'

const mycelAPI = {
  // Contacts
  getContacts: (): Promise<unknown[]> => ipcRenderer.invoke('contacts:getAll'),
  getContact: (id: string): Promise<unknown> => ipcRenderer.invoke('contacts:get', id),
  upsertContact: (c: unknown): Promise<unknown> => ipcRenderer.invoke('contacts:upsert', c),
  deleteContact: (id: string): Promise<void> => ipcRenderer.invoke('contacts:delete', id),

  // Folders
  getFolders: (): Promise<unknown[]> => ipcRenderer.invoke('folders:getAll'),
  createFolder: (name: string): Promise<unknown> => ipcRenderer.invoke('folders:create', name),
  renameFolder: (id: string, name: string): Promise<void> => ipcRenderer.invoke('folders:rename', id, name),
  deleteFolder: (id: string): Promise<void> => ipcRenderer.invoke('folders:delete', id),

  // Docs
  getDocs: (folderId?: string): Promise<unknown[]> => ipcRenderer.invoke('docs:getAll', folderId),
  getDoc: (id: string): Promise<unknown> => ipcRenderer.invoke('docs:get', id),
  upsertDoc: (d: unknown): Promise<unknown> => ipcRenderer.invoke('docs:upsert', d),
  deleteDoc: (id: string): Promise<void> => ipcRenderer.invoke('docs:delete', id),
  getDocVersions: (id: string): Promise<unknown[]> => ipcRenderer.invoke('docs:getVersions', id),
  getDeletedDocs: (): Promise<unknown[]> => ipcRenderer.invoke('docs:getDeleted'),
  restoreDocVersion: (versionId: string): Promise<unknown> =>
    ipcRenderer.invoke('docs:restoreVersion', versionId),
  getFavorites: (): Promise<unknown[]> => ipcRenderer.invoke('docs:getFavorites'),
  setFavorite: (id: string, val: boolean): Promise<void> => ipcRenderer.invoke('docs:setFavorite', id, val),
  reorderFavorites: (ids: string[]): Promise<void> => ipcRenderer.invoke('docs:reorderFavorites', ids),

  // Notes
  getNotes: (opts?: unknown): Promise<unknown[]> => ipcRenderer.invoke('notes:getAll', opts),
  getNote: (id: string): Promise<unknown> => ipcRenderer.invoke('notes:get', id),
  upsertNote: (n: unknown): Promise<unknown> => ipcRenderer.invoke('notes:upsert', n),
  deleteNote: (id: string): Promise<void> => ipcRenderer.invoke('notes:delete', id),

  // Links
  getLinks: (entityId: string): Promise<unknown[]> => ipcRenderer.invoke('links:get', entityId),
  upsertLink: (l: unknown): Promise<void> => ipcRenderer.invoke('links:upsert', l),
  deleteLink: (id: string): Promise<void> => ipcRenderer.invoke('links:delete', id),

  // Tags
  getTags: (): Promise<unknown[]> => ipcRenderer.invoke('tags:getAll'),
  getEntitiesByTag: (tag: string): Promise<unknown[]> => ipcRenderer.invoke('tags:getEntities', tag),

  // Search
  search: (q: string): Promise<unknown[]> => ipcRenderer.invoke('search:query', q),

  // Touchpoints
  getTouchpoints: (contactId: string): Promise<unknown[]> => ipcRenderer.invoke('touchpoints:get', contactId),
  logTouchpoint: (t: unknown): Promise<unknown> => ipcRenderer.invoke('touchpoints:log', t),

  // Projects
  getAllProjects: (): Promise<unknown[]> => ipcRenderer.invoke('projects:getAll'),
  getProjects: (contactId: string): Promise<unknown[]> => ipcRenderer.invoke('projects:get', contactId),
  getProject: (id: string): Promise<unknown> => ipcRenderer.invoke('projects:getById', id),
  upsertProject: (p: unknown): Promise<unknown> => ipcRenderer.invoke('projects:upsert', p),
  deleteProject: (id: string): Promise<void> => ipcRenderer.invoke('projects:delete', id),

  // Milestones
  getMilestones: (projectId: string): Promise<unknown[]> => ipcRenderer.invoke('milestones:get', projectId),
  upsertMilestone: (m: unknown): Promise<unknown> => ipcRenderer.invoke('milestones:upsert', m),
  deleteMilestone: (id: string): Promise<void> => ipcRenderer.invoke('milestones:delete', id),

  // Todos
  getTodos: (): Promise<unknown[]> => ipcRenderer.invoke('todos:get'),
  upsertTodo: (t: unknown): Promise<unknown> => ipcRenderer.invoke('todos:upsert', t),
  deleteTodo: (id: string): Promise<void> => ipcRenderer.invoke('todos:delete', id),

  // Google Calendar
  gcalConnect: (): Promise<{ created: number; skipped: number }> => ipcRenderer.invoke('gcal:connect'),
  gcalDisconnect: (): Promise<void> => ipcRenderer.invoke('gcal:disconnect'),
  gcalGetStatus: (): Promise<{ connected: boolean }> => ipcRenderer.invoke('gcal:getStatus'),
  gcalFetchEvents: (): Promise<unknown[]> => ipcRenderer.invoke('gcal:fetchEvents'),
  gcalSyncContacts: (): Promise<{ created: number; skipped: number }> =>
    ipcRenderer.invoke('gcal:syncContacts'),
  gcalConfirmImport: (imports: unknown): Promise<{ created: number; skipped: number }> =>
    ipcRenderer.invoke('gcal:confirmImport', imports),
  gcalGetUpcoming: (contactId: string): Promise<unknown> => ipcRenderer.invoke('gcal:getUpcoming', contactId),

  // Stripe
  stripeConnect: (): Promise<void> => ipcRenderer.invoke('stripe:connect'),
  stripeConfirmMatches: (matches: unknown): Promise<void> => ipcRenderer.invoke('stripe:confirmMatches', matches),
  stripeRefreshCache: (): Promise<void> => ipcRenderer.invoke('stripe:refreshCache'),
  stripeGetCache: (customerId: string): Promise<unknown> => ipcRenderer.invoke('stripe:getCache', customerId),

  // Settings
  getSettings: (): Promise<unknown> => ipcRenderer.invoke('settings:get'),
  setSettings: (s: unknown): Promise<void> => ipcRenderer.invoke('settings:set', s),
  openSettingsWindow: (): Promise<void> => ipcRenderer.invoke('settings:openWindow'),

  // Import
  importAppleContacts: (): Promise<unknown[]> => ipcRenderer.invoke('import:appleContacts'),

  // Theme
  getTheme: (): Promise<string> => ipcRenderer.invoke('theme:get'),
  setTheme: (theme: string): Promise<void> => ipcRenderer.invoke('theme:set', theme),
  onThemeChange: (callback: (theme: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, theme: string): void => callback(theme)
    ipcRenderer.on('theme:changed', handler)
    return () => ipcRenderer.removeListener('theme:changed', handler)
  },

  // Appearance
  getAppearance: (): Promise<string> => ipcRenderer.invoke('appearance:get'),
  setAppearance: (id: string): Promise<void> => ipcRenderer.invoke('appearance:set', id),
  onAppearanceChange: (callback: (id: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, id: string): void => callback(id)
    ipcRenderer.on('appearance:changed', handler)
    return () => ipcRenderer.removeListener('appearance:changed', handler)
  },

  // Listen for main process events
  onOpenSettings: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('open-settings', handler)
    return () => ipcRenderer.removeListener('open-settings', handler)
  },

  // Auto-updates
  onUpdateAvailable: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('update-available', handler)
    return () => ipcRenderer.removeListener('update-available', handler)
  },
  onUpdateDownloaded: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('update-downloaded', handler)
    return () => ipcRenderer.removeListener('update-downloaded', handler)
  },
  installUpdate: (): Promise<void> => ipcRenderer.invoke('updates:install'),
  checkForUpdates: (): Promise<{ status: 'dev' | 'current' | 'available' | 'error'; version?: string }> =>
    ipcRenderer.invoke('updates:check'),

  // App info
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  getDataInfo: (): Promise<{
    dbPath: string
    counts: { contacts: number; docs: number; notes: number; meetings: number; projects: number; todos: number }
  }> => ipcRenderer.invoke('app:getDataInfo'),
  openDataFolder: (): Promise<void> => ipcRenderer.invoke('app:openDataFolder'),
  getVoiceImportStatus: (): Promise<{
    ready: boolean
    whisperCli: boolean
    ffmpeg: boolean
    model: boolean
  }> => ipcRenderer.invoke('app:getVoiceImportStatus'),

  // Export
  exportCursorBundle: (payload: { title: string; draft: string; context: string }): Promise<string> =>
    ipcRenderer.invoke('export:cursorBundle', payload),

  // Corpus
  getMeetings: (): Promise<unknown[]> => ipcRenderer.invoke('corpus:getMeetings'),
  getMeeting: (id: string): Promise<unknown> => ipcRenderer.invoke('corpus:getMeeting', id),
  getAtoms: (meetingId?: string): Promise<unknown[]> => ipcRenderer.invoke('corpus:getAtoms', meetingId),
  importTranscript: (payload: { text: string; title?: string }): Promise<unknown> =>
    ipcRenderer.invoke('corpus:importTranscript', payload),
  importPaths: (paths: string[]): Promise<unknown[]> => ipcRenderer.invoke('corpus:importPaths', paths),
  pickAndImport: (): Promise<unknown[]> => ipcRenderer.invoke('corpus:pickAndImport'),
  pickAndImportToDoc: (docId: string): Promise<{
    fragmentHtml: string
    atomCount: number
    meetingCount: number
  } | null> => ipcRenderer.invoke('corpus:pickAndImportToDoc', docId),
  onCorpusImportProgress: (callback: (stage: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, stage: string): void => callback(stage)
    ipcRenderer.on('corpus:importProgress', handler)
    return () => ipcRenderer.removeListener('corpus:importProgress', handler)
  },
  deleteMeeting: (id: string): Promise<void> => ipcRenderer.invoke('corpus:deleteMeeting', id),
  createDocFromAtoms: (input: unknown): Promise<unknown> =>
    ipcRenderer.invoke('corpus:createDocFromAtoms', input),

  // Library (visual saves from browser extension)
  getLibraryItems: (filterTags?: string[]): Promise<unknown[]> =>
    ipcRenderer.invoke('library:getAll', filterTags),
  getLibraryItem: (id: string): Promise<unknown> => ipcRenderer.invoke('library:get', id),
  saveLibraryItem: (payload: unknown): Promise<unknown> => ipcRenderer.invoke('library:save', payload),
  deleteLibraryItem: (id: string): Promise<void> => ipcRenderer.invoke('library:delete', id),
  getLibraryExtensionInfo: (): Promise<{ port: number; token: string }> =>
    ipcRenderer.invoke('library:getExtensionInfo'),
  openLibraryUrl: (url: string): Promise<void> => ipcRenderer.invoke('library:openUrl', url),
  openLibraryExtensionFolder: (): Promise<void> => ipcRenderer.invoke('library:openExtensionFolder'),
  onLibraryItemSaved: (callback: (item: unknown) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, item: unknown): void => callback(item)
    ipcRenderer.on('library:itemSaved', handler)
    return () => ipcRenderer.removeListener('library:itemSaved', handler)
  },
}

contextBridge.exposeInMainWorld('mycel', mycelAPI)
