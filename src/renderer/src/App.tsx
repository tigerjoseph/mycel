import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import TopNav from './components/TopNav'
import { Todo } from './pages/Todo'
import { CRM } from './pages/CRM'
import { Create } from './pages/Create'
import { Corpus } from './pages/Corpus'
import { Settings } from './pages/Settings'
import { CommandPalette } from './components/CommandPalette'
import { LogTouchpoint } from './components/LogTouchpoint'
import { ContactSwitcher } from './components/ContactSwitcher'
import { useUIStore } from './store/ui'
import { useKeyboard } from './hooks/useKeyboard'
import type { PageId } from '@shared/types'
import { applyAppearanceToDocument } from '@shared/appearance'

const PAGE_ORDER: PageId[] = ['todo', 'people', 'create', 'corpus']
const VALID_PAGES = new Set<PageId>(PAGE_ORDER)

const PAGE_COMPONENTS: Record<PageId, () => React.JSX.Element> = {
  todo: Todo,
  people: CRM,
  create: Create,
  corpus: Corpus
}

async function loadAppearance(): Promise<void> {
  if (window.mycel.getAppearance) {
    const id = await window.mycel.getAppearance()
    if (id) applyAppearanceToDocument(id)
    return
  }
  const theme = await window.mycel.getTheme()
  if (theme) document.documentElement.dataset.theme = theme
}

function App(): React.JSX.Element {
  const activePage = useUIStore((s) => s.activePage)
  const setPage = useUIStore((s) => s.setPage)
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen)
  const logTouchpointOpen = useUIStore((s) => s.logTouchpointOpen)
  const contactSwitcherOpen = useUIStore((s) => s.contactSwitcherOpen)
  const copyFeedback = useUIStore((s) => s.copyFeedback)
  const [mountedPages, setMountedPages] = useState<Set<PageId>>(() => new Set([activePage]))
  useKeyboard()

  useEffect(() => {
    setMountedPages((prev) => {
      if (prev.has(activePage)) return prev
      const next = new Set(prev)
      next.add(activePage)
      return next
    })
  }, [activePage])

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

  // Restore last tab on mount
  useEffect(() => {
    window.mycel.getSettings().then((s) => {
      const lastPage = s.lastPage as PageId | undefined
      if (lastPage && VALID_PAGES.has(lastPage)) {
        setPage(lastPage)
      }
    }).catch(() => {})
  }, [setPage])

  // Apply saved appearance on mount
  useEffect(() => {
    loadAppearance().catch(() => {})
  }, [])

  // Re-apply appearance when window regains focus
  useEffect(() => {
    const onFocus = (): void => {
      loadAppearance().catch(() => {})
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // Live appearance updates from any window
  useEffect(() => {
    window.mycel.onThemeChange((theme) => {
      document.documentElement.dataset.theme = theme
    })
    window.mycel.onAppearanceChange((id) => {
      applyAppearanceToDocument(id)
    })
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
        {PAGE_ORDER.map((page) => {
          if (!mountedPages.has(page)) return null
          const Page = PAGE_COMPONENTS[page]
          const isActive = activePage === page
          return (
            <div
              key={page}
              aria-hidden={!isActive}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: 'auto',
                visibility: isActive ? 'visible' : 'hidden',
                pointerEvents: isActive ? 'auto' : 'none',
                zIndex: isActive ? 1 : 0
              }}
            >
              <Page />
            </div>
          )
        })}
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

      {/* Copy feedback toast */}
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
              bottom: updateReady ? 72 : 16,
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
