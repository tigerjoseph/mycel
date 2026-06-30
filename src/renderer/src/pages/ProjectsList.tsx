import { useEffect, useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { formatDistanceToNow } from 'date-fns'
import { Plus } from 'lucide-react'
import { fadeUp } from '../styles/animation'
import { useUIStore } from '../store/ui'
import { NewProjectDialog } from '../components/NewProjectDialog'
import type { Project } from '@shared/types'

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
  const [newProjectOpen, setNewProjectOpen] = useState(false)

  const loadProjects = (): void => {
    window.mycel.getAllProjects().then((p) => setProjects(p as ProjectWithContact[])).catch(() => {})
  }

  useEffect(() => {
    loadProjects()
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
      <>
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
              fontFamily: 'var(--font-heading)',
              fontSize: 18,
              color: 'var(--text-muted)'
            }}
          >
            No projects yet
          </span>
          <button
            onClick={() => setNewProjectOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--text)',
              color: 'var(--bg)',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'var(--font-ui)',
              fontWeight: 500
            }}
          >
            <Plus size={14} />
            New project
          </button>
        </motion.div>
        <NewProjectDialog
          open={newProjectOpen}
          onClose={() => setNewProjectOpen(false)}
          onCreated={(project: Project) => {
            loadProjects()
            setActiveProjectId(project.id)
          }}
        />
      </>
    )
  }

  return (
    <>
    <motion.div {...fadeUp}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)' }}>
          {filtered.length} project{filtered.length === 1 ? '' : 's'}
        </span>
        <button
          onClick={() => setNewProjectOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'var(--font-ui)',
            fontWeight: 500,
            color: 'var(--text)'
          }}
        >
          <Plus size={13} />
          New project
        </button>
      </div>
      {/* Stage filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setStageFilter(null)}
          style={{
            fontFamily: 'var(--font-ui)',
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
              fontFamily: 'var(--font-ui)',
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
                  fontFamily: 'var(--font-ui)',
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
                  fontFamily: 'var(--font-ui)',
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
                  fontFamily: 'var(--font-ui)',
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
                  fontFamily: 'var(--font-ui)',
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
    <NewProjectDialog
      open={newProjectOpen}
      onClose={() => setNewProjectOpen(false)}
      onCreated={(project: Project) => {
        loadProjects()
        setActiveProjectId(project.id)
      }}
    />
    </>
  )
}
