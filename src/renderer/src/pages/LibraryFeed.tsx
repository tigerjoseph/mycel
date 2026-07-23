import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ExternalLink, Play, Search, Trash2, X } from 'lucide-react'
import { spring } from '../styles/animation'
import { useUIStore } from '../store/ui'
import type { LibraryItem } from '@shared/types'

type LibraryItemView = LibraryItem & {
  thumbnailUrl?: string | null
  mediaUrls?: string[]
  embedUrl?: string | null
  remoteMediaUrls?: string[]
}

function isVideoItem(item: LibraryItemView): boolean {
  return item.mediaType === 'video' || Boolean(item.embedUrl)
}

function remoteVideoSrc(item: LibraryItemView): string | null {
  return (
    item.remoteMediaUrls?.find(
      (url) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) || url.includes('/video')
    ) ?? null
  )
}

function posterSrc(item: LibraryItemView, localUrls: string[]): string | null {
  if (item.thumbnailUrl) return item.thumbnailUrl
  if (localUrls.length > 0) return localUrls[0]
  return (
    item.remoteMediaUrls?.find((url) => !/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) ?? null
  )
}

const COLUMN_WIDTH = 208
const GAP = 14
const OMNI_THRESHOLD = 12
const FADE = 56

export function LibraryFeed(): React.JSX.Element {
  const showCopyFeedback = useUIStore((s) => s.showCopyFeedback)
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen)
  const libraryFocusItemId = useUIStore((s) => s.libraryFocusItemId)
  const setLibraryFocusItemId = useUIStore((s) => s.setLibraryFocusItemId)
  const [items, setItems] = useState<LibraryItemView[]>([])
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [selected, setSelected] = useState<LibraryItemView | null>(null)
  const [extInfo, setExtInfo] = useState<{ port: number; token: string } | null>(null)
  const [viewportW, setViewportW] = useState(800)
  const viewportRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const rows = await window.mycel.getLibraryItems()
    setItems(rows as LibraryItemView[])
  }, [])

  useEffect(() => {
    load().catch(() => {})
    window.mycel.getLibraryExtensionInfo().then(setExtInfo).catch(() => {})
    const unsub = window.mycel.onLibraryItemSaved((item) => {
      setItems((prev) => [item as LibraryItemView, ...prev.filter((i) => i.id !== (item as LibraryItem).id)])
      showCopyFeedback('Saved to Library')
    })
    return unsub
  }, [load, showCopyFeedback])

  useEffect(() => {
    if (!libraryFocusItemId || items.length === 0) return
    const match = items.find((i) => i.id === libraryFocusItemId)
    if (match) setSelected(match)
    setLibraryFocusItemId(null)
  }, [libraryFocusItemId, items, setLibraryFocusItemId])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setViewportW(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) {
      for (const tag of item.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
  }, [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((item) => {
      if (activeTag && !item.tags.includes(activeTag)) return false
      if (!q) return true
      const hay = `${item.title} ${item.caption} ${item.url} ${item.tags.join(' ')}`.toLowerCase()
      return hay.includes(q)
    })
  }, [items, query, activeTag])

  const omni = filtered.length >= OMNI_THRESHOLD
  const colCount = useMemo(() => {
    if (omni) {
      return Math.max(5, Math.min(12, Math.ceil(Math.sqrt(filtered.length * 1.4))))
    }
    return Math.max(2, Math.min(5, Math.floor((viewportW + GAP) / (COLUMN_WIDTH + GAP))))
  }, [omni, filtered.length, viewportW])

  const gridWidth = colCount * COLUMN_WIDTH + (colCount - 1) * GAP

  const handleDelete = useCallback(async (id: string) => {
    await window.mycel.deleteLibraryItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    setSelected((prev) => (prev?.id === id ? null : prev))
    showCopyFeedback('Removed')
  }, [showCopyFeedback])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: '16px 20px 10px', flexShrink: 0 }}>
        {items.length > 0 && (
          <div style={{ position: 'relative', marginBottom: 10, maxWidth: 420 }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search saves…"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '9px 12px 9px 36px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                color: 'var(--text)',
                outline: 'none'
              }}
            />
          </div>
        )}

        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
            <button onClick={() => setActiveTag(null)} style={tagPillStyle(activeTag === null)}>All</button>
            {allTags.slice(0, 14).map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                style={tagPillStyle(activeTag === tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {omni && (
          <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-muted)' }}>
            Drag or scroll in any direction — {filtered.length} saves
          </p>
        )}

        {items.length === 0 && (
          <EmptyState extInfo={extInfo} onOpenSettings={() => setSettingsOpen(true)} />
        )}
      </div>

      {filtered.length > 0 && (
        <div ref={viewportRef} style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <MindspaceCanvas omni={omni} gridWidth={gridWidth}>
            <div
              style={{
                width: omni ? gridWidth : '100%',
                margin: omni ? undefined : '0 auto',
                columnCount: colCount,
                columnGap: GAP,
                padding: `4px ${FADE}px ${FADE + 24}px`
              }}
            >
              <AnimatePresence initial={false}>
                {filtered.map((item) => (
                  <motion.article
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={spring}
                    onClick={() => setSelected(item)}
                    style={{
                      breakInside: 'avoid',
                      marginBottom: GAP,
                      cursor: 'pointer',
                      borderRadius: 16,
                      overflow: 'hidden',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'inline-block',
                      width: '100%',
                      transition: 'box-shadow 180ms ease, transform 180ms ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                      e.currentTarget.style.transform = 'none'
                    }}
                  >
                    <PinCardMedia item={item} />
                    {(item.caption || item.title) && (
                      <div style={{ padding: '10px 12px 12px' }}>
                        <p style={{
                          margin: 0,
                          fontFamily: 'var(--font-ui)',
                          fontSize: 12,
                          lineHeight: 1.4,
                          color: 'var(--text)',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {item.caption || item.title}
                        </p>
                      </div>
                    )}
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          </MindspaceCanvas>
          <EdgeFades omni={omni} />
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <LibraryDetail
            item={selected}
            onClose={() => setSelected(null)}
            onDelete={() => void handleDelete(selected.id)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function MindspaceCanvas({
  omni,
  gridWidth,
  children
}: {
  omni: boolean
  gridWidth: number
  children: React.ReactNode
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ active: boolean; x: number; y: number; sl: number; st: number } | null>(null)

  const onPointerDown = (e: React.PointerEvent): void => {
    if (!omni || e.button !== 0) return
    const el = ref.current
    if (!el) return
    const target = e.target as HTMLElement
    if (target.closest('article')) return
    drag.current = { active: true, x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop }
    el.setPointerCapture(e.pointerId)
    el.style.cursor = 'grabbing'
  }

  const onPointerMove = (e: React.PointerEvent): void => {
    if (!drag.current?.active || !ref.current) return
    ref.current.scrollLeft = drag.current.sl - (e.clientX - drag.current.x)
    ref.current.scrollTop = drag.current.st - (e.clientY - drag.current.y)
  }

  const endDrag = (e: React.PointerEvent): void => {
    if (!drag.current?.active || !ref.current) return
    drag.current = null
    ref.current.releasePointerCapture(e.pointerId)
    ref.current.style.cursor = omni ? 'grab' : ''
  }

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: omni ? 'auto' : 'auto',
        ...(omni ? { cursor: 'grab' as const } : {}),
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <div style={{ minWidth: omni ? gridWidth + FADE * 2 : undefined, minHeight: omni ? '100%' : undefined }}>
        {children}
      </div>
    </div>
  )
}

function EdgeFades({ omni }: { omni: boolean }): React.JSX.Element {
  const base: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 3
  }

  return (
    <>
      <div style={{
        ...base,
        top: 0,
        left: 0,
        right: 0,
        height: FADE,
        background: 'linear-gradient(to bottom, var(--bg) 0%, transparent 100%)'
      }} />
      <div style={{
        ...base,
        bottom: 0,
        left: 0,
        right: 0,
        height: FADE,
        background: 'linear-gradient(to top, var(--bg) 0%, transparent 100%)'
      }} />
      {omni && (
        <>
          <div style={{
            ...base,
            top: 0,
            bottom: 0,
            left: 0,
            width: FADE,
            background: 'linear-gradient(to right, var(--bg) 0%, transparent 100%)'
          }} />
          <div style={{
            ...base,
            top: 0,
            bottom: 0,
            right: 0,
            width: FADE,
            background: 'linear-gradient(to left, var(--bg) 0%, transparent 100%)'
          }} />
        </>
      )}
    </>
  )
}

function EmptyState({
  extInfo,
  onOpenSettings
}: {
  extInfo: { port: number; token: string } | null
  onOpenSettings: () => void
}): React.JSX.Element {
  return (
    <div style={{
      marginTop: 16,
      padding: 20,
      borderRadius: 12,
      border: '1px dashed var(--border)',
      background: 'var(--surface)',
      maxWidth: 440
    }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
        Nothing saved yet
      </p>
      <ol style={{ margin: '10px 0 0', padding: '0 0 0 18px', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
        <li>Keep Mycel open — the extension talks to it on your Mac.</li>
        <li>Install the Mycel browser extension (see Settings → Browser extension).</li>
        <li>On Instagram, hover a post and click <strong>+ Mycel</strong>.</li>
      </ol>
      <button
        type="button"
        onClick={onOpenSettings}
        style={{
          marginTop: 14,
          padding: '7px 12px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          color: 'var(--text)',
          cursor: 'pointer',
          fontSize: 12,
          fontFamily: 'var(--font-ui)',
          fontWeight: 500
        }}
      >
        Open extension setup
      </button>
      {extInfo && (
        <p style={{ margin: '12px 0 0', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-muted)' }}>
          Mycel is listening on 127.0.0.1:{extInfo.port}
        </p>
      )}
    </div>
  )
}

function VideoPlayBadge({ large }: { large?: boolean }): React.JSX.Element {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none'
    }}>
      <div style={{
        width: large ? 56 : 40,
        height: large ? 56 : 40,
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(255,255,255,0.25)'
      }}>
        <Play size={large ? 24 : 16} fill="#fff" color="#fff" style={{ marginLeft: 2 }} />
      </div>
    </div>
  )
}

function PinCardMedia({ item }: { item: LibraryItemView }): React.JSX.Element {
  const urls = item.mediaUrls ?? (item.thumbnailUrl ? [item.thumbnailUrl] : [])
  const aspect = cardAspect(item)
  const remoteVideo = remoteVideoSrc(item)
  const poster = posterSrc(item, urls)

  if (urls.length === 0 && !remoteVideo && !item.embedUrl) {
    return (
      <div style={{
        padding: '28px 16px',
        minHeight: 100,
        aspectRatio: aspect,
        background: 'linear-gradient(145deg, var(--surface), var(--bg))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '0 8px' }}>
          {item.mediaType === 'quote' ? `"${item.caption.slice(0, 80)}…"` : item.title}
        </p>
      </div>
    )
  }

  if (isVideoItem(item) && (item.embedUrl || remoteVideo) && urls.length === 0) {
    return (
      <div style={{ position: 'relative', aspectRatio: item.embedUrl ? '9 / 16' : aspect, background: '#111' }}>
        {poster && (
          <img
            src={poster}
            alt=""
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
            loading="lazy"
          />
        )}
        <VideoPlayBadge />
      </div>
    )
  }

  const isVideo = (url: string): boolean => isVideoItem(item) || url.includes('/video')
  const url = urls[0]

  if (url && isVideo(url)) {
    return (
      <div style={{ position: 'relative', aspectRatio: aspect, background: '#111' }}>
        <video
          src={url}
          controls
          playsInline
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )
  }

  if (remoteVideo && urls.length === 0) {
    return (
      <div style={{ position: 'relative', aspectRatio: aspect, background: '#111' }}>
        {poster && (
          <img
            src={poster}
            alt=""
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
            loading="lazy"
          />
        )}
        <VideoPlayBadge />
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', aspectRatio: aspect, background: '#111' }}>
      <img
        src={url || poster || ''}
        alt=""
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
        loading="lazy"
      />
      {isVideoItem(item) && <VideoPlayBadge />}
      {urls.length > 1 && (
        <span style={{
          position: 'absolute',
          top: 8,
          right: 8,
          fontFamily: 'var(--font-ui)',
          fontSize: 10,
          fontWeight: 600,
          color: '#fff',
          background: 'rgba(0,0,0,0.55)',
          borderRadius: 6,
          padding: '3px 7px'
        }}>
          +{urls.length - 1}
        </span>
      )}
    </div>
  )
}

function cardAspect(item: LibraryItemView): string {
  const hash = item.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const variants = ['3 / 4', '4 / 5', '1 / 1', '2 / 3', '5 / 6']
  if (item.mediaType === 'quote' || item.mediaType === 'page') return '4 / 3'
  if (item.embedUrl?.includes('instagram.com')) return '9 / 16'
  return variants[hash % variants.length]
}

function LibraryDetail({
  item,
  onClose,
  onDelete
}: {
  item: LibraryItemView
  onClose: () => void
  onDelete: () => void
}): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={spring}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: item.embedUrl ? 'min(540px, 100%)' : 'min(480px, 100%)',
          maxHeight: '90vh',
          overflow: 'auto',
          borderRadius: 16,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, padding: '8px 8px 0' }}>
          <button type="button" onClick={() => void window.mycel.openLibraryUrl(item.url)} style={iconBtnStyle} title="Open original">
            <ExternalLink size={16} />
          </button>
          <button type="button" onClick={onDelete} style={iconBtnStyle} title="Delete">
            <Trash2 size={16} />
          </button>
          <button type="button" onClick={onClose} style={iconBtnStyle} title="Close">
            <X size={16} />
          </button>
        </div>
        <DetailMedia item={item} />
        <div style={{ padding: '16px 18px 20px' }}>
          {item.caption && (
            <p style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 14, lineHeight: 1.5, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
              {item.caption}
            </p>
          )}
          <p style={{ margin: '12px 0 0', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-muted)' }}>
            {item.source} · {new Date(item.createdAt).toLocaleDateString()}
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

function DetailMedia({ item }: { item: LibraryItemView }): React.JSX.Element {
  const urls = item.mediaUrls ?? (item.thumbnailUrl ? [item.thumbnailUrl] : [])
  const remoteVideo = remoteVideoSrc(item)

  if (item.embedUrl) {
    return (
      <iframe
        src={item.embedUrl}
        title="Embedded media"
        style={{ width: '100%', border: 0, minHeight: 520, display: 'block', background: '#000' }}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  if (urls.length === 0 && !remoteVideo) {
    return (
      <div style={{ padding: '48px 20px', background: 'linear-gradient(145deg, var(--surface), var(--bg))', textAlign: 'center' }}>
        <p style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>
          {item.mediaType === 'quote' ? `"${item.caption.slice(0, 120)}…"` : item.title}
        </p>
      </div>
    )
  }

  const isVideo = (url: string): boolean => isVideoItem(item) || url.includes('/video')

  if (item.mediaType === 'carousel' && urls.length > 1) {
    return (
      <div style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', background: '#000' }} onClick={(e) => e.stopPropagation()}>
        {urls.map((url, i) => (
          <img key={url + i} src={url} alt="" style={{ width: '100%', flexShrink: 0, scrollSnapAlign: 'start', display: 'block', objectFit: 'cover', maxHeight: 560 }} loading="lazy" />
        ))}
      </div>
    )
  }

  if (remoteVideo && urls.length === 0) {
    return (
      <video
        src={remoteVideo}
        controls
        playsInline
        style={{ width: '100%', display: 'block', background: '#000', maxHeight: 560 }}
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  const url = urls[0]
  if (url && isVideo(url)) {
    return <video src={url} controls playsInline style={{ width: '100%', display: 'block', background: '#000', maxHeight: 560 }} onClick={(e) => e.stopPropagation()} />
  }

  return <img src={url || posterSrc(item, urls) || ''} alt="" style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: 560 }} loading="lazy" />
}

function tagPillStyle(active: boolean): React.CSSProperties {
  return {
    border: '1px solid',
    borderColor: active ? 'var(--text)' : 'var(--border)',
    background: active ? 'var(--text)' : 'transparent',
    color: active ? 'var(--bg)' : 'var(--text-muted)',
    borderRadius: 999,
    padding: '4px 10px',
    fontSize: 11,
    fontFamily: 'var(--font-ui)',
    cursor: 'pointer'
  }
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 8,
  borderRadius: 8,
  color: 'var(--text-muted)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}
