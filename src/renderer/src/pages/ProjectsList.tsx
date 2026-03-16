import { useEffect, useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { formatDistanceToNow } from 'date-fns'
import { fadeUp } from '../styles/animation'
import { useUIStore } from '../store/ui'

interface ProjectWithContact {
  id: string
  contactId: string
  contactName: string
  name: string
  stage: string
  createdAt: number
  updatedAt: number
}

const STAGE_ORDER = ['Lead', 'Active', 'Closing', 'Won', 'Lost']

export function ProjectsList(): React.JSX.Element {
  const setActiveProjectId = useUIStore((s) => s.setActiveProjectId)

  const [projects, setProjects] = useState<ProjectWithContact[]>([])
  const [stageFilter, setStageFilter] = useState<string | null>(null)

  useEffect(() => {
    window.mycel.getAllProjects().then((p) => setProjects(p as ProjectWithContact[])).catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    if (!stageFilter) return projects
    return projects.filter((p) => p.stage === stageFilter)
  }, [projects, stageFilter])

  const handleProjectClick = (project: ProjectWithContact): void => {
    setActiveProjectId(project.id)
  }

  if (projects.length === 0) {
    return (
      <motion.div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 320,
          gap: 16
        }}
        {...fadeUp}
      >
        <span
          style={{
            fontFamily: 'Lora, serif',
            fontSize: 18,
            color: 'var(--text-muted)'
          }}
        >
          No projects yet
        </span>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            color: 'var(--text-muted)'
          }}
        >
          Create a project from a contact&apos;s page
        </span>
      </motion.div>
    )
  }

  return (
    <motion.div {...fadeUp}>
      {/* Stage filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setStageFilter(null)}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            padding: '4px 12px',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: !stageFilter ? 'var(--accent)' : 'transparent',
            color: !stageFilter ? '#fff' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 150ms ease'
          }}
        >
          All
        </button>
        {STAGE_ORDER.map((stage) => (
          <button
            key={stage}
            onClick={() => setStageFilter(stageFilter === stage ? null : stage)}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              padding: '4px 12px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: stageFilter === stage ? 'var(--accent)' : 'transparent',
              color: stageFilter === stage ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 150ms ease'
            }}
          >
            {stage}
          </button>
        ))}
      </div>

      {/* Project rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filtered.map((project, index) => (
          <motion.button
            key={project.id}
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: index * 0.02 }}
            onClick={() => handleProjectClick(project)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 0',
              borderBottom: '1px solid var(--border)',
              width: '100%',
              textAlign: 'left',
              transition: 'background 100ms ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 14,
                  color: 'var(--text)',
                  fontWeight: 400,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {project.name || 'Untitled project'}
              </span>
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 12,
                  color: 'var(--text-muted)'
                }}
              >
                {project.contactName || 'No contact'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 16 }}>
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 11,
                  color: project.stage === 'Won' ? 'var(--accent)' : project.stage === 'Lost' ? 'var(--text-muted)' : 'var(--text)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '2px 8px'
                }}
              >
                {project.stage}
              </span>
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap'
                }}
              >
                {formatDistanceToNow(project.updatedAt, { addSuffix: true })}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
