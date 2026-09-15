import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { nanoid } from 'nanoid'
import { format } from 'date-fns'
import { POST_STATUSES } from '@shared/contentEngine'
import { formatSynthesisSummary } from '@shared/synthesis'
import type { Doc, PostStatus, SynthesisResult } from '@shared/types'
import { useUIStore } from '../store/ui'
import { openDoc } from '../utils/openDoc'

const FILTERS: { id: 'all' | PostStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'review', label: 'Review' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'published', label: 'Published' }
]

export function ContentCalendar(): React.JSX.Element {
  const setCreateView = useUIStore((s) => s.setCreateView)
  const setDocsView = useUIStore((s) => s.setDocsView)
  const [posts, setPosts] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | PostStatus>('all')
  const [synthBusy, setSynthBusy] = useState(false)
  const [synthMessage, setSynthMessage] = useState<string | null>(null)

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

  const visible = useMemo(() => {
    if (filter === 'all') return posts
    return posts.filter((p) => (p.postMeta?.status ?? 'draft') === filter)
  }, [posts, filter])

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

  const handleSynthesis = useCallback(async () => {
    setSynthBusy(true)
    setSynthMessage(null)
    try {
      const result: SynthesisResult = await window.mycel.runSynthesis()
      setSynthMessage(formatSynthesisSummary(result))
      await load()
      if (result.drafts.length > 0) setFilter('review')
    } catch (err) {
      setSynthMessage(err instanceof Error ? err.message : 'Synthesis failed')
    } finally {
      setSynthBusy(false)
    }
  }, [load])

  const handleNew = useCallback(async () => {
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
      postMeta: { status: 'draft', channel: 'linkedin' },
      createdAt: now,
      updatedAt: now
    })
    setPosts((prev) => [created, ...prev])
    openPost(created)
  }, [openPost])

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
            Content calendar
          </h2>
          <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>
            Posts by status. Synthesis drafts land in Review. Opens the same doc editor.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => void handleSynthesis()}
            disabled={synthBusy}
            style={{ ...primaryBtn, opacity: synthBusy ? 0.6 : 1 }}
          >
            {synthBusy ? 'Synthesizing…' : 'Run synthesis'}
          </button>
          <button type="button" onClick={() => void handleNew()} style={primaryBtn}>
            <Plus size={13} />
            New post
          </button>
        </div>
      </div>
      {synthMessage && (
        <p style={{ margin: '0 0 12px', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
          {synthMessage}
        </p>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map((tab) => {
          const active = filter === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: active ? 'var(--surface)' : 'transparent',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: active ? 'var(--shadow-sm)' : undefined
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {loading ? (
          <p style={emptyStyle}>Loading…</p>
        ) : visible.length === 0 ? (
          <p style={emptyStyle}>
            {filter === 'all' ? 'No posts yet.' : `No ${filter} posts.`}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visible.map((post) => {
              const status = post.postMeta?.status ?? 'draft'
              const channel = post.postMeta?.channel
              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => openPost(post)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--surface)'
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      padding: '2px 6px',
                      flexShrink: 0
                    }}
                  >
                    {POST_STATUSES.includes(status) ? status : 'draft'}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontFamily: 'var(--font-ui)',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {post.title || 'Untitled post'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {channel ? `${channel} · ` : ''}
                    {format(post.updatedAt, 'MMM d')}
                  </span>
                </button>
              )
            })}
          </div>
        )}
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

const emptyStyle: React.CSSProperties = {
  margin: '24px 0 0',
  fontFamily: 'var(--font-ui)',
  fontSize: 13,
  color: 'var(--text-muted)',
  textAlign: 'center'
}
