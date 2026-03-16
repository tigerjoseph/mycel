import { AnimatePresence } from 'motion/react'
import { useUIStore } from '../store/ui'
import { DocsHome } from './DocsHome'
import { FavoritesList } from './FavoritesList'
import { DocList } from './DocList'
import { DocEditor } from './DocEditor'
import { DataGrid } from './DataGrid'
import { CanvasEditor } from './CanvasEditor'

export function Docs(): React.JSX.Element {
  const docsView = useUIStore((s) => s.docsView)

  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <AnimatePresence initial={false}>
        {docsView === 'home' && <DocsHome key="docs-home" />}
        {docsView === 'favorites' && <FavoritesList key="docs-favorites" />}
        {docsView === 'list' && <DocList key="docs-list" />}
        {docsView === 'editor' && <DocEditor key="docs-editor" />}
        {docsView === 'grid' && <DataGrid key="docs-grid" />}
        {docsView === 'canvas' && <CanvasEditor key="docs-canvas" />}
      </AnimatePresence>
    </div>
  )
}
