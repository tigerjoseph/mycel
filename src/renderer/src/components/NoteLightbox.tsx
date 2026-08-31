import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { spring } from '../styles/animation'
import { TagPicker } from './TagPicker'
import { useNotesStore } from '../store/notes'
import { useFlushOnLeave } from '../hooks/useFlushOnLeave'
import { noteBodyHtmlToPlain, noteBodyPlainToHtml, noteBodyHasContent } from '../utils/noteBody'
import type { Note } from '@shared/types'

interface NoteLightboxProps {
  note: Note
  onClose: () => void
}

export function NoteLightbox({ note, onClose }: NoteLightboxProps): React.JSX.Element {
  const [loaded, setLoaded] = useState<Note | null>(null)
  const [title, setTitle] = useState(note.title)
  const [body, setBody] = useState('')
  const [tags, setTags] = useState<string[]>(note.tags)
  const fetchNotes = useNotesStore((s) => s.fetch)
  const titleRef = useRef<HTMLInputElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    window.mycel.getNote(note.id).then((full) => {
      if (cancelled || !full) return
      const n = full as Note
      setLoaded(n)
      setTitle(n.title)
      setBody(noteBodyHtmlToPlain(n.body))
      setTags(n.tags)
      setTimeout(() => titleRef.current?.focus(), 50)
    })
    return () => { cancelled = true }
  }, [note.id])

  const persist = useCallback(async () => {
    if (!loaded) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    await window.mycel.upsertNote({
      ...loaded,
      title: title.trim(),
      body: noteBodyHasContent(body) ? noteBodyPlainToHtml(body) : '',
      tags,
      updatedAt: Date.now()
    })
    fetchNotes()
  }, [loaded, title, body, tags, fetchNotes])

  const debouncedPersist = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => { void persist() }, 600)
  }, [persist])

  useFlushOnLeave(persist, { watchCreateView: true })

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape' && !e.metaKey && !e.ctrlKey) {
        e.stopPropagation()
        void persist().then(onClose)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose, persist])

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
  }, [])

  const handleClose = (): void => {
    void persist().then(onClose)
  }

  const handleDelete = async (): Promise<void> => {
    if (!loaded) return
    if (!confirm('Delete this note?')) return
    await window.mycel.deleteNote(note.id)
    fetchNotes()
    onClose()
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24
        }}
        data-ui-overlay=""
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.98 }}
          transition={spring}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 'min(560px, 100%)',
            height: 'min(78vh, 640px)',
            background: 'var(--bg)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-modal)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {!loaded ? (
            <div style={{
              padding: 24,
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: 'var(--text-muted)'
            }}>
              Loading note…
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 14px 8px',
                  flexShrink: 0
                }}
              >
                <input
                  ref={titleRef}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    debouncedPersist()
                  }}
                  onBlur={() => { void persist() }}
                  placeholder="Untitled"
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    fontFamily: 'var(--font-heading)',
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'var(--text)',
                    outline: 'none',
                    letterSpacing: '-0.02em'
                  }}
                />
                <button
                  onClick={handleClose}
                  aria-label="Close"
                  style={iconBtn}
                >
                  <X size={15} />
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '0 18px 12px',
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <textarea
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value)
                    debouncedPersist()
                  }}
                  onBlur={() => { void persist() }}
                  placeholder="Start writing..."
                  style={{
                    flex: 1,
                    width: '100%',
                    minHeight: 200,
                    border: 'none',
                    background: 'none',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'var(--font-ui)',
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: 'var(--text)'
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px 14px',
                gap: 8,
                borderTop: '1px solid var(--border)',
                flexShrink: 0
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <TagPicker
                    tags={tags}
                    onChange={(next) => {
                      setTags(next)
                      debouncedPersist()
                    }}
                  />
                </div>
                <button
                  onClick={() => { void handleDelete() }}
                  style={{
                    background: 'none',
                    color: 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontFamily: 'var(--font-ui)',
                    padding: '5px 8px',
                    borderRadius: 6,
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#D93025' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

const iconBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 5,
  cursor: 'pointer',
  color: 'var(--text-muted)',
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}
