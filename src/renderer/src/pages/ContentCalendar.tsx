import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import { nanoid } from 'nanoid'
import { format } from 'date-fns'
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import type { CollisionDetection, DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { POST_STATUSES, isPostStatus } from '@shared/contentEngine'
import { formatSynthesisSummary } from '@shared/synthesis'
import type { Doc, PostStatus } from '@shared/types'
import { useUIStore } from '../store/ui'
import { useDocsStore } from '../store/docs'
import { PostLightbox } from '../components/PostLightbox'

const kanbanCollision: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args)
  if (underPointer.length > 0) return underPointer
  const overlap = rectIntersection(args)
  if (overlap.length > 0) return overlap
  return closestCenter(args)
}

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

function statusFromId(id: string | number | undefined, posts: Doc[]): PostStatus | null {
  if (id == null) return null
  const key = String(id)
  if (isPostStatus(key)) return key
  const overPost = posts.find((post) => post.id === key)
  return overPost ? postStatus(overPost) : null
}

const PostCardFace = memo(function PostCardFace({ post }: { post: Doc }): React.JSX.Element {
  const channel = post.postMeta?.channel

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, minWidth: 0 }}>
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
  )
})

function cardShell(dragging: boolean): React.CSSProperties {
  return {
    padding: '8px 9px',
    backgroundColor: 'var(--bg)',
    borderRadius: 6,
    border: '1px solid var(--border)',
    boxShadow: dragging ? 'var(--shadow-md)' : undefined,
    userSelect: 'none'
  }
}

const DraggableCard = memo(function DraggableCard({
  post,
  onClick
}: {
  post: Doc
  onClick: (post: Doc) => void
}): React.JSX.Element {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: post.id })

  return (
    <div
      ref={setNodeRef}
      className="mycel-card"
      {...listeners}
      {...attributes}
      onClick={() => onClick(post)}
      style={{
        ...cardShell(false),
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.35 : 1,
        touchAction: 'none'
      }}
    >
      <PostCardFace post={post} />
    </div>
  )
})

const DroppableColumn = memo(function DroppableColumn({
  status,
  posts,
  hot,
  onCardClick,
  onNew
}: {
  status: PostStatus
  posts: Doc[]
  hot: boolean
  onCardClick: (post: Doc) => void
  onNew: (status: PostStatus) => void
}): React.JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const columnColor = STATUS_COLORS[status]
  const highlighted = hot || isOver

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: '1 1 0',
        minWidth: 200,
        backgroundColor: highlighted ? 'var(--bg)' : 'var(--surface)',
        borderRadius: 8,
        border: '1px solid var(--border)',
        borderTop: `2px solid ${columnColor}`,
        padding: 8,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        transition: 'background-color 120ms ease, box-shadow 120ms ease',
        boxShadow: highlighted ? 'var(--shadow-md)' : 'var(--shadow-sm)'
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
          padding: '0 2px',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          flexShrink: 0
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

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}
      >
        {posts.map((post) => (
          <DraggableCard key={post.id} post={post} onClick={onCardClick} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => onNew(status)}
        style={{
          flexShrink: 0,
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
  const activePage = useUIStore((s) => s.activePage)
  const createView = useUIStore((s) => s.createView)
  const fetchFolders = useDocsStore((s) => s.fetchFolders)
  const [posts, setPosts] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [synthMessage, setSynthMessage] = useState<string | null>(null)
  const [openPostId, setOpenPostId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overlayWidth, setOverlayWidth] = useState<number | null>(null)
  const [overStatus, setOverStatus] = useState<PostStatus | null>(null)
  const postsRef = useRef(posts)
  const ignoreClickRef = useRef(false)
  postsRef.current = posts

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

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

  useEffect(() => {
    if (activePage !== 'create' || createView !== 'calendar') setOpenPostId(null)
  }, [activePage, createView])

  const postsByStatus = useMemo(() => {
    const grouped = Object.fromEntries(POST_STATUSES.map((status) => [status, [] as Doc[]])) as Record<
      PostStatus,
      Doc[]
    >
    for (const post of posts) grouped[postStatus(post)].push(post)
    return grouped
  }, [posts])

  const openPost = useCallback((doc: Doc) => {
    if (ignoreClickRef.current) return
    setOpenPostId(doc.id)
  }, [])

  const clearDrag = useCallback(() => {
    setActiveId(null)
    setOverlayWidth(null)
    setOverStatus(null)
    requestAnimationFrame(() => {
      ignoreClickRef.current = false
    })
  }, [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    ignoreClickRef.current = true
    setActiveId(String(event.active.id))
    setOverlayWidth(event.active.rect.current.initial?.width ?? null)
  }, [])

  const handleDragOver = useCallback((event: { over: { id: string | number } | null }) => {
    const next = statusFromId(event.over?.id, postsRef.current)
    setOverStatus((prev) => (prev === next ? prev : next))
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const nextStatus = statusFromId(event.over?.id, postsRef.current)
      const postId = String(event.active.id)
      clearDrag()
      if (!nextStatus) return

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
    },
    [clearDrag]
  )

  const handleNew = useCallback(async (status: PostStatus = 'draft') => {
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
    setOpenPostId(created.id)
    void fetchFolders()
  }, [fetchFolders])

  const openPostDoc = useMemo(
    () => (openPostId ? posts.find((post) => post.id === openPostId) ?? null : null),
    [openPostId, posts]
  )
  const activePost = useMemo(
    () => (activeId ? posts.find((post) => post.id === activeId) ?? null : null),
    [activeId, posts]
  )

  const handleSaved = useCallback((saved: Doc) => {
    setPosts((prev) => prev.map((row) => (row.id === saved.id ? { ...row, ...saved } : row)))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)' }}>Loading…</span>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '4px 20px 16px', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
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
            flexShrink: 0,
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.45
          }}
        >
          {synthMessage}
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={kanbanCollision}
        measuring={{ droppable: { strategy: MeasuringStrategy.BeforeDragging } }}
        autoScroll={{ threshold: { x: 0.12, y: 0.15 }, acceleration: 8 }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={clearDrag}
        onDragEnd={(event) => void handleDragEnd(event)}
      >
        <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'hidden', paddingBottom: 4 }}>
          {POST_STATUSES.map((status) => (
            <DroppableColumn
              key={status}
              status={status}
              posts={postsByStatus[status]}
              hot={overStatus === status}
              onCardClick={openPost}
              onNew={handleNew}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
            {activePost ? (
              <div style={{ ...cardShell(true), cursor: 'grabbing', width: overlayWidth ?? undefined }}>
                <PostCardFace post={activePost} />
              </div>
            ) : null}
          </DragOverlay>
      </DndContext>

      {openPostDoc && (
        <PostLightbox key={openPostDoc.id} post={openPostDoc} onClose={() => setOpenPostId(null)} onSaved={handleSaved} />
      )}
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
