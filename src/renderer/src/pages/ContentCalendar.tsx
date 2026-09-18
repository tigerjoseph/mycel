import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileText, GripVertical, Plus } from 'lucide-react'
import { nanoid } from 'nanoid'
import { format } from 'date-fns'
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
import { POST_STATUSES, isPostStatus } from '@shared/contentEngine'
import { formatSynthesisSummary } from '@shared/synthesis'
import type { Doc, PostStatus } from '@shared/types'
import { useUIStore } from '../store/ui'
import { openDoc } from '../utils/openDoc'

const STATUS_COLORS: Record<PostStatus, string> = {
  draft: '#9B9A97',
  review: '#529CCA',
  scheduled: '#C77D3A',
  published: '#5AAC72'
}

const STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Draft',
  review: 'Review',
  scheduled: 'Scheduled',
  published: 'Published'
}

function postStatus(post: Doc): PostStatus {
  const status = post.postMeta?.status
  return status && isPostStatus(status) ? status : 'draft'
}

const DraggableCard = memo(function DraggableCard({
  post,
  onClick
}: {
  post: Doc
  onClick: (post: Doc) => void
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: post.id,
    data: { postId: post.id }
  })
  const channel = post.postMeta?.channel

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
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition: isDragging ? undefined : 'box-shadow 150ms ease',
        boxShadow: isDragging ? 'var(--shadow-md)' : undefined,
        zIndex: isDragging ? 10 : undefined,
        position: isDragging ? 'relative' : undefined,
        willChange: isDragging ? 'transform' : undefined
      }}
      onClick={() => onClick(post)}
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
        <div style={{ minWidth: 0, flex: 1 }}>
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
            {post.title || 'Untitled post'}
          </span>
          <div
            style={{
              marginTop: 4,
              fontFamily: 'var(--font-ui)',
              fontSize: 10,
              color: 'var(--text-muted)'
            }}
          >
            {channel ? `${channel} · ` : ''}
            {format(post.updatedAt, 'MMM d')}
          </div>
        </div>
      </div>
    </div>
  )
})

const DroppableColumn = memo(function DroppableColumn({
  status,
  posts,
  onCardClick,
  onNew
}: {
  status: PostStatus
  posts: Doc[]
  onCardClick: (post: Doc) => void
  onNew: (status: PostStatus) => void
}): React.JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const columnColor = STATUS_COLORS[status]

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
        {STATUS_LABELS[status]}
        {posts.length > 0 && <span style={{ fontWeight: 500, opacity: 0.75 }}>{posts.length}</span>}
      </div>

      {posts.map((post) => (
        <DraggableCard key={post.id} post={post} onClick={onCardClick} />
      ))}

      <button
        type="button"
        onClick={() => onNew(status)}
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
        New post
      </button>
    </div>
  )
})

export function ContentCalendar(): React.JSX.Element {
  const setCreateView = useUIStore((s) => s.setCreateView)
  const setDocsView = useUIStore((s) => s.setDocsView)
  const [posts, setPosts] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [synthMessage, setSynthMessage] = useState<string | null>(null)
  const postsRef = useRef(posts)
  postsRef.current = posts

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const load = useCallback(async () => {
    const docs = await window.mycel.getDocs()
    setPosts(docs.filter((d) => d.type === 'post'))
    setLoading(false)
  }, [])

  useEffect(() => {
    load().catch(() => setLoading(false))
    window.mycel
      .getSynthesisStatus()
      .then((status) => {
        if (status.lastResult) setSynthMessage(formatSynthesisSummary(status.lastResult))
      })
      .catch(() => {})
  }, [load])

  const postsByStatus = useMemo(() => {
    const grouped = Object.fromEntries(POST_STATUSES.map((status) => [status, [] as Doc[]])) as Record<
      PostStatus,
      Doc[]
    >
    for (const post of posts) grouped[postStatus(post)].push(post)
    return grouped
  }, [posts])

  const openPost = useCallback(
    (doc: Doc) => {
      setCreateView('docs')
      openDoc(doc, {
        label: 'Calendar',
        action: () => {
          setCreateView('calendar')
          setDocsView('home')
        }
      })
    },
    [setCreateView, setDocsView]
  )

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    let nextStatus = String(over.id)
    if (!isPostStatus(nextStatus)) {
      const overPost = postsRef.current.find((p) => p.id === nextStatus)
      nextStatus = overPost ? postStatus(overPost) : ''
    }
    if (!isPostStatus(nextStatus)) return

    const postId = String(active.id)
    const post = postsRef.current.find((p) => p.id === postId)
    if (!post || postStatus(post) === nextStatus) return

    const previous = post
    const updated: Doc = {
      ...post,
      postMeta: { ...post.postMeta, status: nextStatus, channel: post.postMeta?.channel ?? 'linkedin' },
      updatedAt: Date.now()
    }
    setPosts((prev) => prev.map((row) => (row.id === postId ? updated : row)))
    try {
      await window.mycel.upsertDoc(updated)
    } catch {
      setPosts((prev) => prev.map((row) => (row.id === postId ? previous : row)))
    }
  }, [])

  const handleNew = useCallback(
    async (status: PostStatus = 'draft') => {
      const now = Date.now()
      const created = await window.mycel.upsertDoc({
        id: nanoid(),
        title: '',
        body: '',
        type: 'post',
        folderId: null,
        icon: null,
        coverImage: null,
        isTemplate: false,
        isFavorite: false,
        favoriteOrder: null,
        tags: [],
        postMeta: { status, channel: 'linkedin' },
        createdAt: now,
        updatedAt: now
      })
      setPosts((prev) => [created, ...prev])
      openPost(created)
    },
    [openPost]
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)' }}>Loading…</span>
      </div>
    )
  }

  return (
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
            Calendar
          </h2>
          <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>
            Synthesis fills Review on its own. Drag posts across the board.
          </p>
        </div>
        <button type="button" onClick={() => void handleNew('draft')} style={primaryBtn}>
          <Plus size={13} />
          New post
        </button>
      </div>
      {synthMessage && (
        <p
          style={{
            margin: '0 0 12px',
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.45
          }}
        >
          {synthMessage}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0, overflowX: 'auto', paddingBottom: 8 }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void handleDragEnd(e)}>
          {POST_STATUSES.map((status) => (
            <DroppableColumn
              key={status}
              status={status}
              posts={postsByStatus[status]}
              onCardClick={openPost}
              onNew={handleNew}
            />
          ))}
        </DndContext>
      </div>
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
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
}
