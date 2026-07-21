import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  useDraggable,
  useDroppable
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
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
import { ALL_STAGES, getStageColumnColor, getStageDisplayLabel } from '@shared/stages'
import { followUpAccentColor, getProjectFollowUpHint, getEffectiveFollowUp } from '@shared/followUp'

const STAGES = ALL_STAGES
type Stage = (typeof STAGES)[number]

interface BoardProject extends Project {
  contactName: string
  lastContactedAt: number | null
}

// --- Draggable card ---

function DraggableCard({
  project,
  onClick,
  onContextMenu
}: {
  project: BoardProject
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
    data: { project }
  })

  const followUp = getEffectiveFollowUp(project, project.lastContactedAt, project.followUpManual)
  const [hovered, setHovered] = useState(false)

  const style: React.CSSProperties = {
    padding: '7px 8px',
    backgroundColor: 'var(--bg)',
    borderRadius: 6,
    border: '1px solid var(--border)',
    borderLeft: followUp ? `3px solid ${followUpAccentColor(followUp.urgency)}` : '1px solid var(--border)',
    cursor: 'grab',
    opacity: isDragging ? 0.55 : 1,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition: isDragging ? undefined : 'box-shadow 150ms ease, border-color 150ms ease',
    boxShadow: isDragging ? 'var(--shadow-md)' : hovered ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? ('relative' as const) : undefined
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, marginBottom: 1 }}>
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
            letterSpacing: '-0.01em'
          }}
        >
          {project.name || 'Untitled'}
        </span>
        {followUp && (
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 8,
              fontWeight: 600,
              color: followUpAccentColor(followUp.urgency),
              background: followUp.urgency === 'urgent' ? 'var(--lost-bg)' : 'rgba(180, 83, 9, 0.08)',
              border: `1px solid ${followUpAccentColor(followUp.urgency)}`,
              borderRadius: 4,
              padding: '1px 4px',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            Follow up
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 10,
          color: 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {project.contactName || 'No contact'}
        {project.valueCents != null && project.valueCents > 0 && (
          <span style={{ marginLeft: 6, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            · {formatUsdCompact(project.valueCents)}
          </span>
        )}
      </div>
    </div>
  )
}

// --- Droppable column ---

function DroppableColumn({
  stage,
  projects,
  onCardClick,
  onCardContextMenu
}: {
  stage: Stage
  projects: BoardProject[]
  onCardClick: (project: BoardProject) => void
  onCardContextMenu: (e: React.MouseEvent, project: BoardProject) => void
}): React.JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const columnColor = getStageColumnColor(stage)

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: '1 1 0',
        minWidth: 0,
        backgroundColor: isOver ? 'var(--bg)' : 'var(--surface)',
        borderRadius: 8,
        border: '1px solid var(--border)',
        borderTop: `2px solid ${columnColor}`,
        padding: 8,
        minHeight: 160,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        transition: 'background 150ms ease, box-shadow 150ms ease',
        boxShadow: isOver ? 'var(--shadow-md)' : 'var(--shadow-sm)'
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: columnColor,
          marginBottom: 2,
          padding: '0 2px'
        }}
      >
        {getStageDisplayLabel(stage)}
        {projects.length > 0 && (
          <span style={{ marginLeft: 5, fontWeight: 500, opacity: 0.8 }}>
            {projects.length}
          </span>
        )}
      </div>

      {projects.map((project) => (
        <DraggableCard
          key={project.id}
          project={project}
          onClick={() => onCardClick(project)}
          onContextMenu={(e) => onCardContextMenu(e, project)}
        />
      ))}
    </div>
  )
}

// --- Board View ---

export function BoardView(): React.JSX.Element {
  const setActiveContactId = useUIStore((s) => s.setActiveContactId)
  const setActiveProjectId = useUIStore((s) => s.setActiveProjectId)
  const pushBreadcrumb = useUIStore((s) => s.pushBreadcrumb)

  const [projects, setProjects] = useState<BoardProject[]>([])
  const [loading, setLoading] = useState(true)
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>('ytd')
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; projectId: string } | null>(null)

  const loadProjects = useCallback((): void => {
    window.mycel
      .getAllProjects()
      .then((p) => {
        setProjects(p as BoardProject[])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const closedCents = useMemo(
    () => sumClosedValueCents(projects, revenuePeriod),
    [projects, revenuePeriod]
  )
  const pipelineCents = useMemo(
    () => sumProjectValueCents(projects, PIPELINE_STAGES),
    [projects]
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over) return

      const newStage = over.id as string
      const projectId = active.id as string
      const project = projects.find((p) => p.id === projectId)

      if (!project || project.stage === newStage) return

      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, stage: newStage, updatedAt: Date.now() } : p
        )
      )

      try {
        await window.mycel.upsertProject({
          ...project,
          stage: newStage,
          updatedAt: Date.now()
        })
      } catch {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId ? { ...p, stage: project.stage } : p
          )
        )
      }
    },
    [projects]
  )

  const handleCardClick = useCallback(
    (project: BoardProject) => {
      setActiveContactId(project.contactId)
      setActiveProjectId(project.id)
      pushBreadcrumb({
        label: project.name || 'Project',
        action: () => {
          setActiveProjectId(null)
          setActiveContactId(null)
        }
      })
    },
    [setActiveContactId, setActiveProjectId, pushBreadcrumb]
  )

  const handleCardContextMenu = useCallback((e: React.MouseEvent, project: BoardProject) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, projectId: project.id })
  }, [])

  const handleToggleFollowUp = useCallback(async (project: BoardProject) => {
    const autoHint = getProjectFollowUpHint(project, project.lastContactedAt)
    const currentlyShown =
      project.followUpManual === 'on' || (project.followUpManual !== 'off' && autoHint !== null)

    let nextManual: 'on' | 'off' | null
    if (!currentlyShown) {
      nextManual = 'on'
    } else if (project.followUpManual === 'on') {
      nextManual = null
    } else {
      nextManual = 'off'
    }

    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, followUpManual: nextManual } : p))
    )
    try {
      await window.mycel.upsertProject({ ...project, followUpManual: nextManual })
    } catch {
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, followUpManual: project.followUpManual } : p))
      )
    }
  }, [])

  const handleDeleteProject = useCallback(async (project: BoardProject) => {
    if (!window.confirm(`Delete "${project.name || 'Untitled project'}"?`)) return
    await window.mycel.deleteProject(project.id)
    loadProjects()
  }, [loadProjects])

  if (loading) {
    return (
      <motion.div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 320
        }}
        {...fadeUp}
      >
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            color: 'var(--text-muted)'
          }}
        >
          Loading...
        </span>
      </motion.div>
    )
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            {projects.length} project{projects.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={() => setNewProjectOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: 'var(--font-ui)',
              fontWeight: 600,
              color: 'var(--text)',
              boxShadow: 'var(--shadow-sm)',
              transition: 'box-shadow 150ms ease, background 150ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
            }}
          >
            <Plus size={12} />
            New project
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 14, gap: 8 }}>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
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
              display: 'inline-flex',
              alignItems: 'stretch',
              gap: 0,
              padding: '8px 4px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ minWidth: 108, padding: '0 16px', textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 9,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 2
                }}
              >
                Closed
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--won)',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em'
                }}
              >
                {formatUsdFromCents(closedCents)}
              </div>
            </div>
            <div style={{ width: 1, background: 'var(--border)', margin: '2px 0' }} />
            <div style={{ minWidth: 108, padding: '0 16px', textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 9,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 2
                }}
              >
                Pipeline
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--text)',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em'
                }}
              >
                {formatUsdFromCents(pipelineCents)}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            width: '100%',
            minHeight: 240
          }}
        >
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {STAGES.map((stage) => (
              <DroppableColumn
                key={stage}
                stage={stage}
                projects={projects.filter((p) => p.stage === stage)}
                onCardClick={handleCardClick}
                onCardContextMenu={handleCardContextMenu}
              />
            ))}
          </DndContext>
        </div>
      </motion.div>

      <AnimatePresence>
        {contextMenu && (() => {
          const project = projects.find((p) => p.id === contextMenu.projectId)
          if (!project) return null
          const autoHint = getProjectFollowUpHint(project, project.lastContactedAt)
          const followUpChecked =
            project.followUpManual === 'on' || (project.followUpManual !== 'off' && autoHint !== null)
          return (
            <ContextMenu
              key="board-project-menu"
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={() => setContextMenu(null)}
              items={[
                {
                  label: 'Mark follow up',
                  checked: followUpChecked,
                  onClick: () => { void handleToggleFollowUp(project) }
                },
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
