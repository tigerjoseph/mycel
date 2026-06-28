import { motion } from 'motion/react'
import { FileText, StickyNote } from 'lucide-react'
import { spring } from '../styles/animation'
import { useUIStore } from '../store/ui'
import { Docs } from './Docs'
import { Notes } from './Notes'

const CREATE_TABS = [
  { id: 'docs' as const, label: 'Docs', icon: FileText },
  { id: 'notes' as const, label: 'Notes', icon: StickyNote }
]

export function Create(): React.JSX.Element {
  const activeCreateView = useUIStore((s) => s.createView)
  const setCreateView = useUIStore((s) => s.setCreateView)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 0', width: '100%' }}>
        <nav style={{ display: 'flex', gap: 4, marginBottom: 28, padding: 4, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
          {CREATE_TABS.map((tab) => {
            const isActive = activeCreateView === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setCreateView(tab.id)}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  padding: '8px 0',
                  cursor: 'pointer',
                  position: 'relative',
                  fontSize: 11,
                  fontFamily: 'var(--font-ui)',
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? 'var(--text)' : 'var(--text-muted)',
                  transition: 'color 150ms ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  borderRadius: 8,
                  zIndex: 1
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="create-tab-bg"
                    style={{
                      position: 'absolute',
                      inset: 1,
                      background: 'var(--bg)',
                      borderRadius: 8,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                    }}
                    transition={spring}
                  />
                )}
                <Icon size={15} style={{ position: 'relative', zIndex: 1 }} />
                <span style={{ position: 'relative', zIndex: 1 }}>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: activeCreateView === 'docs' ? 'block' : 'none', height: '100%' }}>
          <Docs />
        </div>
        <div style={{ display: activeCreateView === 'notes' ? 'block' : 'none', height: '100%' }}>
          <Notes />
        </div>
      </div>
    </div>
  )
}
