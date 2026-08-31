import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileText, GripVertical, Plus } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { ScriptLightbox } from '../components/ScriptLightbox'
import { CONTENT_STAGES, getContentStageColor, isContentStage } from '@shared/contentScripts'
import type { ContentScript } from '@shared/types'

type Stage = (typeof CONTENT_STAGES)[number]

function scriptSummary(script: ContentScript): ContentScript {
  return {
    id: script.id,
    title: script.title,
    stage: script.stage,
    position: script.position,
    projectId: script.projectId,
    createdAt: script.createdAt,
    updatedAt: script.updatedAt
  }
}

const DraggableCard = memo(function DraggableCard({
  script,
  onClick
}: {
  script: ContentScript
  onClick: (id: string) => void
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: script.id,
    data: { scriptId: script.id }
  })

  return (
    <div
      ref={setNodeRef}
      className="mycel-card"
      style={{
        padding: '8px 9px',
        backgroundColor: 'var(--bg)',
        borderRadius: 6,
        border: '1px solid var(--border)',
        cursor: 'pointer',
        opacity: isDragging ? 0.55 : 1,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition: isDragging ? undefined : 'box-shadow 150ms ease',
        boxShadow: isDragging ? 'var(--shadow-md)' : undefined,
        zIndex: isDragging ? 10 : undefined,
        position: isDragging ? 'relative' : undefined,
        willChange: isDragging ? 'transform' : undefined
      }}
      onClick={() => onClick(script.id)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, minWidth: 0 }}>
        <button
          type="button"
          aria-label="Drag to reorder"
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
          style={{
            flexShrink: 0,
            marginTop: 1,
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: isDragging ? 'grabbing' : 'grab',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            touchAction: 'none'
          }}
        >
          <GripVertical size={12} />
        </button>
        <FileText size={13} style={{ flexShrink: 0, marginTop: 1, color: 'var(--text-muted)' }} />
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.35,
            letterSpacing: '-0.01em'
          }}
        >
          {script.title || 'Untitled script'}
        </span>
      </div>
    </div>
  )
})

const DroppableColumn = memo(function DroppableColumn({
  stage,
  scripts,
  onCardClick,
  onNew
}: {
  stage: Stage
  scripts: ContentScript[]
  onCardClick: (id: string) => void
  onNew: (stage: Stage) => void
}): React.JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const columnColor = getContentStageColor(stage)

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
        minHeight: 200,
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
          padding: '0 2px',
          display: 'flex',
          alignItems: 'center',
          gap: 5
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: columnColor,
            flexShrink: 0
          }}
        />
        {stage}
        {scripts.length > 0 && (
          <span style={{ fontWeight: 500, opacity: 0.75 }}>{scripts.length}</span>
        )}
      </div>

      {scripts.map((script) => (
        <DraggableCard key={script.id} script={script} onClick={onCardClick} />
      ))}

      <button
        onClick={() => onNew(stage)}
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '6px 8px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontFamily: 'var(--font-ui)',
          fontSize: 11,
          color: 'var(--text-muted)',
          borderRadius: 6,
          transition: 'color 150ms ease, background 150ms ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text)'
          e.currentTarget.style.background = 'var(--bg)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-muted)'
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <Plus size={12} />
        New script
      </button>
    </div>
  )
})

export function ContentTracking(): React.JSX.Element {
  const [scripts, setScripts] = useState<ContentScript[]>([])
  const [loading, setLoading] = useState(true)
  const [openScript, setOpenScript] = useState<ContentScript | null>(null)
  const scriptsRef = useRef(scripts)
  scriptsRef.current = scripts

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  useEffect(() => {
    let cancelled = false
    void window.mycel.getContentScripts().then((rows) => {
      if (!cancelled) {
        setScripts(rows as ContentScript[])
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const scriptsByStage = useMemo(() => {
    const grouped = Object.fromEntries(CONTENT_STAGES.map((stage) => [stage, [] as ContentScript[]])) as Record<
      Stage,
      ContentScript[]
    >
    for (const script of scripts) {
      if (isContentStage(script.stage)) grouped[script.stage].push(script)
    }
    return grouped
  }, [scripts])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const newStage = over.id as string
    if (!isContentStage(newStage)) return

    const scriptId = active.id as string
    const script = scriptsRef.current.find((s) => s.id === scriptId)
    if (!script || script.stage === newStage) return

    const updated = { ...script, stage: newStage, updatedAt: Date.now() }
    setScripts((prev) => prev.map((s) => (s.id === scriptId ? updated : s)))

    try {
      await window.mycel.upsertContentScript(updated)
    } catch {
      setScripts((prev) => prev.map((s) => (s.id === scriptId ? script : s)))
    }
  }, [])

  const handleNew = useCallback(async (stage: Stage) => {
    const now = Date.now()
    const position = scriptsRef.current.filter((s) => s.stage === stage).length
    const created = (await window.mycel.upsertContentScript({
      title: '',
      body: '<p></p>',
      stage,
      position,
      projectId: null,
      createdAt: now,
      updatedAt: now
    })) as ContentScript
    setScripts((prev) => [...prev, scriptSummary(created)])
    setOpenScript(created)
  }, [])

  const handleCardClick = useCallback(async (id: string) => {
    const full = (await window.mycel.getContentScript(id)) as ContentScript | null
    if (full) setOpenScript(full)
  }, [])

  const handleSaved = useCallback((saved: ContentScript) => {
    const summary = scriptSummary(saved)
    setScripts((prev) => {
      const exists = prev.some((s) => s.id === summary.id)
      if (exists) return prev.map((s) => (s.id === summary.id ? summary : s))
      return [...prev, summary]
    })
    setOpenScript((cur) => (cur?.id === saved.id ? saved : cur))
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    await window.mycel.deleteContentScript(id)
    setScripts((prev) => prev.filter((s) => s.id !== id))
    setOpenScript(null)
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)' }}>Loading…</span>
      </div>
    )
  }

  return (
    <>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '4px 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--font-heading)',
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--text)'
              }}
            >
              Content tracking
            </h2>
            <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>
              Short-form scripts — same editor as docs, opens in a compact window.
            </p>
          </div>
          <button
            onClick={() => void handleNew('Pre-production')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'var(--font-ui)',
              fontWeight: 600,
              color: 'var(--text)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Plus size={13} />
            New script
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0, overflowX: 'auto', paddingBottom: 8 }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {CONTENT_STAGES.map((stage) => (
              <DroppableColumn
                key={stage}
                stage={stage}
                scripts={scriptsByStage[stage]}
                onCardClick={handleCardClick}
                onNew={handleNew}
              />
            ))}
          </DndContext>
        </div>
      </div>

      {openScript && (
        <ScriptLightbox
          key={openScript.id}
          script={openScript}
          onClose={() => setOpenScript(null)}
          onSaved={handleSaved}
          onDelete={() => void handleDelete(openScript.id)}
        />
      )}
    </>
  )
}
