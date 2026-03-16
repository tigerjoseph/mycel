import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import TopNav from './components/TopNav'
import { CRM } from './pages/CRM'
import { Docs } from './pages/Docs'
import { Notes } from './pages/Notes'
import { Settings } from './pages/Settings'
import { CommandPalette } from './components/CommandPalette'
import { LogTouchpoint } from './components/LogTouchpoint'
import { ContactSwitcher } from './components/ContactSwitcher'
import { useUIStore } from './store/ui'
import { useKeyboard } from './hooks/useKeyboard'
import type { PageId } from '@shared/types'

function App(): React.JSX.Element {
  const activePage = useUIStore((s) => s.activePage)
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen)
  const logTouchpointOpen = useUIStore((s) => s.logTouchpointOpen)
  const contactSwitcherOpen = useUIStore((s) => s.contactSwitcherOpen)
  useKeyboard()

  const PAGE_ORDER: PageId[] = ['crm', 'docs', 'notes']
  const directionRef = useRef(0)
  const prevPageRef = useRef(activePage)

  if (activePage !== prevPageRef.current) {
    const prevIdx = PAGE_ORDER.indexOf(prevPageRef.current)
    const nextIdx = PAGE_ORDER.indexOf(activePage)
    directionRef.current = nextIdx > prevIdx ? 1 : -1
    prevPageRef.current = activePage
  }

  const direction = directionRef.current

  const slideVariants = {
    enter: (d: number) => ({ x: `${d * 15}%`, opacity: 0 }),
    center: { x: '0%', opacity: 1 },
    exit: (d: number) => ({ x: `${d * -15}%`, opacity: 0 })
  }

  // Settings window detection via hash
  const [isSettingsWindow, setIsSettingsWindow] = useState(
    () => window.location.hash === '#settings'
  )

  useEffect(() => {
    const onHashChange = (): void => {
      setIsSettingsWindow(window.location.hash === '#settings')
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Apply saved theme on mount
  useEffect(() => {
    window.mycel.getTheme().then((t: string) => {
      if (t) document.documentElement.dataset.theme = t
    })
  }, [])

  // Re-apply theme when window regains focus (picks up changes from settings window)
  useEffect(() => {
    const onFocus = (): void => {
      window.mycel.getTheme().then((t: string) => {
        if (t) document.documentElement.dataset.theme = t
      })
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // Auto-update banner
  const [updateReady, setUpdateReady] = useState(false)
  useEffect(() => {
    window.mycel.onUpdateDownloaded(() => setUpdateReady(true))
  }, [])

  // Render settings page in its own window
  if (isSettingsWindow) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <Settings />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <TopNav />
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={activePage}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'auto', willChange: 'transform, opacity' }}
          >
            {activePage === 'crm' && <CRM />}
            {activePage === 'docs' && <Docs />}
            {activePage === 'notes' && <Notes />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global overlays */}
      <AnimatePresence>
        {commandPaletteOpen && <CommandPalette key="cmd-palette" />}
      </AnimatePresence>
      <AnimatePresence>
        {logTouchpointOpen && <LogTouchpoint key="log-touchpoint" />}
      </AnimatePresence>
      <AnimatePresence>
        {contactSwitcherOpen && <ContactSwitcher key="contact-switcher" />}
      </AnimatePresence>

      {/* Auto-update banner */}
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
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              zIndex: 200
            }}
          >
            <span
              className="font-ui"
              style={{ fontSize: 13, color: 'var(--text)' }}
            >
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
    </div>
  )
}

export default App
