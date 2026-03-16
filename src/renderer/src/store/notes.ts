import { create } from 'zustand'
import type { Note } from '@shared/types'

interface NotesStore {
  notes: Note[]
  loading: boolean
  selectedTags: string[]
  fetch: (opts?: { limit?: number; before?: number; tags?: string[] }) => Promise<void>
  upsert: (n: Note) => Promise<void>
  remove: (id: string) => Promise<void>
  setSelectedTags: (tags: string[]) => void
  toggleTag: (tag: string) => void
  clearTags: () => void
}

export const useNotesStore = create<NotesStore>((set, get) => ({
  notes: [],
  loading: false,
  selectedTags: [],
  fetch: async (opts) => {
    set({ loading: true })
    try {
      const notes = await window.mycel.getNotes(opts)
      set({ notes, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  upsert: async (n) => {
    const updated = await window.mycel.upsertNote(n)
    set((state) => ({
      notes: state.notes.some((x) => x.id === updated.id)
        ? state.notes.map((x) => (x.id === updated.id ? updated : x))
        : [updated, ...state.notes],
    }))
  },
  remove: async (id) => {
    await window.mycel.deleteNote(id)
    set((state) => ({
      notes: state.notes.filter((x) => x.id !== id),
    }))
  },
  setSelectedTags: (tags) => set({ selectedTags: tags }),
  toggleTag: (tag) => {
    const current = get().selectedTags
    if (current.includes(tag)) {
      set({ selectedTags: current.filter((t) => t !== tag) })
    } else {
      set({ selectedTags: [...current, tag] })
    }
  },
  clearTags: () => set({ selectedTags: [] }),
}))
