import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FileText, Plus } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  useDraggable,
  useDroppable
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { fadeUp } from '../styles/animation'
import { ScriptLightbox } from '../components/ScriptLightbox'
import { CONTENT_STAGES, getContentStageColor, isContentStage } from '@shared/contentScripts'
import type { ContentScript } from '@shared/types'

type Stage = (typeof CONTENT_STAGES)[number]

function DraggableCard({
  script,
  onClick
}: {
  script: ContentScript
  onClick: () => void
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: script.id,
    data: { script }
  })
  const [hovered, setHovered] = useState(false)

  return (
    <div
      ref={setNodeRef}
      style={{
        padding: '8px 9px',
        backgroundColor: 'var(--bg)',
        borderRadius: 6,
        border: '1px solid var(--border)',
        cursor: 'grab',
        opacity: isDragging ? 0.55 : 1,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition: isDragging ? undefined : 'box-shadow 150ms ease',
        boxShadow: isDragging ? 'var(--shadow-md)' : hovered ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
        zIndex: isDragging ? 10 : undefined,
        position: isDragging ? 'relative' : undefined
      }}
      {...listeners}
      {...attributes}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, minWidth: 0 }}>
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
}

function DroppableColumn({
  stage,
  scripts,
  onCardClick,
  onNew
}: {
  stage: Stage
  scripts: ContentScript[]
  onCardClick: (script: ContentScript) => void
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
        <DraggableCard key={script.id} script={script} onClick={() => onCardClick(script)} />
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
}

export function ContentTracking(): React.JSX.Element {
  const [scripts, setScripts] = useState<ContentScript[]>([])
  const [loading, setLoading] = useState(true)
  const [openScript, setOpenScript] = useState<ContentScript | null>(null)

  const load = useCallback(async () => {
    try {
      const rows = (await window.mycel.getContentScripts()) as ContentScript[]
      setScripts(rows)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over) return

      const newStage = over.id as string
      if (!isContentStage(newStage)) return

      const scriptId = active.id as string
      const script = scripts.find((s) => s.id === scriptId)
      if (!script || script.stage === newStage) return

      const updated = { ...script, stage: newStage, updatedAt: Date.now() }
      setScripts((prev) => prev.map((s) => (s.id === scriptId ? updated : s)))

      try {
        await window.mycel.upsertContentScript(updated)
      } catch {
        setScripts((prev) => prev.map((s) => (s.id === scriptId ? script : s)))
      }
    },
    [scripts]
  )

  const handleNew = useCallback(async (stage: Stage) => {
    const now = Date.now()
    const created = (await window.mycel.upsertContentScript({
      title: '',
      body: '<p></p>',
      stage,
      position: scripts.filter((s) => s.stage === stage).length,
      projectId: null,
      createdAt: now,
      updatedAt: now
    })) as ContentScript
    setScripts((prev) => [...prev, created])
    setOpenScript(created)
  }, [scripts])

  const handleSaved = useCallback((saved: ContentScript) => {
    setScripts((prev) => {
      const exists = prev.some((s) => s.id === saved.id)
      if (exists) return prev.map((s) => (s.id === saved.id ? saved : s))
      return [...prev, saved]
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
      <motion.div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }} {...fadeUp}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)' }}>Loading…</span>
      </motion.div>
    )
  }

  return (
    <>
      <motion.div {...fadeUp} style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '4px 20px 24px' }}>
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
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {CONTENT_STAGES.map((stage) => (
              <DroppableColumn
                key={stage}
                stage={stage}
                scripts={scripts.filter((s) => s.stage === stage)}
                onCardClick={setOpenScript}
                onNew={handleNew}
              />
            ))}
          </DndContext>
        </div>
      </motion.div>

      <AnimatePresence>
        {openScript && (
          <ScriptLightbox
            key={openScript.id}
            script={openScript}
            onClose={() => setOpenScript(null)}
            onSaved={handleSaved}
            onDelete={() => void handleDelete(openScript.id)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
