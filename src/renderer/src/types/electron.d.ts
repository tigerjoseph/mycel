export {}

declare global {
  interface Window {
    mycel: {
      // Contacts
      getContacts(): Promise<import('@shared/types').Contact[]>
      getContact(id: string): Promise<import('@shared/types').Contact | null>
      upsertContact(c: unknown): Promise<import('@shared/types').Contact>
      deleteContact(id: string): Promise<void>

      // Folders
      getFolders(): Promise<import('@shared/types').Folder[]>
      createFolder(name: string): Promise<import('@shared/types').Folder>
      renameFolder(id: string, name: string): Promise<void>
      deleteFolder(id: string): Promise<void>

      // Docs
      getDocs(folderId?: string): Promise<import('@shared/types').Doc[]>
      getDoc(id: string): Promise<import('@shared/types').Doc | null>
      upsertDoc(d: unknown): Promise<import('@shared/types').Doc>
      deleteDoc(id: string): Promise<void>
      getFavorites(): Promise<import('@shared/types').Doc[]>
      setFavorite(id: string, val: boolean): Promise<void>
      reorderFavorites(ids: string[]): Promise<void>

      // Notes
      getNotes(opts?: unknown): Promise<import('@shared/types').Note[]>
      getNote(id: string): Promise<import('@shared/types').Note | null>
      upsertNote(n: unknown): Promise<import('@shared/types').Note>
      deleteNote(id: string): Promise<void>

      // Links
      getLinks(entityId: string): Promise<import('@shared/types').Link[]>
      upsertLink(l: unknown): Promise<void>
      deleteLink(id: string): Promise<void>

      // Tags
      getTags(): Promise<import('@shared/types').Tag[]>
      getEntitiesByTag(tag: string): Promise<unknown[]>

      // Search
      search(q: string): Promise<import('@shared/types').SearchResult[]>

      // Touchpoints
      getTouchpoints(contactId: string): Promise<import('@shared/types').Touchpoint[]>
      logTouchpoint(t: unknown): Promise<import('@shared/types').Touchpoint>

      // Projects
      getAllProjects(): Promise<(import('@shared/types').Project & { contactName: string })[]>
      getProjects(contactId: string): Promise<import('@shared/types').Project[]>
      getProject(id: string): Promise<import('@shared/types').Project | null>
      upsertProject(p: unknown): Promise<import('@shared/types').Project>
      deleteProject(id: string): Promise<void>

      // Milestones
      getMilestones(projectId: string): Promise<import('@shared/types').Milestone[]>
      upsertMilestone(m: unknown): Promise<import('@shared/types').Milestone>
      deleteMilestone(id: string): Promise<void>

      // Todos
      getTodos(): Promise<import('@shared/types').Todo[]>
      upsertTodo(t: unknown): Promise<import('@shared/types').Todo>
      deleteTodo(id: string): Promise<void>

      // Google Calendar
      gcalConnect(): Promise<void>
      gcalFetchEvents(): Promise<unknown[]>
      gcalConfirmImport(imports: unknown): Promise<void>
      gcalGetUpcoming(contactId: string): Promise<unknown>

      // Stripe
      stripeConnect(): Promise<void>
      stripeConfirmMatches(matches: unknown): Promise<void>
      stripeRefreshCache(): Promise<void>
      stripeGetCache(customerId: string): Promise<unknown>

      // Settings
      getSettings(): Promise<Record<string, unknown>>
      setSettings(s: unknown): Promise<void>
      openSettingsWindow(): Promise<void>

      // Import
      importAppleContacts(): Promise<unknown[]>

      // Theme
      getTheme(): Promise<'light' | 'dark'>
      setTheme(theme: 'light' | 'dark'): Promise<void>
      onThemeChange(callback: (theme: 'light' | 'dark') => void): void

      // Events
      onOpenSettings(callback: () => void): void

      // Auto-updates
      onUpdateAvailable(callback: () => void): void
      onUpdateDownloaded(callback: () => void): void
      installUpdate(): Promise<void>

      // App info
      getVersion(): Promise<string>
    }
  }
}
