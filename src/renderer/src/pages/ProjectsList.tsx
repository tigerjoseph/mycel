import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus } from 'lucide-react'
import { fadeUp } from '../styles/animation'
import { useUIStore } from '../store/ui'
import { NewProjectDialog } from '../components/NewProjectDialog'
import { ContextMenu } from '../components/ContextMenu'
import type { Project } from '@shared/types'
import {
  PIPELINE_STAGES,
  REVENUE_PERIODS,
  formatUsdCompact,
  formatUsdFromCents,
  sumClosedValueCents,
  sumProjectValueCents,
  type RevenuePeriod
} from '@shared/money'

interface ProjectWithContact {
  id: string
  contactId: string
  contactName: string
  name: string
  stage: string
  valueCents: number | null
  closedAt: number | null
  createdAt: number
  updatedAt: number
}

const STAGE_ORDER = ['Lead', 'Active', 'Closing', 'Won', 'Lost']

export function ProjectsList(): React.JSX.Element {
  const setActiveProjectId = useUIStore((s) => s.setActiveProjectId)

  const [projects, setProjects] = useState<ProjectWithContact[]>([])
  const [stageFilter, setStageFilter] = useState<string | null>(null)
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>('ytd')
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; projectId: string } | null>(null)

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

  const closedCents = useMemo(
    () => sumClosedValueCents(projects, revenuePeriod),
    [projects, revenuePeriod]
  )
  const pipelineCents = useMemo(
    () => sumProjectValueCents(projects, PIPELINE_STAGES),
    [projects]
  )

  const handleProjectClick = (project: ProjectWithContact): void => {
    setActiveProjectId(project.id)
  }

  const handleDeleteProject = useCallback(async (project: ProjectWithContact) => {
    if (!window.confirm(`Delete "${project.name || 'Untitled project'}"?`)) return
    await window.mycel.deleteProject(project.id)
    loadProjects()
  }, [])

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

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {REVENUE_PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setRevenuePeriod(p.id)}
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 11,
              fontWeight: 500,
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: revenuePeriod === p.id ? 'var(--text)' : 'transparent',
              color: revenuePeriod === p.id ? 'var(--bg)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'background 150ms ease, color 150ms ease'
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
          marginBottom: 20,
          padding: '14px 16px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--surface)'
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: 4
            }}
          >
            Closed
          </div>
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--text)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.2
            }}
          >
            {formatUsdFromCents(closedCents)}
          </div>
        </div>
        <div style={{ width: 1, background: 'var(--border)', margin: '2px 8px' }} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: 4
            }}
          >
            Pipeline
          </div>
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--text)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.2
            }}
          >
            {formatUsdFromCents(pipelineCents)}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 10,
              color: 'var(--text-muted)',
              marginTop: 4
            }}
          >
            open now
          </div>
        </div>
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
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu({ x: e.clientX, y: e.clientY, projectId: project.id })
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderBottom: '1px solid var(--border)',
              borderRadius: 8,
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 16 }}>
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 13,
                  fontWeight: project.valueCents ? 500 : 400,
                  color: project.valueCents ? 'var(--text)' : 'var(--text-muted)',
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap'
                }}
              >
                {project.valueCents && project.valueCents > 0
                  ? formatUsdCompact(project.valueCents)
                  : '—'}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 11,
                  color: project.stage === 'Won' ? 'var(--accent)' : project.stage === 'Lost' ? 'var(--text-muted)' : 'var(--text)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '2px 8px',
                  whiteSpace: 'nowrap'
                }}
              >
                {project.stage}
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {contextMenu && (() => {
          const project = projects.find((p) => p.id === contextMenu.projectId)
          if (!project) return null
          return (
            <ContextMenu
              key="project-menu"
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={() => setContextMenu(null)}
              items={[
                {
                  label: 'Delete project',
                  danger: true,
                  onClick: () => { void handleDeleteProject(project) }
                }
              ]}
            />
          )
        })()}
      </AnimatePresence>
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
