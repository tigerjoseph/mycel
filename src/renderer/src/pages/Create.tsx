import { useUIStore } from '../store/ui'
import { Docs } from './Docs'
import { Notes } from './Notes'
import { ContentTracking } from './ContentTracking'
import { Extractions } from './Extractions'
import { Corpus } from './Corpus'
import { ContentCalendar } from './ContentCalendar'

const subViewStyle = (active: boolean): React.CSSProperties => ({
  display: active ? 'flex' : 'none',
  flexDirection: 'column',
  position: 'absolute',
  inset: 0,
  overflow: 'hidden'
})

export function Create(): React.JSX.Element {
  const activeCreateView = useUIStore((s) => s.createView)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        <div style={subViewStyle(activeCreateView === 'docs')}>
          <Docs />
        </div>
        <div style={subViewStyle(activeCreateView === 'notes')}>
          <Notes />
        </div>
        <div style={subViewStyle(activeCreateView === 'content')}>
          <ContentTracking />
        </div>
        <div style={subViewStyle(activeCreateView === 'extractions')}>
          <Extractions />
        </div>
        <div style={subViewStyle(activeCreateView === 'corpus')}>
          <Corpus />
        </div>
        <div style={subViewStyle(activeCreateView === 'calendar')}>
          <ContentCalendar />
        </div>
      </div>
    </div>
  )
}
