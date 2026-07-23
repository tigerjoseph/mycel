import { motion } from 'motion/react'
import { Search, Settings } from 'lucide-react'
import { useUIStore } from '../store/ui'
import type { PageId } from '@shared/types'
import {
  getActiveSubId,
  PAGE_SUBS,
  shouldShowPageSubs,
  type CreateSubView,
  type LibrarySubView,
  type PeopleSubView
} from '../config/pageSubs'

const tabs: { id: PageId; label: string }[] = [
  { id: 'todo', label: 'To-Do' },
  { id: 'people', label: 'People' },
  { id: 'create', label: 'Create' },
  { id: 'library', label: 'Library' }
]

const heightEase = { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const }

export default function TopNav(): React.JSX.Element {
  const activePage = useUIStore((s) => s.activePage)
  const setPage = useUIStore((s) => s.setPage)
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen)
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen)
  const activeCRMView = useUIStore((s) => s.activeCRMView)
  const setCRMView = useUIStore((s) => s.setCRMView)
  const setActiveContactId = useUIStore((s) => s.setActiveContactId)
  const setActiveProjectId = useUIStore((s) => s.setActiveProjectId)
  const clearBreadcrumbs = useUIStore((s) => s.clearBreadcrumbs)
  const createView = useUIStore((s) => s.createView)
  const setCreateView = useUIStore((s) => s.setCreateView)
  const libraryView = useUIStore((s) => s.libraryView)
  const setLibraryView = useUIStore((s) => s.setLibraryView)
  const activeContactId = useUIStore((s) => s.activeContactId)
  const activeProjectId = useUIStore((s) => s.activeProjectId)
  const docsView = useUIStore((s) => s.docsView)

  const showSubs = shouldShowPageSubs({
    activePage,
    activeContactId,
    activeProjectId,
    createView,
    docsView
  })
  const subTabs = showSubs ? PAGE_SUBS[activePage] : undefined
  const activeSubId = getActiveSubId(activePage, { activeCRMView, createView, libraryView })

  function setSubTab(id: string): void {
    if (activePage === 'people') {
      setActiveContactId(null)
      setActiveProjectId(null)
      clearBreadcrumbs()
      setCRMView(id as PeopleSubView)
    } else if (activePage === 'create') setCreateView(id as CreateSubView)
    else if (activePage === 'library') setLibraryView(id as LibrarySubView)
  }

  return (
    <motion.header
      initial={false}
      animate={{ height: showSubs ? 96 : 54 }}
      transition={heightEase}
      style={{
        paddingTop: 14,
        display: 'flex',
        flexDirection: 'column',
        WebkitAppRegion: 'drag',
        position: 'relative',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 32,
          position: 'relative',
          flexShrink: 0
        }}
      >
        <nav
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 28
          }}
        >
          {tabs.map((tab) => {
            const isActive = activePage === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setPage(tab.id)}
                style={{
                  WebkitAppRegion: 'no-drag',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontFamily: 'var(--font-heading)',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--text)' : 'var(--text-muted)',
                  transition: 'color 200ms ease',
                  lineHeight: 1
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = 'var(--text)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = 'var(--text-muted)'
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>

        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            paddingRight: 16
          }}
        >
          <button
            onClick={() => setCommandPaletteOpen(true)}
            style={iconBtnStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
            aria-label="Search"
          >
            <Search size={15} />
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            style={iconBtnStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
            aria-label="Settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {subTabs && (
        <nav
          aria-label="Section"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 36,
            paddingTop: 18,
            paddingBottom: 10,
            flexShrink: 0
          }}
        >
          {subTabs.map((tab) => {
            const isActive = activeSubId === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                style={{
                  WebkitAppRegion: 'no-drag',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: 18,
                  fontFamily: 'var(--font-heading)',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--text)' : 'var(--text-muted)',
                  transition: 'color 200ms ease',
                  lineHeight: 1.1,
                  letterSpacing: '-0.01em'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = 'var(--text)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = 'var(--text-muted)'
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      )}
    </motion.header>
  )
}

const iconBtnStyle: React.CSSProperties = {
  WebkitAppRegion: 'no-drag',
  background: 'none',
  border: 'none',
  padding: 4,
  cursor: 'pointer',
  color: 'var(--text-muted)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4,
  transition: 'color 150ms ease'
}
