import { useEffect } from 'react'
import { AnimatePresence } from 'motion/react'
import TopNav from './components/TopNav'
import { AppToasts } from './components/AppToasts'
import { Todo } from './pages/Todo'
import { CRM } from './pages/CRM'
import { Create } from './pages/Create'
import { LibraryFeed } from './pages/LibraryFeed'
import { CommandPalette } from './components/CommandPalette'
import { LogTouchpoint } from './components/LogTouchpoint'
import { ContactSwitcher } from './components/ContactSwitcher'
import { SettingsModal } from './components/SettingsModal'
import { useUIStore } from './store/ui'
import { useKeyboard } from './hooks/useKeyboard'
import { useProjectStageNudge } from './hooks/useProjectStageNudge'
import type { PageId } from '@shared/types'
import { applyAppearanceToDocument } from '@shared/appearance'

const VALID_PAGES = new Set<PageId>(['todo', 'people', 'create', 'library'])

const PAGE_COMPONENTS: Record<PageId, () => React.JSX.Element> = {
  todo: Todo,
  people: CRM,
  create: Create,
  library: LibraryFeed
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
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen)
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

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <TopNav />
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {(Object.entries(PAGE_COMPONENTS) as [PageId, () => React.JSX.Element][]).map(([pageId, Page]) => (
          <div
            key={pageId}
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'auto',
              display: activePage === pageId ? 'block' : 'none'
            }}
          >
            <Page />
          </div>
        ))}
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
      <AppToasts />
    </div>
  )
}

export default App
