import { create } from 'zustand'
import type { PageId, BreadcrumbEntry } from '@shared/types'

interface UIStore {
  activePage: PageId
  commandPaletteOpen: boolean
  contactSwitcherOpen: boolean
  logTouchpointOpen: boolean

  // CRM sub-views
  activeCRMView: 'projects' | 'contacts' | 'followups'
  activeContactId: string | null
  activeProjectId: string | null

  // Docs sub-views
  activeDocId: string | null
  activeFolderId: string | null
  docsView: 'home' | 'favorites' | 'list' | 'editor' | 'grid'

  // Notes
  activeNoteId: string | null
  noteEditorOpen: boolean

  // Create sub-view (keep-alive; used for save flush)
  createView: 'docs' | 'notes'

  // Breadcrumbs
  breadcrumbs: BreadcrumbEntry[]

  // Copy feedback toast
  copyFeedback: string | null

  // Actions
  setPage: (page: PageId) => void
  setCommandPaletteOpen: (open: boolean) => void
  setContactSwitcherOpen: (open: boolean) => void
  setLogTouchpointOpen: (open: boolean) => void
  setCRMView: (view: 'projects' | 'contacts' | 'followups') => void
  setActiveContactId: (id: string | null) => void
  setActiveProjectId: (id: string | null) => void
  setActiveDocId: (id: string | null) => void
  setActiveFolderId: (id: string | null) => void
  setDocsView: (view: 'home' | 'favorites' | 'list' | 'editor' | 'grid') => void
  setActiveNoteId: (id: string | null) => void
  setNoteEditorOpen: (open: boolean) => void
  setCreateView: (view: 'docs' | 'notes') => void
  pushBreadcrumb: (entry: BreadcrumbEntry) => void
  popBreadcrumb: () => void
  setBreadcrumbs: (entries: BreadcrumbEntry[]) => void
  clearBreadcrumbs: () => void
  closeAllOverlays: () => void
  showCopyFeedback: (message?: string) => void
}

export const useUIStore = create<UIStore>((set) => ({
  activePage: 'todo',
  commandPaletteOpen: false,
  contactSwitcherOpen: false,
  logTouchpointOpen: false,
  activeCRMView: 'contacts',
  activeContactId: null,
  activeProjectId: null,
  activeDocId: null,
  activeFolderId: null,
  docsView: 'home',
  activeNoteId: null,
  noteEditorOpen: false,
  createView: 'docs',
  breadcrumbs: [],
  copyFeedback: null,

  setPage: (page) => {
    set({ activePage: page, breadcrumbs: [] })
    window.mycel.setSettings({ lastPage: page }).catch(() => {})
  },
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setContactSwitcherOpen: (open) => set({ contactSwitcherOpen: open }),
  setLogTouchpointOpen: (open) => set({ logTouchpointOpen: open }),
  setCRMView: (view) => set({ activeCRMView: view }),
  setActiveContactId: (id) => set({ activeContactId: id }),
  setActiveProjectId: (id) => set({ activeProjectId: id }),
  setActiveDocId: (id) => set({ activeDocId: id }),
  setActiveFolderId: (id) => set({ activeFolderId: id }),
  setDocsView: (view) => set({ docsView: view }),
  setActiveNoteId: (id) => set({ activeNoteId: id }),
  setNoteEditorOpen: (open) => set({ noteEditorOpen: open }),
  setCreateView: (view) => set({ createView: view }),
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
  }),
  showCopyFeedback: (message = 'Copied') => {
    set({ copyFeedback: message })
    setTimeout(() => {
      set((state) => (state.copyFeedback === message ? { copyFeedback: null } : state))
    }, 2000)
  },
}))
