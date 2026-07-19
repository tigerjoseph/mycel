import { useUIStore } from '../store/ui'
import { DocsHome } from './DocsHome'
import { FavoritesList } from './FavoritesList'
import { DocList } from './DocList'
import { DocEditor } from './DocEditor'
import { DataGrid } from './DataGrid'

const SHELL_STYLE: React.CSSProperties = {
  height: '100%',
  position: 'relative',
  overflow: 'hidden'
}

export function Docs(): React.JSX.Element {
  const docsView = useUIStore((s) => s.docsView)
  const activeDocId = useUIStore((s) => s.activeDocId)

  if (docsView === 'editor') {
    return (
      <div style={SHELL_STYLE}>
        <DocEditor />
      </div>
    )
  }

  if (docsView === 'grid') {
    return (
      <div style={SHELL_STYLE}>
        <DataGrid key={activeDocId ?? 'empty-grid'} />
      </div>
    )
  }

  return (
    <div style={SHELL_STYLE}>
      {docsView === 'home' && <DocsHome key="docs-home" />}
      {docsView === 'favorites' && <FavoritesList key="docs-favorites" />}
      {docsView === 'list' && <DocList key="docs-list" />}
    </div>
  )
}
