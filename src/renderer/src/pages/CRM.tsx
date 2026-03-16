import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { LayoutDashboard, Briefcase, Users, Send } from 'lucide-react'
import { spring } from '../styles/animation'
import { useUIStore } from '../store/ui'
import { useContactsStore } from '../store/contacts'
import { ContactList } from './ContactList'
import { ContactDetail } from './ContactDetail'
import { ProjectDetail } from './ProjectDetail'
import { ProjectsList } from './ProjectsList'
import { OutreachQueue } from './OutreachQueue'
import { CRMDashboard } from './CRMDashboard'

const CRM_TABS = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'projects' as const, label: 'Projects', icon: Briefcase },
  { id: 'contacts' as const, label: 'Contacts', icon: Users },
  { id: 'actions' as const, label: 'Actions', icon: Send }
]

export function CRM(): React.JSX.Element {
  const activeCRMView = useUIStore((s) => s.activeCRMView)
  const setCRMView = useUIStore((s) => s.setCRMView)
  const activeContactId = useUIStore((s) => s.activeContactId)
  const activeProjectId = useUIStore((s) => s.activeProjectId)

  const fetchContacts = useContactsStore((s) => s.fetch)

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  // Detail views take priority over tabs
  if (activeProjectId) {
    return <ProjectDetail />
  }

  if (activeContactId) {
    return <ContactDetail />
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tab bar */}
      <nav style={{ display: 'flex', gap: 4, marginBottom: 28, padding: 4, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
        {CRM_TABS.map((tab) => {
          const isActive = activeCRMView === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setCRMView(tab.id)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                padding: '8px 0',
                cursor: 'pointer',
                position: 'relative',
                fontSize: 11,
                fontFamily: 'Inter, sans-serif',
                fontWeight: isActive ? 500 : 400,
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                transition: 'color 150ms ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                borderRadius: 8,
                zIndex: 1
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="crm-tab-bg"
                  style={{
                    position: 'absolute',
                    inset: 1,
                    background: 'var(--bg)',
                    borderRadius: 8,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
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

      {/* Tab content */}
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={activeCRMView}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          style={{ flex: 1 }}
        >
          {activeCRMView === 'dashboard' && <CRMDashboard />}
          {activeCRMView === 'projects' && <ProjectsList />}
          {activeCRMView === 'contacts' && <ContactList />}
          {activeCRMView === 'actions' && <OutreachQueue />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
