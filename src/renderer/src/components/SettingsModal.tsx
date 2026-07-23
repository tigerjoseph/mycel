import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronLeft } from 'lucide-react'
import { springGentle } from '../styles/animation'
import { useUIStore } from '../store/ui'
import { Settings } from '../pages/Settings'

export function SettingsModal(): React.JSX.Element {
  const open = useUIStore((s) => s.settingsOpen)
  const setOpen = useUIStore((s) => s.setSettingsOpen)

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, setOpen])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="settings-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 150,
            padding: 24
          }}
        >
          <motion.div
            key="settings-panel"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={springGentle}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(520px, calc(100vw - 48px))',
              maxHeight: 'min(680px, calc(100vh - 48px))',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              boxShadow: 'var(--shadow-modal)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
                flexShrink: 0
              }}
            >
              <button
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: 6,
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 13
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--text)'
                }}
              >
                Settings
              </span>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <Settings isOpen={open} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
