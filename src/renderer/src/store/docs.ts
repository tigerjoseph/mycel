import { create } from 'zustand'
import type { Doc, Folder } from '@shared/types'

interface DocsStore {
  folders: Folder[]
  docs: Doc[]
  favorites: Doc[]
  recentDocs: Doc[]
  loading: boolean
  fetchFolders: () => Promise<void>
  fetchDocs: (folderId: string) => Promise<void>
  fetchFavorites: () => Promise<void>
  fetchRecentDocs: () => Promise<void>
  upsertDoc: (d: Doc) => Promise<void>
  removeDoc: (id: string) => Promise<void>
}

export const useDocsStore = create<DocsStore>((set) => ({
  folders: [],
  docs: [],
  favorites: [],
  recentDocs: [],
  loading: false,
  fetchFolders: async () => {
    set({ loading: true })
    try {
      const folders = await window.mycel.getFolders()
      set({ folders, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  fetchDocs: async (folderId) => {
    set({ loading: true })
    try {
      const docs = await window.mycel.getDocs(folderId)
      set({ docs, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  fetchFavorites: async () => {
    try {
      const favorites = await window.mycel.getFavorites()
      set({ favorites })
    } catch {
      // ignore
    }
  },
  fetchRecentDocs: async () => {
    try {
      const recentDocs = await window.mycel.getDocs()
      set({ recentDocs })
    } catch {
      // ignore
    }
  },
  upsertDoc: async (d) => {
    const updated = await window.mycel.upsertDoc(d)
    set((state) => ({
      docs: state.docs.some((x) => x.id === updated.id)
        ? state.docs.map((x) => (x.id === updated.id ? updated : x))
        : [...state.docs, updated],
    }))
  },
  removeDoc: async (id) => {
    await window.mycel.deleteDoc(id)
    set((state) => ({
      docs: state.docs.filter((x) => x.id !== id),
    }))
  },
}))
