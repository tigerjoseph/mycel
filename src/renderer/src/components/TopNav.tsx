import { motion } from 'motion/react'
import { ChevronLeft, Search, Settings } from 'lucide-react'
import { useUIStore } from '../store/ui'
import type { PageId } from '@shared/types'
import { Logo } from './Logo'

const tabs: { id: PageId; label: string }[] = [
  { id: 'crm', label: 'CRM' },
  { id: 'docs', label: 'Docs' },
  { id: 'notes', label: 'Notes' }
]

const springTransition = { type: 'spring' as const, stiffness: 400, damping: 28 }

export default function TopNav() {
  const activePage = useUIStore((s) => s.activePage)
  const setPage = useUIStore((s) => s.setPage)
  const breadcrumbs = useUIStore((s) => s.breadcrumbs)
  const popBreadcrumb = useUIStore((s) => s.popBreadcrumb)
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen)

  const canGoBack = breadcrumbs.length > 0

  return (
    <header
      style={{
        height: 52,
        display: 'flex',
        alignItems: 'center',
        WebkitAppRegion: 'drag',
        position: 'relative',
        userSelect: 'none'
      }}
    >
      {/* Back chevron — positioned after macOS traffic lights area */}
      <button
        onClick={canGoBack ? popBreadcrumb : undefined}
        style={{
          WebkitAppRegion: 'no-drag',
          marginLeft: 80,
          background: 'none',
          border: 'none',
          padding: 4,
          cursor: canGoBack ? 'pointer' : 'default',
          opacity: canGoBack ? 1 : 0.3,
          pointerEvents: canGoBack ? 'auto' : 'none',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          transition: 'color 150ms ease'
        }}
        onMouseEnter={(e) => {
          if (canGoBack) e.currentTarget.style.color = 'var(--text)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-muted)'
        }}
        aria-label="Go back"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Logo */}
      <div style={{ marginLeft: 8, color: 'var(--text-muted)', WebkitAppRegion: 'no-drag', display: 'flex', alignItems: 'center' }}>
        <Logo size={20} />
      </div>

      {/* Centered tabs */}
      <nav
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 32
        }}
      >
        {tabs.map((tab) => {
          const isActive = activePage === tab.id
          return (
            <motion.button
              key={tab.id}
              onClick={() => setPage(tab.id)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={springTransition}
              style={{
                WebkitAppRegion: 'no-drag',
                background: 'none',
                border: 'none',
                padding: '0 0 6px 0',
                cursor: 'pointer',
                position: 'relative',
                fontSize: 14,
                fontFamily: 'Lora, serif',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                transition: 'color 150ms ease',
                lineHeight: 1
              }}
            >
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="tab-underline"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: 'var(--accent)',
                    borderRadius: 1
                  }}
                  transition={springTransition}
                />
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* Right icons */}
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          paddingRight: 16
        }}
      >
        <motion.button
          onClick={() => setCommandPaletteOpen(true)}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          transition={springTransition}
          style={{
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
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
          aria-label="Search"
        >
          <Search size={16} />
        </motion.button>

        <motion.button
          onClick={() => window.mycel.openSettingsWindow()}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          transition={springTransition}
          style={{
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
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
          aria-label="Settings"
        >
          <Settings size={16} />
        </motion.button>
      </div>
    </header>
  )
}
