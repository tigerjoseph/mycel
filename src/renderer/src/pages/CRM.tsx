import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useUIStore } from '../store/ui'
import { useContactsStore } from '../store/contacts'
import { ContactList } from './ContactList'
import { ContactDetail } from './ContactDetail'
import { ProjectDetail } from './ProjectDetail'
import { BoardView } from './BoardView'
import { pageEnter } from '../styles/animation'

export function CRM(): React.JSX.Element {
  const activeCRMView = useUIStore((s) => s.activeCRMView)
  const activeContactId = useUIStore((s) => s.activeContactId)
  const activeProjectId = useUIStore((s) => s.activeProjectId)

  const fetchContacts = useContactsStore((s) => s.fetch)

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const viewKey = activeProjectId
    ? `project-${activeProjectId}`
    : activeContactId
      ? `contact-${activeContactId}`
      : activeCRMView

  return (
    <div
      style={{
        width: '100%',
        padding: '20px 16px 24px',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={viewKey}
          initial={pageEnter.initial}
          animate={pageEnter.animate}
          exit={pageEnter.exit}
          transition={pageEnter.transition}
          style={{ flex: 1, overflow: 'hidden' }}
        >
          {activeProjectId ? (
            <ProjectDetail />
          ) : activeContactId ? (
            <ContactDetail />
          ) : activeCRMView === 'projects' ? (
            <BoardView />
          ) : (
            <ContactList />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
