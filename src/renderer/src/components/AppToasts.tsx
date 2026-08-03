import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useUIStore } from '../store/ui'

/** Toasts and banners isolated from App shell to avoid full-tree re-renders. */
export function AppToasts(): React.JSX.Element {
  const copyFeedback = useUIStore((s) => s.copyFeedback)
  const projectNudge = useUIStore((s) => s.projectNudge)
  const clearProjectNudge = useUIStore((s) => s.clearProjectNudge)
  const setPage = useUIStore((s) => s.setPage)
  const setCRMView = useUIStore((s) => s.setCRMView)
  const setActiveProjectId = useUIStore((s) => s.setActiveProjectId)
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    const unsub = window.mycel.onUpdateDownloaded(() => setUpdateReady(true))
    return unsub
  }, [])

  const bottomOffset = updateReady || projectNudge ? 72 : 16

  return (
    <>
      <AnimatePresence>
        {copyFeedback && (
          <motion.div
            key="copy-feedback"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              position: 'fixed',
              bottom: bottomOffset,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '8px 16px',
              background: 'var(--text)',
              color: 'var(--bg)',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: 'var(--font-ui)',
              fontWeight: 500,
              zIndex: 201,
              pointerEvents: 'none'
            }}
          >
            {copyFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {projectNudge && (
          <motion.button
            key="project-nudge"
            type="button"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={() => {
              setPage('people')
              setCRMView('projects')
              setActiveProjectId(projectNudge.projectId)
              clearProjectNudge()
            }}
            style={{
              position: 'fixed',
              bottom: updateReady ? 72 : 16,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '10px 16px',
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--accent)',
              borderRadius: 10,
              fontSize: 13,
              fontFamily: 'var(--font-ui)',
              fontWeight: 500,
              zIndex: 201,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-md)',
              maxWidth: 'min(420px, calc(100vw - 32px))',
              textAlign: 'left'
            }}
          >
            {projectNudge.message}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {updateReady && (
          <motion.div
            key="update-banner"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{
              position: 'fixed',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 16px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              boxShadow: 'var(--shadow-md)',
              zIndex: 200
            }}
          >
            <span className="font-ui" style={{ fontSize: 13, color: 'var(--text)' }}>
              Update ready — restart to apply
            </span>
            <button
              onClick={() => window.mycel.installUpdate()}
              className="font-ui"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 6,
                padding: '4px 12px',
                cursor: 'pointer'
              }}
            >
              Restart
            </button>
            <button
              onClick={() => setUpdateReady(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                color: 'var(--text-muted)',
                padding: '0 2px',
                lineHeight: 1
              }}
            >
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
