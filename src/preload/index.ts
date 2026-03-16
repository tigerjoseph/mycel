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
  gcalConnect: (): Promise<void> => ipcRenderer.invoke('gcal:connect'),
  gcalFetchEvents: (): Promise<unknown[]> => ipcRenderer.invoke('gcal:fetchEvents'),
  gcalConfirmImport: (imports: unknown): Promise<void> => ipcRenderer.invoke('gcal:confirmImport', imports),
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

  // Listen for main process events
  onOpenSettings: (callback: () => void): void => {
    ipcRenderer.on('open-settings', () => callback())
  },

  // Auto-updates
  onUpdateAvailable: (callback: () => void): void => {
    ipcRenderer.on('update-available', () => callback())
  },
  onUpdateDownloaded: (callback: () => void): void => {
    ipcRenderer.on('update-downloaded', () => callback())
  },
  installUpdate: (): Promise<void> => ipcRenderer.invoke('updates:install'),

  // App info
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
}

contextBridge.exposeInMainWorld('mycel', mycelAPI)
