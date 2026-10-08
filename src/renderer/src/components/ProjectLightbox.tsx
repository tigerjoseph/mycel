import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { spring } from '../styles/animation'
import { useUIStore } from '../store/ui'
import { ProjectDetail } from '../pages/ProjectDetail'

/** Overlay shell for CRM projects — board/contact stay underneath. */
export function ProjectLightbox(): React.JSX.Element | null {
  const activeProjectId = useUIStore((s) => s.activeProjectId)
  const setActiveProjectId = useUIStore((s) => s.setActiveProjectId)

  useEffect(() => {
    if (!activeProjectId) return
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape' && !e.metaKey && !e.ctrlKey) {
        e.stopPropagation()
        setActiveProjectId(null)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [activeProjectId, setActiveProjectId])

  return createPortal(
    <AnimatePresence>
      {activeProjectId && (
        <motion.div
          key={activeProjectId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24
          }}
          data-ui-overlay=""
          onClick={() => setActiveProjectId(null)}
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(640px, 100%)',
              height: 'min(84vh, 720px)',
              background: 'var(--bg)',
              borderRadius: 12,
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-modal)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              <ProjectDetail variant="lightbox" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
