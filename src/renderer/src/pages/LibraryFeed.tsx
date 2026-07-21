import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ExternalLink, Search, Trash2, X } from 'lucide-react'
import { spring } from '../styles/animation'
import { useUIStore } from '../store/ui'
import type { LibraryItem } from '@shared/types'

type LibraryItemView = LibraryItem & {
  thumbnailUrl?: string | null
  mediaUrls?: string[]
}

const FEED_WIDTH = 400

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

  // Jump to and highlight an item requested from search (Cmd+K)
  useEffect(() => {
    if (!libraryFocusItemId || items.length === 0) return
    const match = items.find((i) => i.id === libraryFocusItemId)
    if (match) setSelected(match)
    setLibraryFocusItemId(null)
  }, [libraryFocusItemId, items, setLibraryFocusItemId])

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

  const handleDelete = useCallback(async (id: string) => {
    await window.mycel.deleteLibraryItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    setSelected((prev) => (prev?.id === id ? null : prev))
    showCopyFeedback('Removed')
  }, [showCopyFeedback])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 24px 12px', maxWidth: FEED_WIDTH, margin: '0 auto', width: '100%' }}>
        {items.length > 0 && (
          <div style={{ position: 'relative', marginBottom: 12 }}>
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
                padding: '10px 12px 10px 36px',
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
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <button
              onClick={() => setActiveTag(null)}
              style={tagPillStyle(activeTag === null)}
            >
              All
            </button>
            {allTags.slice(0, 12).map((tag) => (
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

        {items.length === 0 && (
          <div style={{
            marginTop: 24,
            padding: 20,
            borderRadius: 12,
            border: '1px dashed var(--border)',
            background: 'var(--surface)'
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
              onClick={() => setSettingsOpen(true)}
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
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 80px' }}>
        <div style={{ maxWidth: FEED_WIDTH, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <AnimatePresence initial={false}>
            {filtered.map((item) => (
              <motion.article
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={spring}
                onClick={() => setSelected(item)}
                style={{
                  cursor: 'pointer',
                  borderRadius: 14,
                  overflow: 'hidden',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 1px 0 rgba(0,0,0,0.03)'
                }}
              >
                <LibraryCardMedia item={item} />
                {(item.caption || item.title) && (
                  <div style={{ padding: '12px 14px 14px' }}>
                    {item.caption ? (
                      <p style={{
                        margin: 0,
                        fontFamily: 'var(--font-ui)',
                        fontSize: 13,
                        lineHeight: 1.45,
                        color: 'var(--text)',
                        whiteSpace: 'pre-wrap',
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {item.caption}
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>
                        {item.title}
                      </p>
                    )}
                    {item.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {item.tags.slice(0, 4).map((tag) => (
                          <span key={tag} style={tagChipStyle}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      </div>

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

function LibraryCardMedia({ item }: { item: LibraryItemView }): React.JSX.Element | null {
  const urls = item.mediaUrls ?? (item.thumbnailUrl ? [item.thumbnailUrl] : [])
  if (urls.length === 0) {
    return (
      <div style={{
        padding: '48px 20px',
        background: 'linear-gradient(145deg, var(--surface), var(--bg))',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>
          {item.mediaType === 'quote' ? `"${item.caption.slice(0, 120)}…"` : item.title}
        </p>
      </div>
    )
  }

  const isVideo = (url: string): boolean => item.mediaType === 'video' || url.includes('/video')

  if (item.mediaType === 'carousel' && urls.length > 1) {
    return (
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          background: '#000'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {urls.map((url, i) => (
          <img
            key={url + i}
            src={url}
            alt=""
            style={{
              width: '100%',
              flexShrink: 0,
              scrollSnapAlign: 'start',
              display: 'block',
              objectFit: 'cover',
              maxHeight: 560
            }}
            loading="lazy"
          />
        ))}
      </div>
    )
  }

  const url = urls[0]
  if (isVideo(url)) {
    return (
      <video
        src={url}
        controls
        playsInline
        style={{ width: '100%', display: 'block', background: '#000', maxHeight: 560 }}
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  return (
    <img
      src={url}
      alt=""
      style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: 560 }}
      loading="lazy"
    />
  )
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
          width: 'min(440px, 100%)',
          maxHeight: '90vh',
          overflow: 'auto',
          borderRadius: 16,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
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
        <LibraryCardMedia item={item} />
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

const tagChipStyle: React.CSSProperties = {
  fontSize: 10,
  fontFamily: 'var(--font-ui)',
  color: 'var(--text-muted)',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 999,
  padding: '2px 8px'
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
