import type { Doc } from '@shared/types'
import { useDocsStore } from '../store/docs'

export function findCachedDoc(id: string): Doc | undefined {
  const state = useDocsStore.getState()
  return (
    state.docs.find((d) => d.id === id) ??
    state.favorites.find((d) => d.id === id) ??
    state.recentDocs.find((d) => d.id === id)
  )
}
