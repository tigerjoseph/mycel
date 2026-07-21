import { create } from 'zustand'
import type { PageId, BreadcrumbEntry } from '@shared/types'

interface UIStore {
  activePage: PageId
  commandPaletteOpen: boolean
  contactSwitcherOpen: boolean
  logTouchpointOpen: boolean
  settingsOpen: boolean

  // CRM sub-views
  activeCRMView: 'projects' | 'contacts'
  activeContactId: string | null
  activeProjectId: string | null

  // Docs sub-views
  activeDocId: string | null
  activeFolderId: string | null
  docsView: 'home' | 'favorites' | 'list' | 'editor' | 'grid'

  // Notes
  activeNoteId: string | null

  // Create sub-view (keep-alive; used for save flush)
  createView: 'docs' | 'notes'

  // Library sub-views
  libraryView: 'extractions' | 'mindspace'

  // Focus requests from search — jump to and highlight a specific item
  libraryFocusItemId: string | null
  extractionsFocus: { meetingId: string; atomId: string } | null

  // Breadcrumbs
  breadcrumbs: BreadcrumbEntry[]

  // Copy feedback toast
  copyFeedback: string | null

  // Stuck-project nudge toast
  projectNudge: { message: string; projectId: string } | null

  // Actions
  setPage: (page: PageId) => void
  setCommandPaletteOpen: (open: boolean) => void
  setContactSwitcherOpen: (open: boolean) => void
  setLogTouchpointOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setCRMView: (view: 'projects' | 'contacts') => void
  setActiveContactId: (id: string | null) => void
  setActiveProjectId: (id: string | null) => void
  setActiveDocId: (id: string | null) => void
  setActiveFolderId: (id: string | null) => void
  setDocsView: (view: 'home' | 'favorites' | 'list' | 'editor' | 'grid') => void
  setActiveNoteId: (id: string | null) => void
  setCreateView: (view: 'docs' | 'notes') => void
  setLibraryView: (view: 'extractions' | 'mindspace') => void
  setLibraryFocusItemId: (id: string | null) => void
  setExtractionsFocus: (focus: { meetingId: string; atomId: string } | null) => void
  pushBreadcrumb: (entry: BreadcrumbEntry) => void
  popBreadcrumb: () => void
  setBreadcrumbs: (entries: BreadcrumbEntry[]) => void
  clearBreadcrumbs: () => void
  closeAllOverlays: () => void
  showCopyFeedback: (message?: string) => void
  showProjectNudge: (nudge: { message: string; projectId: string }) => void
  clearProjectNudge: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  activePage: 'todo',
  commandPaletteOpen: false,
  contactSwitcherOpen: false,
  logTouchpointOpen: false,
  settingsOpen: false,
  activeCRMView: 'contacts',
  activeContactId: null,
  activeProjectId: null,
  activeDocId: null,
  activeFolderId: null,
  docsView: 'home',
  activeNoteId: null,
  createView: 'docs',
  libraryView: 'extractions',
  libraryFocusItemId: null,
  extractionsFocus: null,
  breadcrumbs: [],
  copyFeedback: null,
  projectNudge: null,

  setPage: (page) => {
    set({ activePage: page, breadcrumbs: [] })
    window.mycel.setSettings({ lastPage: page }).catch(() => {})
  },
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setContactSwitcherOpen: (open) => set({ contactSwitcherOpen: open }),
  setLogTouchpointOpen: (open) => set({ logTouchpointOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setCRMView: (view) => set({ activeCRMView: view }),
  setActiveContactId: (id) => set({ activeContactId: id }),
  setActiveProjectId: (id) => set({ activeProjectId: id }),
  setActiveDocId: (id) => set({ activeDocId: id }),
  setActiveFolderId: (id) => set({ activeFolderId: id }),
  setDocsView: (view) => set({ docsView: view }),
  setActiveNoteId: (id) => set({ activeNoteId: id }),
  setCreateView: (view) => set({ createView: view }),
  setLibraryView: (view) => set({ libraryView: view }),
  setLibraryFocusItemId: (id) => set({ libraryFocusItemId: id }),
  setExtractionsFocus: (focus) => set({ extractionsFocus: focus }),
  pushBreadcrumb: (entry) => set((state) => ({
    breadcrumbs: [...state.breadcrumbs, entry]
  })),
  popBreadcrumb: () => set((state) => {
    if (state.breadcrumbs.length === 0) return state
    const top = state.breadcrumbs[state.breadcrumbs.length - 1]
    top.action()
    return { breadcrumbs: state.breadcrumbs.slice(0, -1) }
  }),
  setBreadcrumbs: (entries) => set({ breadcrumbs: entries }),
  clearBreadcrumbs: () => set({ breadcrumbs: [] }),
  closeAllOverlays: () => set({
    commandPaletteOpen: false,
    contactSwitcherOpen: false,
    logTouchpointOpen: false,
    settingsOpen: false
  }),
  showCopyFeedback: (message = 'Copied') => {
    set({ copyFeedback: message })
    setTimeout(() => {
      set((state) => (state.copyFeedback === message ? { copyFeedback: null } : state))
    }, 2000)
  },
  showProjectNudge: (nudge) => {
    set({ projectNudge: nudge })
    setTimeout(() => {
      set((state) =>
        state.projectNudge?.projectId === nudge.projectId ? { projectNudge: null } : state
      )
    }, 10000)
  },
  clearProjectNudge: () => set({ projectNudge: null }),
}))
