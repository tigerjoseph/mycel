import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import TopNav from './components/TopNav'
import { Todo } from './pages/Todo'
import { CRM } from './pages/CRM'
import { Create } from './pages/Create'
import { Corpus } from './pages/Corpus'
import { CommandPalette } from './components/CommandPalette'
import { LogTouchpoint } from './components/LogTouchpoint'
import { ContactSwitcher } from './components/ContactSwitcher'
import { SettingsModal } from './components/SettingsModal'
import { useUIStore } from './store/ui'
import { useKeyboard } from './hooks/useKeyboard'
import { useProjectStageNudge } from './hooks/useProjectStageNudge'
import type { PageId } from '@shared/types'
import { applyAppearanceToDocument } from '@shared/appearance'
import { pageEnter } from './styles/animation'

const VALID_PAGES = new Set<PageId>(['todo', 'people', 'create', 'library'])

const PAGE_COMPONENTS: Record<PageId, () => React.JSX.Element> = {
  todo: Todo,
  people: CRM,
  create: Create,
  library: Corpus
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
  const projectNudge = useUIStore((s) => s.projectNudge)
  const clearProjectNudge = useUIStore((s) => s.clearProjectNudge)
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen)
  const setCRMView = useUIStore((s) => s.setCRMView)
  const setActiveProjectId = useUIStore((s) => s.setActiveProjectId)
  useKeyboard()
  useProjectStageNudge()

  // Restore last tab on mount
  useEffect(() => {
    window.mycel.getSettings().then((s) => {
      const lastPage = s.lastPage as PageId | 'corpus' | undefined
      const page = lastPage === 'corpus' ? 'library' : lastPage
      if (page && VALID_PAGES.has(page)) {
        setPage(page)
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

  // Live appearance / settings events from main process
  useEffect(() => {
    const unsubTheme = window.mycel.onThemeChange((theme) => {
      document.documentElement.dataset.theme = theme
    })
    const unsubAppearance = window.mycel.onAppearanceChange((id) => {
      applyAppearanceToDocument(id)
    })
    const unsubSettings = window.mycel.onOpenSettings(() => {
      setSettingsOpen(true)
    })
    return () => {
      unsubTheme()
      unsubAppearance()
      unsubSettings()
    }
  }, [setSettingsOpen])

  // Auto-update banner
  const [updateReady, setUpdateReady] = useState(false)
  useEffect(() => {
    const unsub = window.mycel.onUpdateDownloaded(() => setUpdateReady(true))
    return unsub
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <TopNav />
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activePage}
            initial={pageEnter.initial}
            animate={pageEnter.animate}
            exit={pageEnter.exit}
            transition={pageEnter.transition}
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'auto'
            }}
          >
            {(() => {
              const Page = PAGE_COMPONENTS[activePage]
              return <Page />
            })()}
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
      <SettingsModal />

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
              bottom: updateReady ? 72 : projectNudge ? 72 : 16,
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

      {/* Stuck project nudge */}
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
              boxShadow: 'var(--shadow-md)',
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
