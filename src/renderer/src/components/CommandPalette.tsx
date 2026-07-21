import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { User, FileText, StickyNote, Search, CheckSquare, Hash, Image, Quote } from 'lucide-react'
import { useUIStore } from '../store/ui'
import type { Doc, SearchResult, Tag, TagEntity } from '@shared/types'
import { openDoc } from '../utils/openDoc'

const typeIcons = {
  contact: User,
  doc: FileText,
  note: StickyNote,
  project: FileText,
  todo: CheckSquare,
  library: Image,
  atom: Quote
} as const

const typeLabels = {
  contact: 'Contact',
  doc: 'Doc',
  note: 'Note',
  project: 'Project',
  todo: 'To-Do',
  library: 'Mindspace',
  atom: 'Extraction'
} as const

const entityIcons = {
  contact: User,
  doc: FileText,
  note: StickyNote
} as const

type TagRow = Tag & { tag?: string }

function tagName(t: TagRow): string {
  return t.name ?? t.tag ?? ''
}

function normalizeTags(tags: TagRow[]): Tag[] {
  return tags.map((t) => ({ name: tagName(t), count: t.count }))
}

export function CommandPalette(): React.JSX.Element | null {
  const open = useUIStore((s) => s.commandPaletteOpen)
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen)
  const setPage = useUIStore((s) => s.setPage)
  const setActiveContactId = useUIStore((s) => s.setActiveContactId)
  const setActiveDocId = useUIStore((s) => s.setActiveDocId)
  const setDocsView = useUIStore((s) => s.setDocsView)
  const setActiveNoteId = useUIStore((s) => s.setActiveNoteId)
  const setCRMView = useUIStore((s) => s.setCRMView)
  const setActiveProjectId = useUIStore((s) => s.setActiveProjectId)
  const setLibraryView = useUIStore((s) => s.setLibraryView)
  const setLibraryFocusItemId = useUIStore((s) => s.setLibraryFocusItemId)
  const setExtractionsFocus = useUIStore((s) => s.setExtractionsFocus)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [tagResults, setTagResults] = useState<Tag[]>([])
  const [entityResults, setEntityResults] = useState<TagEntity[]>([])
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const isTagMode = query.startsWith('#') && !selectedTag

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setTagResults([])
      setEntityResults([])
      setSelectedTag(null)
      setSelectedIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Search / tag browse
  useEffect(() => {
    if (!open) return

    if (selectedTag) {
      let cancelled = false
      window.mycel.getEntitiesByTag(selectedTag).then((entities) => {
        if (!cancelled) {
          setEntityResults(entities as TagEntity[])
          setSelectedIndex(0)
        }
      }).catch(() => {})
      return () => { cancelled = true }
    }

    if (isTagMode) {
      const q = query.slice(1).trim().toLowerCase()
      let cancelled = false
      window.mycel.getTags().then((tags) => {
        if (!cancelled) {
          const normalized = normalizeTags(tags as TagRow[])
          const list = normalized.filter(
            (t) => !q || tagName(t).toLowerCase().includes(q)
          ).slice(0, 15)
          setTagResults(list)
          setResults([])
          setEntityResults([])
          setSelectedIndex(0)
        }
      }).catch(() => {})
      return () => { cancelled = true }
    }

    if (!query.trim()) {
      setResults([])
      setTagResults([])
      setEntityResults([])
      setSelectedIndex(0)
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const res = await window.mycel.search(query.trim())
        if (!cancelled) {
          setResults(res)
          setTagResults([])
          setEntityResults([])
          setSelectedIndex(0)
        }
      } catch {
        // ignore
      }
    }, 150)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, open, selectedTag, isTagMode])

  const openSearchResult = useCallback(
    (result: SearchResult) => {
      setOpen(false)
      switch (result.type) {
        case 'contact':
          setPage('people')
          setActiveContactId(result.id)
          break
        case 'doc':
          setPage('create')
          void window.mycel.getDoc(result.id).then((d) => {
            if (d) openDoc(d as Doc)
          })
          break
        case 'note':
          setPage('create')
          setActiveNoteId(result.id)
          break
        case 'project':
          setPage('people')
          setCRMView('projects')
          setActiveProjectId(result.id)
          break
        case 'todo':
          setPage('todo')
          break
        case 'library':
          setPage('library')
          setLibraryView('mindspace')
          setLibraryFocusItemId(result.id)
          break
        case 'atom':
          setPage('library')
          setLibraryView('extractions')
          if (result.parentId) {
            setExtractionsFocus({ meetingId: result.parentId, atomId: result.id })
          }
          break
      }
    },
    [
      setOpen,
      setPage,
      setActiveContactId,
      setActiveDocId,
      setDocsView,
      setActiveNoteId,
      setCRMView,
      setActiveProjectId,
      setLibraryView,
      setLibraryFocusItemId,
      setExtractionsFocus
    ]
  )

  const openEntity = useCallback(
    (entity: TagEntity) => {
      setOpen(false)
      switch (entity.type) {
        case 'contact':
          setPage('people')
          setActiveContactId(entity.id)
          break
        case 'doc':
          setPage('create')
          void window.mycel.getDoc(entity.id).then((d) => {
            if (d) openDoc(d as Doc)
          })
          break
        case 'note':
          setPage('create')
          setActiveNoteId(entity.id)
          break
      }
    },
    [setOpen, setPage, setActiveContactId, setActiveDocId, setDocsView, setActiveNoteId]
  )

  const activeCount = selectedTag
    ? entityResults.length
    : isTagMode
      ? tagResults.length
      : results.length

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, activeCount - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && activeCount > 0) {
        e.preventDefault()
        if (selectedTag) {
          openEntity(entityResults[selectedIndex])
        } else if (isTagMode) {
          const name = tagName(tagResults[selectedIndex])
          setSelectedTag(name)
          setQuery(`#${name}`)
        } else {
          openSearchResult(results[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        if (selectedTag) {
          setSelectedTag(null)
          setEntityResults([])
        } else {
          setOpen(false)
        }
      }
    },
    [
      activeCount,
      selectedTag,
      isTagMode,
      entityResults,
      tagResults,
      results,
      selectedIndex,
      openEntity,
      openSearchResult,
      setOpen
    ]
  )

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setOpen(false)}
          data-ui-overlay=""
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: 120,
            zIndex: 9999
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 560,
              maxHeight: 400,
              backgroundColor: 'var(--surface)',
              borderRadius: 12,
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '0 16px',
                borderBottom: '1px solid var(--border)'
              }}
            >
              {isTagMode || selectedTag ? (
                <Hash size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              ) : (
                <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              )}
              <input
                ref={inputRef}
                type="text"
                placeholder={selectedTag ? `Tagged "${selectedTag}"` : 'Search or type #tag'}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  if (!e.target.value.startsWith('#')) setSelectedTag(null)
                }}
                onKeyDown={handleKeyDown}
                style={{
                  flex: 1,
                  height: 48,
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontSize: 16,
                  fontFamily: 'var(--font-ui)',
                  color: 'var(--text)'
                }}
              />
            </div>

            {selectedTag && entityResults.length > 0 && (
              <div style={{ overflowY: 'auto', padding: '4px 0' }}>
                {entityResults.map((entity, index) => {
                  const Icon = entityIcons[entity.type]
                  const isSelected = index === selectedIndex
                  return (
                    <button
                      key={`${entity.type}-${entity.id}`}
                      onClick={() => openEntity(entity)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 16px',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'var(--font-ui)',
                        backgroundColor: isSelected ? 'var(--bg)' : 'transparent'
                      }}
                    >
                      <Icon size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>
                        {entity.name || 'Untitled'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {entity.type}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {isTagMode && tagResults.length > 0 && (
              <div style={{ overflowY: 'auto', padding: '4px 0' }}>
                {tagResults.map((tag, index) => {
                  const isSelected = index === selectedIndex
                  return (
                    <button
                      key={tagName(tag)}
                      onClick={() => {
                        const name = tagName(tag)
                        setSelectedTag(name)
                        setQuery(`#${name}`)
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 16px',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'var(--font-ui)',
                        backgroundColor: isSelected ? 'var(--bg)' : 'transparent'
                      }}
                    >
                      <Hash size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{tagName(tag)}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tag.count}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {!selectedTag && !isTagMode && results.length > 0 && (
              <div style={{ overflowY: 'auto', padding: '4px 0' }}>
                {results.map((result, index) => {
                  const Icon = typeIcons[result.type]
                  const isSelected = index === selectedIndex
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => openSearchResult(result)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 16px',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'var(--font-ui)',
                        backgroundColor: isSelected ? 'var(--bg)' : 'transparent'
                      }}
                    >
                      <Icon size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>
                        {result.title || 'Untitled'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {typeLabels[result.type]}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {query.trim() && activeCount === 0 && (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  fontSize: 13,
                  fontFamily: 'var(--font-ui)',
                  color: 'var(--text-muted)'
                }}
              >
                No results
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
