import { motion, AnimatePresence } from 'motion/react'
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
  const docsView = useUIStore((s) => s.docsView)
  const hideCreateTabs =
    activeCreateView === 'docs' && (docsView === 'editor' || docsView === 'grid')

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <AnimatePresence initial={false}>
        {!hideCreateTabs && (
          <motion.div
            key="create-tabs"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              maxWidth: 680,
              margin: '0 auto',
              padding: '32px 24px 0',
              width: '100%',
              overflow: 'hidden',
              flexShrink: 0
            }}
          >
            <nav
              style={{
                display: 'flex',
                gap: 4,
                marginBottom: 28,
                padding: 4,
                background: 'var(--surface)',
                borderRadius: 12,
                border: '1px solid var(--border)',
                overflow: 'hidden'
              }}
            >
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
                  padding: '10px 6px 12px',
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
                  gap: 4,
                  borderRadius: 8,
                  zIndex: 1
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="create-tab-bg"
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      bottom: 2,
                      left: 2,
                      background: 'var(--bg)',
                      borderRadius: 7,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
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
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        {activeCreateView === 'docs' ? <Docs /> : <Notes />}
      </div>
    </div>
  )
}
