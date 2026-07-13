import type { BreadcrumbEntry, Doc } from '@shared/types'
import { useUIStore } from '../store/ui'

export function openDoc(
  doc: Pick<Doc, 'id' | 'type'>,
  breadcrumb?: BreadcrumbEntry
): void {
  const { setActiveDocId, setDocsView, pushBreadcrumb } = useUIStore.getState()
  setActiveDocId(doc.id)
  setDocsView(doc.type === 'grid' ? 'grid' : 'editor')
  if (breadcrumb) pushBreadcrumb(breadcrumb)
}
