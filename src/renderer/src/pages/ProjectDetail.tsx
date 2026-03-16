import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'motion/react'
import { Plus, Check, ArrowLeft, Trash2 } from 'lucide-react'
import { fadeUp, spring } from '../styles/animation'
import { useUIStore } from '../store/ui'
import type { Project, Milestone } from '@shared/types'

const STAGES = ['Lead', 'Active', 'Closing', 'Won', 'Lost'] as const

export function ProjectDetail(): React.JSX.Element {
  const activeProjectId = useUIStore((s) => s.activeProjectId)
  const setActiveProjectId = useUIStore((s) => s.setActiveProjectId)

  const [project, setProject] = useState<Project | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Contact name for back button
  const [contactName, setContactName] = useState('')

  // Inline add-milestone state
  const [addingMilestone, setAddingMilestone] = useState(false)
  const [newMilestoneText, setNewMilestoneText] = useState('')
  const milestoneInputRef = useRef<HTMLInputElement>(null)

  // Fetch project directly by ID
  useEffect(() => {
    if (!activeProjectId) return
    window.mycel.getProject(activeProjectId).then((p) => {
      if (p) {
        setProject(p)
        setNameValue(p.name)
        if (!p.name) {
          setEditingName(true)
          setTimeout(() => nameInputRef.current?.focus(), 50)
        }
      }
    }).catch(() => {})
    window.mycel.getMilestones(activeProjectId).then(setMilestones).catch(() => {})
  }, [activeProjectId])

  // Fetch contact name for back button label
  useEffect(() => {
    if (project?.contactId) {
      window.mycel.getContact(project.contactId).then((c) => {
        if (c) setContactName(c.name || '')
      }).catch(() => {})
    }
  }, [project?.contactId])

  const handleBack = (): void => {
    setActiveProjectId(null)
  }

  const handleDelete = async (): Promise<void> => {
    if (!project) return
    const ok = window.confirm(`Delete "${project.name || 'Untitled project'}"? This cannot be undone.`)
    if (!ok) return
    await window.mycel.deleteProject(project.id)
    setActiveProjectId(null)
  }

  const saveName = useCallback(async () => {
    if (!project) return
    setEditingName(false)
    if (nameValue !== project.name) {
      const updated = await window.mycel.upsertProject({
        ...project,
        name: nameValue,
        updatedAt: Date.now()
      })
      setProject(updated)
    }
  }, [project, nameValue])

  const setStage = useCallback(
    async (stage: string) => {
      if (!project) return
      const updated = await window.mycel.upsertProject({
        ...project,
        stage,
        updatedAt: Date.now()
      })
      setProject(updated)
    },
    [project]
  )

  const toggleMilestone = useCallback(
    async (milestone: Milestone) => {
      const updated = await window.mycel.upsertMilestone({
        ...milestone,
        done: !milestone.done
      })
      setMilestones((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m))
      )
    },
    []
  )

  const commitNewMilestone = useCallback(async () => {
    const text = newMilestoneText.trim()
    setAddingMilestone(false)
    setNewMilestoneText('')
    if (!text || !activeProjectId) return
    const milestone = await window.mycel.upsertMilestone({
      id: crypto.randomUUID(),
      projectId: activeProjectId,
      text,
      done: false,
      position: milestones.length,
      createdAt: Date.now()
    })
    setMilestones((prev) => [...prev, milestone])
  }, [activeProjectId, milestones.length, newMilestoneText])

  if (!project) {
    return (
      <motion.div
        style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: '32px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 320
        }}
        {...fadeUp}
      >
        <span style={{ fontFamily: 'Lora, serif', color: 'var(--text-muted)' }}>
          Loading project...
        </span>
      </motion.div>
    )
  }

  const sortedMilestones = [...milestones].sort((a, b) => a.position - b.position)

  return (
    <motion.div
      style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}
      {...fadeUp}
    >
      {/* Header row: back + delete */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0 20px 0' }}>
        <button
          onClick={handleBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: 'Inter, sans-serif',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: 0,
            transition: 'color 150ms ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <ArrowLeft size={14} />
          {contactName || 'Contact'}
        </button>
        <button
          onClick={handleDelete}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: 4,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 150ms ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#e55' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
          title="Delete project"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Project name */}
      <div style={{ marginBottom: 28 }}>
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName()
            }}
            placeholder="Project name"
            style={{
              fontFamily: 'Lora, serif',
              fontSize: 28,
              fontWeight: 600,
              color: 'var(--text)',
              background: 'none',
              border: 'none',
              outline: 'none',
              padding: 0,
              margin: 0,
              width: '100%',
              lineHeight: 1.2
            }}
          />
        ) : (
          <h1
            onClick={() => {
              setEditingName(true)
              setTimeout(() => nameInputRef.current?.focus(), 50)
            }}
            style={{
              fontFamily: 'Lora, serif',
              fontSize: 28,
              fontWeight: 600,
              color: 'var(--text)',
              margin: 0,
              cursor: 'text',
              lineHeight: 1.2
            }}
          >
            {project.name || 'Untitled project'}
          </h1>
        )}
      </div>

      {/* Stage pipeline */}
      <div style={{ marginBottom: 36 }}>
        <h2
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: '0 0 16px 0'
          }}
        >
          Stage
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative' }}>
          {/* Connecting line */}
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              right: 8,
              height: 1,
              background: 'var(--border)'
            }}
          />
          {STAGES.map((stage) => {
            const isActive = project.stage === stage
            return (
              <button
                key={stage}
                onClick={() => setStage(stage)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  flex: 1,
                  position: 'relative',
                  padding: 0
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: isActive ? 'none' : '2px solid var(--border)',
                    background: isActive ? 'var(--accent)' : 'var(--bg)',
                    position: 'relative',
                    transition: 'border-color 150ms ease'
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="stage-dot"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        background: 'var(--accent)'
                      }}
                      transition={spring}
                    />
                  )}
                </div>
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 11,
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? 'var(--text)' : 'var(--text-muted)',
                    transition: 'color 150ms ease'
                  }}
                >
                  {stage}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Milestones */}
      <div>
        <h2
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: '0 0 12px 0',
            paddingBottom: 8,
            borderBottom: '1px solid var(--border)'
          }}
        >
          Milestones
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sortedMilestones.map((ms) => (
            <button
              key={ms.id}
              onClick={() => toggleMilestone(ms)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 0',
                textAlign: 'left',
                width: '100%'
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: ms.done ? 'none' : '1.5px solid var(--border)',
                  background: ms.done ? 'var(--accent)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 150ms ease'
                }}
              >
                {ms.done && <Check size={12} style={{ color: 'var(--bg)' }} />}
              </div>
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 14,
                  color: ms.done ? 'var(--text-muted)' : 'var(--text)',
                  textDecoration: ms.done ? 'line-through' : 'none',
                  transition: 'color 150ms ease'
                }}
              >
                {ms.text}
              </span>
            </button>
          ))}
        </div>

        {/* Inline add-milestone */}
        {addingMilestone ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                border: '1.5px solid var(--border)',
                background: 'transparent',
                flexShrink: 0
              }}
            />
            <input
              ref={milestoneInputRef}
              autoFocus
              value={newMilestoneText}
              onChange={(e) => setNewMilestoneText(e.target.value)}
              onBlur={commitNewMilestone}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitNewMilestone()
                if (e.key === 'Escape') { setAddingMilestone(false); setNewMilestoneText('') }
              }}
              placeholder="Milestone..."
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
                color: 'var(--text)',
                background: 'none',
                border: 'none',
                outline: 'none',
                padding: 0,
                flex: 1
              }}
            />
          </div>
        ) : (
          <button
            onClick={() => {
              setAddingMilestone(true)
              setTimeout(() => milestoneInputRef.current?.focus(), 50)
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'Inter, sans-serif',
              color: 'var(--text-muted)',
              padding: '12px 0 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'color 150ms ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <Plus size={13} />
            add milestone
          </button>
        )}
      </div>
    </motion.div>
  )
}
