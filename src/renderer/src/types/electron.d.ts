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
      getDocVersions(id: string): Promise<import('@shared/types').DocVersion[]>
      getDeletedDocs(): Promise<import('@shared/types').DocVersion[]>
      restoreDocVersion(versionId: string): Promise<import('@shared/types').Doc>
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
      getEntitiesByTag(tag: string): Promise<import('@shared/types').TagEntity[]>

      // Search
      search(q: string): Promise<import('@shared/types').SearchResult[]>

      // Touchpoints
      getTouchpoints(contactId: string): Promise<import('@shared/types').Touchpoint[]>
      logTouchpoint(t: unknown): Promise<import('@shared/types').Touchpoint>

      // Projects
      getAllProjects(): Promise<(import('@shared/types').Project & { contactName: string; lastContactedAt: number | null })[]>
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
      gcalGetStatus(): Promise<{ connected: boolean }>
      gcalConnect(): Promise<{
        ok: true
        sync: { created: number; skipped: number }
        syncWarning?: string
      }>
      gcalDisconnect(): Promise<void>
      gcalSyncContacts(): Promise<{ created: number; skipped: number }>
      gcalFetchEvents(): Promise<unknown[]>
      gcalConfirmImport(imports: unknown): Promise<{ created: number; skipped: number }>
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

      // Appearance
      getAppearance(): Promise<import('@shared/appearance').AppearanceId>
      setAppearance(id: import('@shared/appearance').AppearanceId): Promise<void>
      onAppearanceChange(callback: (id: import('@shared/appearance').AppearanceId) => void): () => void

      // Theme
      getTheme(): Promise<'light' | 'dark'>
      setTheme(theme: 'light' | 'dark'): Promise<void>
      onThemeChange(callback: (theme: 'light' | 'dark') => void): () => void

      // Events
      onOpenSettings(callback: () => void): () => void

      // Auto-updates
      onUpdateAvailable(callback: () => void): () => void
      onUpdateDownloaded(callback: () => void): () => void
      installUpdate(): Promise<void>
      checkForUpdates(): Promise<{ status: 'dev' | 'current' | 'available' | 'error'; version?: string }>

      // App info
      getVersion(): Promise<string>
      getDataInfo(): Promise<{
        dbPath: string
        counts: { contacts: number; docs: number; notes: number; meetings: number; projects: number; todos: number }
      }>
      openDataFolder(): Promise<void>
      getVoiceImportStatus(): Promise<{
        ready: boolean
        whisperCli: boolean
        ffmpeg: boolean
        model: boolean
      }>

      // Export
      exportCursorBundle(payload: { title: string; draft: string; context: string }): Promise<string>

      // Corpus
      getMeetings(): Promise<import('@shared/types').Meeting[]>
      getMeeting(id: string): Promise<import('@shared/types').Meeting | null>
      getAtoms(meetingId?: string): Promise<import('@shared/types').Atom[]>
      importTranscript(payload: { text: string; title?: string }): Promise<{
        meeting: import('@shared/types').Meeting
        atoms: import('@shared/types').Atom[]
      }>
      importPaths(paths: string[]): Promise<{
        meeting: import('@shared/types').Meeting
        atoms: import('@shared/types').Atom[]
      }[]>
      pickAndImport(): Promise<{
        meeting: import('@shared/types').Meeting
        atoms: import('@shared/types').Atom[]
      }[]>
      pickAndImportToDoc(docId: string): Promise<{
        fragmentHtml: string
        atomCount: number
        meetingCount: number
      } | null>
      onCorpusImportProgress(callback: (stage: string) => void): () => void
      deleteMeeting(id: string): Promise<void>
      createDocFromAtoms(input: import('@shared/types').CreateDocFromAtomsInput): Promise<import('@shared/types').Doc>

      // Library
      getLibraryItems(filterTags?: string[]): Promise<import('@shared/types').LibraryItem[]>
      getLibraryItem(id: string): Promise<import('@shared/types').LibraryItem | null>
      saveLibraryItem(payload: import('@shared/types').SaveLibraryPayload): Promise<import('@shared/types').LibraryItem>
      deleteLibraryItem(id: string): Promise<void>
      getLibraryExtensionInfo(): Promise<{ port: number; token: string }>
      openLibraryUrl(url: string): Promise<void>
      openLibraryExtensionFolder(): Promise<void>
      onLibraryItemSaved(callback: (item: import('@shared/types').LibraryItem) => void): () => void
    }
  }
}
