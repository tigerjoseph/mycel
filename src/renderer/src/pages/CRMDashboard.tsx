import { useEffect, useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { spring } from '../styles/animation'
import { useUIStore } from '../store/ui'
import { useContactsStore } from '../store/contacts'

interface ProjectWithContact {
  id: string
  contactId: string
  contactName: string
  name: string
  stage: string
  createdAt: number
  updatedAt: number
}

export function CRMDashboard(): React.JSX.Element {
  const setActiveProjectId = useUIStore((s) => s.setActiveProjectId)
  const setActiveContactId = useUIStore((s) => s.setActiveContactId)
  const setCRMView = useUIStore((s) => s.setCRMView)
  const contacts = useContactsStore((s) => s.contacts)

  const [projects, setProjects] = useState<ProjectWithContact[]>([])

  useEffect(() => {
    window.mycel.getAllProjects().then((p) => setProjects(p as ProjectWithContact[])).catch(() => {})
  }, [])

  // Total contacts + new this month
  const totalContacts = contacts.length
  const contactsThisMonth = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    return contacts.filter((c) => c.createdAt >= monthStart).length
  }, [contacts])

  // Follow-up: contacts never contacted or last contacted > 30 days ago
  const followUpContacts = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    return [...contacts]
      .filter((c) => c.lastContactedAt === null || c.lastContactedAt < thirtyDaysAgo)
      .sort((a, b) => (a.lastContactedAt ?? 0) - (b.lastContactedAt ?? 0))
  }, [contacts])

  // Active pipeline: projects not in Won or Lost
  const activePipeline = useMemo(
    () => projects.filter((p) => p.stage !== 'Won' && p.stage !== 'Lost'),
    [projects]
  )

  // Won this month
  const wonThisMonth = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime()
    return projects.filter(
      (p) => p.stage === 'Won' && p.updatedAt >= monthStart && p.updatedAt <= monthEnd
    )
  }, [projects])

  // Pipeline count and lost count for current month (secondary metrics on Won card)
  const pipelineCount = activePipeline.length
  const lostThisMonth = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime()
    return projects.filter(
      (p) => p.stage === 'Lost' && p.updatedAt >= monthStart && p.updatedAt <= monthEnd
    ).length
  }, [projects])

  const cardStyle: React.CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 24,
    background: 'var(--surface)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
    cursor: 'pointer',
    textAlign: 'left' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 14,
    minHeight: 180
  }

  const cardTitleStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    margin: 0
  }

  const heroStyle: React.CSSProperties = {
    fontFamily: 'Lora, serif',
    fontSize: 36,
    fontWeight: 600,
    color: 'var(--text)',
    lineHeight: 1.1
  }

  const secondaryTextStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
    color: 'var(--text-muted)'
  }

  const listItemStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontSize: 12,
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    lineHeight: 1.6
  }

  const stageBadgeStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontSize: 10,
    color: 'var(--text-muted)',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '1px 6px',
    flexShrink: 0
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 0 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%' }}>

      {/* Total Contacts */}
      <motion.button
        onClick={() => setCRMView('contacts')}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0 }}
        whileHover={{ scale: 1.02, y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        whileTap={{ scale: 0.98 }}
        style={cardStyle}
      >
        <h3 style={cardTitleStyle}>Total Contacts</h3>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={heroStyle}>{totalContacts}</span>
          <span style={{ ...secondaryTextStyle, marginTop: 6 }}>
            {contactsThisMonth > 0 ? `+${contactsThisMonth} this month` : 'No new contacts this month'}
          </span>
        </div>
      </motion.button>

      {/* Follow Up */}
      <motion.button
        onClick={() => setCRMView('actions')}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.05 }}
        whileHover={{ scale: 1.02, y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        whileTap={{ scale: 0.98 }}
        style={cardStyle}
      >
        <h3 style={cardTitleStyle}>Follow Up</h3>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{
            ...heroStyle,
            color: followUpContacts.length > 0 ? 'var(--accent)' : 'var(--text)'
          }}>
            {followUpContacts.length}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 6 }}>
            {followUpContacts.length === 0 ? (
              <span style={{ ...secondaryTextStyle, fontStyle: 'italic' }}>All caught up</span>
            ) : (
              followUpContacts.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={(e) => { e.stopPropagation(); setActiveContactId(c.id) }}
                >
                  <span style={listItemStyle}>{c.name || 'Untitled'}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.button>

      {/* Active Pipeline */}
      <motion.button
        onClick={() => setCRMView('projects')}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.1 }}
        whileHover={{ scale: 1.02, y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        whileTap={{ scale: 0.98 }}
        style={cardStyle}
      >
        <h3 style={cardTitleStyle}>Active Pipeline</h3>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={heroStyle}>{activePipeline.length}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 6 }}>
            {activePipeline.length === 0 ? (
              <span style={{ ...secondaryTextStyle, fontStyle: 'italic' }}>No active projects</span>
            ) : (
              activePipeline.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                  onClick={(e) => { e.stopPropagation(); setActiveProjectId(p.id) }}
                >
                  <span style={listItemStyle}>{p.name || 'Untitled'}</span>
                  <span style={stageBadgeStyle}>{p.stage}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.button>

      {/* Won This Month */}
      <motion.button
        onClick={() => setCRMView('projects')}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.15 }}
        whileHover={{ scale: 1.02, y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        whileTap={{ scale: 0.98 }}
        style={cardStyle}
      >
        <h3 style={cardTitleStyle}>Won This Month</h3>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ ...heroStyle, color: 'var(--accent)' }}>{wonThisMonth.length}</span>
          <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {pipelineCount}
              </span>
              <span style={secondaryTextStyle}>pipeline</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: 'Lora, serif', fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>
                {lostThisMonth}
              </span>
              <span style={secondaryTextStyle}>lost</span>
            </div>
          </div>
        </div>
      </motion.button>
    </div>
    </div>
  )
}
