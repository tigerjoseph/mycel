import { create } from 'zustand'
import type { PageId, BreadcrumbEntry } from '@shared/types'

interface UIStore {
  activePage: PageId
  commandPaletteOpen: boolean
  contactSwitcherOpen: boolean
  logTouchpointOpen: boolean

  // CRM sub-views
  activeCRMView: 'dashboard' | 'projects' | 'contacts' | 'actions'
  activeContactId: string | null
  activeProjectId: string | null

  // Docs sub-views
  activeDocId: string | null
  activeFolderId: string | null
  docsView: 'home' | 'favorites' | 'list' | 'editor' | 'grid' | 'canvas'

  // Notes
  activeNoteId: string | null
  noteEditorOpen: boolean

  // Breadcrumbs
  breadcrumbs: BreadcrumbEntry[]

  // Actions
  setPage: (page: PageId) => void
  setCommandPaletteOpen: (open: boolean) => void
  setContactSwitcherOpen: (open: boolean) => void
  setLogTouchpointOpen: (open: boolean) => void
  setCRMView: (view: 'dashboard' | 'projects' | 'contacts' | 'actions') => void
  setActiveContactId: (id: string | null) => void
  setActiveProjectId: (id: string | null) => void
  setActiveDocId: (id: string | null) => void
  setActiveFolderId: (id: string | null) => void
  setDocsView: (view: 'home' | 'favorites' | 'list' | 'editor' | 'grid' | 'canvas') => void
  setActiveNoteId: (id: string | null) => void
  setNoteEditorOpen: (open: boolean) => void
  pushBreadcrumb: (entry: BreadcrumbEntry) => void
  popBreadcrumb: () => void
  setBreadcrumbs: (entries: BreadcrumbEntry[]) => void
  clearBreadcrumbs: () => void
  closeAllOverlays: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  activePage: 'crm',
  commandPaletteOpen: false,
  contactSwitcherOpen: false,
  logTouchpointOpen: false,
  activeCRMView: 'dashboard',
  activeContactId: null,
  activeProjectId: null,
  activeDocId: null,
  activeFolderId: null,
  docsView: 'home',
  activeNoteId: null,
  noteEditorOpen: false,
  breadcrumbs: [],

  setPage: (page) => set({ activePage: page, breadcrumbs: [] }),
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
  pushBreadcrumb: (entry) => set((state) => ({
    breadcrumbs: [...state.breadcrumbs, entry]
  })),
  popBreadcrumb: () => set((state) => {
    if (state.breadcrumbs.length <= 1) return { breadcrumbs: [] }
    const prev = state.breadcrumbs[state.breadcrumbs.length - 2]
    prev.action()
    return { breadcrumbs: state.breadcrumbs.slice(0, -1) }
  }),
  setBreadcrumbs: (entries) => set({ breadcrumbs: entries }),
  clearBreadcrumbs: () => set({ breadcrumbs: [] }),
  closeAllOverlays: () => set({
    commandPaletteOpen: false,
    contactSwitcherOpen: false,
    logTouchpointOpen: false,
  }),
}))
