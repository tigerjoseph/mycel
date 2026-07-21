import type { PageId } from '@shared/types'

export type PeopleSubView = 'projects' | 'contacts'
export type CreateSubView = 'docs' | 'notes'
export type LibrarySubView = 'extractions' | 'mindspace'

export interface PageSubTab {
  id: string
  label: string
}

export const PAGE_SUBS: Partial<Record<PageId, PageSubTab[]>> = {
  people: [
    { id: 'projects', label: 'Projects' },
    { id: 'contacts', label: 'Contacts' }
  ],
  create: [
    { id: 'docs', label: 'Docs' },
    { id: 'notes', label: 'Notes' }
  ],
  library: [
    { id: 'extractions', label: 'Extractions' },
    { id: 'mindspace', label: 'Mindspace' }
  ]
}

export function getActiveSubId(page: PageId, state: {
  activeCRMView: PeopleSubView
  createView: CreateSubView
  libraryView: LibrarySubView
}): string | null {
  if (page === 'people') return state.activeCRMView
  if (page === 'create') return state.createView
  if (page === 'library') return state.libraryView
  return null
}

export function shouldShowPageSubs(state: {
  activePage: PageId
  activeContactId: string | null
  activeProjectId: string | null
  createView: CreateSubView
  docsView: 'home' | 'favorites' | 'list' | 'editor' | 'grid'
}): boolean {
  const subs = PAGE_SUBS[state.activePage]
  if (!subs) return false

  if (state.activePage === 'people' && (state.activeContactId || state.activeProjectId)) {
    return false
  }

  if (
    state.activePage === 'create' &&
    state.createView === 'docs' &&
    (state.docsView === 'editor' || state.docsView === 'grid')
  ) {
    return false
  }

  return true
}
