import type { Contact, Doc, Folder, Note, Link, Tag, SearchResult, Touchpoint, Project, Milestone } from './types'

export interface DataAdapter {
  getContacts(): Promise<Contact[]>
  getContact(id: string): Promise<Contact | null>
  upsertContact(c: Partial<Contact> & { id: string; name: string }): Promise<Contact>
  deleteContact(id: string): Promise<void>

  getFolders(): Promise<Folder[]>
  createFolder(name: string): Promise<Folder>
  renameFolder(id: string, name: string): Promise<void>
  deleteFolder(id: string): Promise<void>
  getDocs(folderId: string): Promise<Doc[]>
  getDoc(id: string): Promise<Doc | null>
  upsertDoc(d: Partial<Doc> & { id: string; title: string }): Promise<Doc>
  deleteDoc(id: string): Promise<void>
  getFavorites(): Promise<Doc[]>
  setFavorite(docId: string, val: boolean): Promise<void>
  reorderFavorites(ids: string[]): Promise<void>

  getNotes(opts?: { limit?: number; before?: number; tags?: string[] }): Promise<Note[]>
  getNote(id: string): Promise<Note | null>
  upsertNote(n: Partial<Note> & { id: string; title: string }): Promise<Note>
  deleteNote(id: string): Promise<void>

  getLinks(entityId: string): Promise<Link[]>
  upsertLink(link: Partial<Link> & { sourceId: string; targetId: string }): Promise<void>
  deleteLink(id: string): Promise<void>

  getTags(): Promise<Tag[]>

  search(query: string): Promise<SearchResult[]>

  getTouchpoints(contactId: string): Promise<Touchpoint[]>
  logTouchpoint(t: Partial<Touchpoint> & { contactId: string; medium: string }): Promise<Touchpoint>

  getProjects(contactId: string): Promise<Project[]>
  upsertProject(p: Partial<Project> & { id: string; name: string; contactId: string }): Promise<Project>
  deleteProject(id: string): Promise<void>

  getMilestones(projectId: string): Promise<Milestone[]>
  upsertMilestone(m: Partial<Milestone> & { id: string; text: string; projectId: string }): Promise<Milestone>
  deleteMilestone(id: string): Promise<void>

  getTheme(): Promise<'light' | 'dark'>
  setTheme(theme: 'light' | 'dark'): Promise<void>
}
