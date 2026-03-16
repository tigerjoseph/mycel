import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { User, FileText, StickyNote, Search } from 'lucide-react'
import { useUIStore } from '../store/ui'
import type { SearchResult } from '@shared/types'

const typeIcons = {
  contact: User,
  doc: FileText,
  note: StickyNote,
  project: FileText
} as const

const typeLabels = {
  contact: 'Contact',
  doc: 'Doc',
  note: 'Note',
  project: 'Project'
} as const

export function CommandPalette(): React.JSX.Element | null {
  const open = useUIStore((s) => s.commandPaletteOpen)
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen)
  const setPage = useUIStore((s) => s.setPage)
  const setActiveContactId = useUIStore((s) => s.setActiveContactId)
  const setActiveDocId = useUIStore((s) => s.setActiveDocId)
  const setDocsView = useUIStore((s) => s.setDocsView)
  const setActiveNoteId = useUIStore((s) => s.setActiveNoteId)
  const setNoteEditorOpen = useUIStore((s) => s.setNoteEditorOpen)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      // Focus input on next frame
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Search on query change
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setSelectedIndex(0)
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const res = await window.mycel.search(query.trim())
        if (!cancelled) {
          setResults(res)
          setSelectedIndex(0)
        }
      } catch {
        // ignore search errors
      }
    }, 150)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const openResult = useCallback(
    (result: SearchResult) => {
      setOpen(false)

      switch (result.type) {
        case 'contact':
          setPage('crm')
          setActiveContactId(result.id)
          break
        case 'doc':
          setPage('docs')
          setActiveDocId(result.id)
          setDocsView('editor')
          break
        case 'note':
          setPage('notes')
          setActiveNoteId(result.id)
          setNoteEditorOpen(true)
          break
        case 'project':
          setPage('crm')
          break
      }
    },
    [setOpen, setPage, setActiveContactId, setActiveDocId, setDocsView, setActiveNoteId, setNoteEditorOpen]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault()
        openResult(results[selectedIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    },
    [results, selectedIndex, openResult, setOpen]
  )

  const getTitle = (result: SearchResult): string => {
    return result.title || 'Untitled'
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setOpen(false)}
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
            {/* Search input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '0 16px',
                borderBottom: '1px solid var(--border)'
              }}
            >
              <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  flex: 1,
                  height: 48,
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontSize: 16,
                  fontFamily: 'Inter, sans-serif',
                  color: 'var(--text)'
                }}
              />
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div style={{ overflowY: 'auto', padding: '4px 0' }}>
                {results.map((result, index) => {
                  const Icon = typeIcons[result.type]
                  const isSelected = index === selectedIndex

                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => openResult(result)}
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
                        fontFamily: 'Inter, sans-serif',
                        backgroundColor: isSelected ? 'var(--bg)' : 'transparent',
                        transition: 'background 80ms ease'
                      }}
                    >
                      <Icon
                        size={16}
                        style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                      />
                      <span
                        style={{
                          flex: 1,
                          fontSize: 14,
                          color: 'var(--text)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {getTitle(result)}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          flexShrink: 0
                        }}
                      >
                        {typeLabels[result.type]}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Empty state */}
            {query.trim() && results.length === 0 && (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  fontSize: 13,
                  fontFamily: 'Inter, sans-serif',
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
