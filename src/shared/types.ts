export interface Contact {
  id: string
  name: string
  metadata: Record<string, string>
  tags: string[]
  lastContactedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface Folder {
  id: string
  name: string
  createdAt: number
}

export interface Doc {
  id: string
  title: string
  body: string
  type: 'doc' | 'grid' | 'canvas'
  folderId: string | null
  icon: string | null
  coverImage: string | null
  isTemplate: boolean
  isFavorite: boolean
  favoriteOrder: number | null
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface Note {
  id: string
  title: string
  body: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface Link {
  id: string
  sourceId: string
  sourceType: 'note' | 'doc' | 'contact'
  targetId: string
  targetType: 'note' | 'doc' | 'contact'
  createdAt: number
}

export interface Touchpoint {
  id: string
  contactId: string
  medium: 'email' | 'dm' | 'call' | 'coffee' | 'meet' | 'letter'
  note: string
  createdAt: number
}

export interface Project {
  id: string
  contactId: string
  name: string
  stage: string
  createdAt: number
  updatedAt: number
}

export interface Milestone {
  id: string
  projectId: string
  text: string
  done: boolean
  position: number
  createdAt: number
}

export interface Todo {
  id: string
  text: string
  done: boolean
  position: number
  createdAt: number
}

export interface Attachment {
  id: string
  projectId: string
  filename: string
  filepath: string
  createdAt: number
}

export interface Tag {
  name: string
  count: number
}

export interface SearchResult {
  id: string
  type: 'contact' | 'doc' | 'note' | 'project'
  title: string
  snippet: string
}

export type PageId = 'crm' | 'docs' | 'notes'

export interface BreadcrumbEntry {
  label: string
  action: () => void
}
