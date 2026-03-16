import { create } from 'zustand'
import type { Contact } from '@shared/types'

interface ContactsStore {
  contacts: Contact[]
  loading: boolean
  fetch: () => Promise<void>
  upsert: (c: Contact) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useContactsStore = create<ContactsStore>((set) => ({
  contacts: [],
  loading: false,
  fetch: async () => {
    set({ loading: true })
    try {
      const contacts = await window.mycel.getContacts()
      set({ contacts, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  upsert: async (c) => {
    const updated = await window.mycel.upsertContact(c)
    set((state) => ({
      contacts: state.contacts.some((x) => x.id === updated.id)
        ? state.contacts.map((x) => (x.id === updated.id ? updated : x))
        : [...state.contacts, updated],
    }))
  },
  remove: async (id) => {
    await window.mycel.deleteContact(id)
    set((state) => ({
      contacts: state.contacts.filter((x) => x.id !== id),
    }))
  },
}))
