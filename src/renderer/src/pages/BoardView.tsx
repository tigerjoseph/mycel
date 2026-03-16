import { useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import {
  DndContext,
  closestCenter,
  useDraggable,
  useDroppable
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { fadeUp } from '../styles/animation'
import { useUIStore } from '../store/ui'
import type { Project, Contact } from '@shared/types'

const STAGES = ['Lead', 'Active', 'Closing', 'Won', 'Lost'] as const
type Stage = (typeof STAGES)[number]

interface BoardProject extends Project {
  contactName: string
}

// --- Draggable card ---

function DraggableCard({
  project,
  onClick
}: {
  project: BoardProject
  onClick: () => void
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
    data: { project }
  })

  const style: React.CSSProperties = {
    padding: '10px 12px',
    backgroundColor: 'var(--bg)',
    borderRadius: 6,
    border: '1px solid var(--border)',
    cursor: 'grab',
    opacity: isDragging ? 0.5 : 1,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition: isDragging ? undefined : 'box-shadow 150ms ease',
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
    >
      <div
        style={{
          fontFamily: 'Lora, serif',
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--text)',
          marginBottom: 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {project.name || 'Untitled'}
      </div>
      <div
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
          color: 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {project.contactName || 'No contact'}
      </div>
    </div>
  )
}

// --- Droppable column ---

function DroppableColumn({
  stage,
  projects,
  onCardClick
}: {
  stage: Stage
  projects: BoardProject[]
  onCardClick: (project: BoardProject) => void
}): React.JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        backgroundColor: isOver ? 'var(--bg)' : 'var(--surface)',
        borderRadius: 8,
        padding: 12,
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'background 150ms ease'
      }}
    >
      <div
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--text-muted)',
          marginBottom: 4
        }}
      >
        {stage}
        {projects.length > 0 && (
          <span style={{ marginLeft: 6, fontWeight: 400 }}>
            {projects.length}
          </span>
        )}
      </div>

      {projects.map((project) => (
        <DraggableCard
          key={project.id}
          project={project}
          onClick={() => onCardClick(project)}
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

  // Fetch all contacts and their projects
  useEffect(() => {
    let cancelled = false

    async function fetchAll(): Promise<void> {
      try {
        const contacts: Contact[] = await window.mycel.getContacts()
        const allProjects: BoardProject[] = []

        const projectPromises = contacts.map(async (contact) => {
          const contactProjects: Project[] = await window.mycel.getProjects(contact.id)
          return contactProjects.map((p) => ({
            ...p,
            contactName: contact.name || 'Untitled'
          }))
        })

        const results = await Promise.all(projectPromises)
        for (const batch of results) {
          allProjects.push(...batch)
        }

        if (!cancelled) {
          setProjects(allProjects)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAll()
    return () => {
      cancelled = true
    }
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over) return

      const newStage = over.id as string
      const projectId = active.id as string
      const project = projects.find((p) => p.id === projectId)

      if (!project || project.stage === newStage) return

      // Optimistic update
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
        // Revert on failure
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
            fontFamily: 'Inter, sans-serif',
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
            fontFamily: 'Lora, serif',
            fontSize: 18,
            color: 'var(--text-muted)'
          }}
        >
          No projects yet
        </span>
      </motion.div>
    )
  }

  return (
    <motion.div
      style={{
        display: 'flex',
        gap: 12,
        padding: '16px 24px',
        width: '100%',
        minHeight: 320,
        overflowX: 'auto'
      }}
      {...fadeUp}
    >
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {STAGES.map((stage) => (
          <DroppableColumn
            key={stage}
            stage={stage}
            projects={projects.filter(
              (p) => p.stage === stage
            )}
            onCardClick={handleCardClick}
          />
        ))}
      </DndContext>
    </motion.div>
  )
}
