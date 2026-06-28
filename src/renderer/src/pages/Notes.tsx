import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { format } from 'date-fns'
import { fadeUp, spring } from '../styles/animation'
import { useNotesStore } from '../store/notes'
import { TagFilter } from '../components/TagFilter'
import { MonthFilter } from '../components/MonthFilter'
import { TagPicker, getTagColor } from '../components/TagPicker'
import { useFlushOnLeave } from '../hooks/useFlushOnLeave'
import { noteBodyHtmlToPlain, noteBodyPlainToHtml, noteBodyHasContent } from '../utils/noteBody'
import type { Note } from '@shared/types'

// ── Tag Context Menu ─────────────────────────────────
function TagContextMenu({ x, y, tag, onDelete, onClose }: {
  x: number; y: number; tag: string; onDelete: () => void; onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      style={{
        position: 'fixed', left: x, top: y, zIndex: 100,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 8, padding: 4, minWidth: 140,
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
      }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, fontFamily: 'var(--font-ui)', color: '#D93025',
          borderRadius: 6, transition: 'background 100ms ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
      >
        <X size={12} />
        Remove "{tag}"
      </button>
    </motion.div>
  )
}

// ── Inline Note Composer ─────────────────────────────
function NoteComposer({ onSave }: { onSave: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const titleRef = useRef<HTMLInputElement>(null)

  const handleExpand = () => {
    setExpanded(true)
    setTimeout(() => titleRef.current?.focus(), 50)
  }

  const handleSave = async () => {
    const hasContent = title.trim() || body.trim()
    if (!hasContent) {
      setExpanded(false)
      return
    }
    await window.mycel.upsertNote({
      title: title.trim(),
      body: noteBodyHasContent(body) ? noteBodyPlainToHtml(body) : '',
      tags,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    setTitle('')
    setBody('')
    setTags([])
    setExpanded(false)
    onSave()
  }

  if (!expanded) {
    return (
      <motion.div
        onClick={handleExpand}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={spring}
        style={{
          padding: '12px 16px',
          border: '1px solid var(--border)',
          borderRadius: 10,
          cursor: 'text',
          fontFamily: 'var(--font-ui)',
          fontSize: 14,
          color: 'var(--text-muted)'
        }}
      >
        Write something...
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={spring}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'var(--surface)',
        overflow: 'hidden'
      }}
      onKeyDown={(e) => { if (e.key === 'Escape') { setExpanded(false); setTitle(''); setBody(''); setTags([]) } }}
    >
      <input
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        style={{
          width: '100%', padding: '16px 16px 0',
          border: 'none', background: 'none', outline: 'none',
          fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 600,
          color: 'var(--text)', lineHeight: 1.3
        }}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Start writing..."
        rows={3}
        style={{
          width: '100%', padding: '8px 16px',
          border: 'none', background: 'none', outline: 'none', resize: 'none',
          fontFamily: 'var(--font-ui)', fontSize: 14, lineHeight: 1.7,
          color: 'var(--text)'
        }}
      />
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px 12px', gap: 8
      }}>
        <div style={{ flex: 1 }}>
          <TagPicker tags={tags} onChange={setTags} />
        </div>
        <motion.button
          onClick={handleSave}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          style={{
            background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 6, padding: '5px 14px', cursor: 'pointer',
            fontSize: 12, fontFamily: 'var(--font-ui)', fontWeight: 500,
            flexShrink: 0
          }}
        >
          Save
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── Inline Note Editor (expand in-place) ──────────────
function InlineNoteEditor({ note, onClose }: { note: Note; onClose: () => void }) {
  const [title, setTitle] = useState(note.title)
  const [body, setBody] = useState(() => noteBodyHtmlToPlain(note.body))
  const [tags, setTags] = useState<string[]>(note.tags)
  const fetchNotes = useNotesStore((s) => s.fetch)
  const titleRef = useRef<HTMLInputElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  const persist = useCallback(async (closeAfter = false) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    await window.mycel.upsertNote({
      ...note,
      title: title.trim(),
      body: noteBodyHasContent(body) ? noteBodyPlainToHtml(body) : '',
      tags,
      updatedAt: Date.now()
    })
    fetchNotes()
    if (closeAfter) onClose()
  }, [note, title, body, tags, fetchNotes, onClose])

  const debouncedPersist = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => { void persist() }, 2000)
  }, [persist])

  const flushSave = useCallback(async () => {
    await persist(false)
  }, [persist])

  useFlushOnLeave(flushSave, { watchCreateView: true })

  const save = useCallback(async () => {
    await persist(true)
  }, [persist])

  const handleDelete = async () => {
    if (!confirm('Delete this note?')) return
    await window.mycel.deleteNote(note.id)
    fetchNotes()
    onClose()
  }

  return (
    <motion.div
      initial={{ scale: 0.98, opacity: 0.8 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      style={{
        border: '1px solid var(--accent)',
        borderRadius: 12,
        background: 'var(--surface)',
        overflow: 'hidden'
      }}
    >
      <input
        ref={titleRef}
        value={title}
        onChange={(e) => { setTitle(e.target.value); debouncedPersist() }}
        placeholder="Title"
        onKeyDown={(e) => { if (e.key === 'Escape') save() }}
        onBlur={() => { void flushSave() }}
        style={{
          width: '100%', padding: '16px 16px 0',
          border: 'none', background: 'none', outline: 'none',
          fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 600,
          color: 'var(--text)', lineHeight: 1.3
        }}
      />
      <textarea
        value={body}
        onChange={(e) => { setBody(e.target.value); debouncedPersist() }}
        placeholder="Start writing..."
        rows={5}
        onKeyDown={(e) => { if (e.key === 'Escape') save() }}
        onBlur={() => { void flushSave() }}
        style={{
          width: '100%', padding: '8px 16px',
          border: 'none', background: 'none', outline: 'none', resize: 'none',
          fontFamily: 'var(--font-ui)', fontSize: 14, lineHeight: 1.7,
          color: 'var(--text)'
        }}
      />
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px 12px', gap: 8
      }}>
        <div style={{ flex: 1 }}>
          <TagPicker
            tags={tags}
            onChange={(next) => {
              setTags(next)
              debouncedPersist()
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <motion.button
            onClick={handleDelete}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={{
              background: 'none', color: 'var(--text-muted)', border: 'none',
              cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-ui)',
              padding: '5px 8px', borderRadius: 6, transition: 'color 150ms ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#D93025' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            Delete
          </motion.button>
          <motion.button
            onClick={save}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            style={{
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 6, padding: '5px 14px', cursor: 'pointer',
              fontSize: 12, fontFamily: 'var(--font-ui)', fontWeight: 500
            }}
          >
            Save
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main Notes Page ──────────────────────────────────
export function Notes(): React.JSX.Element {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; noteId: string; tag: string } | null>(null)

  const notes = useNotesStore((s) => s.notes)
  const fetchNotes = useNotesStore((s) => s.fetch)
  const selectedTags = useNotesStore((s) => s.selectedTags)
  const toggleTag = useNotesStore((s) => s.toggleTag)
  const clearTags = useNotesStore((s) => s.clearTags)
  const selectedMonth = useNotesStore((s) => s.selectedMonth)
  const setSelectedMonth = useNotesStore((s) => s.setSelectedMonth)

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const note of notes) {
      for (const tag of note.tags) tagSet.add(tag)
    }
    return Array.from(tagSet).sort()
  }, [notes])

  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>()
    for (const note of notes) {
      const d = new Date(note.createdAt)
      monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return Array.from(monthSet).sort().reverse()
  }, [notes])

  const filteredNotes = useMemo(() => {
    let filtered = notes
    if (selectedTags.length > 0) {
      filtered = filtered.filter((note) => selectedTags.every((tag) => note.tags.includes(tag)))
    }
    if (selectedMonth) {
      filtered = filtered.filter((note) => {
        const d = new Date(note.createdAt)
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return m === selectedMonth
      })
    }
    return filtered
  }, [notes, selectedTags, selectedMonth])

  const groupedNotes = useMemo(() => {
    const sorted = [...filteredNotes].sort((a, b) => b.createdAt - a.createdAt)
    const groups: { label: string; notes: Note[] }[] = []
    let currentLabel = ''
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const yesterdayStart = todayStart - 86400000
    const thisYear = now.getFullYear()

    for (const note of sorted) {
      const d = new Date(note.createdAt)
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

      let label: string
      if (dayStart === todayStart) {
        label = 'Today'
      } else if (dayStart === yesterdayStart) {
        label = 'Yesterday'
      } else if (d.getFullYear() === thisYear) {
        label = format(d, 'MMMM d')
      } else {
        label = format(d, 'MMMM d, yyyy')
      }

      if (label !== currentLabel) {
        currentLabel = label
        groups.push({ label, notes: [note] })
      } else {
        groups[groups.length - 1].notes.push(note)
      }
    }
    return groups
  }, [filteredNotes])

  const handleRemoveTag = useCallback(async (noteId: string, tag: string) => {
    const note = notes.find((n) => n.id === noteId)
    if (!note) return
    await window.mycel.upsertNote({
      ...note,
      tags: note.tags.filter((t) => t !== tag),
      updatedAt: Date.now()
    })
    fetchNotes()
    setContextMenu(null)
  }, [notes, fetchNotes])

  const hasNotes = notes.length > 0
  const hasTags = allTags.length > 0

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '32px 24px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {!hasNotes ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: 400, gap: 16
          }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: 'var(--text-muted)' }}>
              Nothing here yet
            </span>
            <NoteComposer onSave={fetchNotes} />
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 24 }}>
              <NoteComposer onSave={fetchNotes} />
            </div>

            {availableMonths.length > 1 && (
              <div style={{ marginBottom: 12 }}>
                <MonthFilter months={availableMonths} selectedMonth={selectedMonth} onSelect={setSelectedMonth} />
              </div>
            )}

            {hasTags && (
              <div style={{ marginBottom: 24 }}>
                <TagFilter tags={allTags} selectedTags={selectedTags} onToggle={toggleTag} onClear={clearTags} />
              </div>
            )}

            {groupedNotes.map((group) => (
              <div key={group.label} style={{ marginBottom: 32 }}>
                <div style={{
                  fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  color: 'var(--text-muted)', marginBottom: 12
                }}>
                  {group.label.toUpperCase()}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {group.notes.map((note, index) => (
                    editingNoteId === note.id ? (
                      <InlineNoteEditor
                        key={note.id}
                        note={note}
                        onClose={() => setEditingNoteId(null)}
                      />
                    ) : (
                      <motion.button
                        key={note.id}
                        {...fadeUp}
                        transition={{ ...fadeUp.transition, delay: index * 0.03 }}
                        onClick={() => setEditingNoteId(note.id)}
                        whileHover={{ scale: 1.01, y: -2 }}
                        whileTap={{ scale: 0.99 }}
                        style={{
                          background: 'var(--surface)', border: 'none', borderRadius: 12,
                          padding: 24, cursor: 'pointer', width: '100%', textAlign: 'left',
                          display: 'flex', flexDirection: 'column', gap: 12
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
                          {note.title && (
                            <span style={{
                              fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 600,
                              color: 'var(--text)', lineHeight: 1.3, flex: 1, minWidth: 0
                            }}>
                              {note.title}
                            </span>
                          )}
                          <span style={{
                            fontFamily: 'var(--font-ui)', fontSize: 11,
                            color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0
                          }}>
                            {format(new Date(note.createdAt), 'MMM d')}
                          </span>
                        </div>

                        {(note.bodyPreview || (note.body && note.body !== '<p></p>')) && (
                          note.bodyPreview ? (
                            <p style={{
                              fontFamily: 'var(--font-ui)', fontSize: 14,
                              lineHeight: 1.7, color: 'var(--text)', overflow: 'hidden',
                              margin: 0
                            }}>
                              {note.bodyPreview}
                            </p>
                          ) : (
                          <div
                            className="note-body-preview"
                            dangerouslySetInnerHTML={{ __html: note.body }}
                            style={{
                              fontFamily: 'var(--font-ui)', fontSize: 14,
                              lineHeight: 1.7, color: 'var(--text)', overflow: 'hidden'
                            }}
                          />
                          )
                        )}

                        {note.tags.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                            {note.tags.map((tag) => {
                              const color = getTagColor(tag)
                              return (
                                <motion.span
                                  key={tag}
                                  whileHover={{ scale: 1.08 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                  onContextMenu={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setContextMenu({ x: e.clientX, y: e.clientY, noteId: note.id, tag })
                                  }}
                                  style={{
                                    display: 'inline-block', background: color.bg, color: color.text,
                                    borderRadius: 20, padding: '3px 10px', fontSize: 11,
                                    fontFamily: 'var(--font-ui)', fontWeight: 500, whiteSpace: 'nowrap'
                                  }}
                                >
                                  {tag}
                                </motion.span>
                              )
                            })}
                          </div>
                        )}
                      </motion.button>
                    )
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Tag context menu */}
      <AnimatePresence>
        {contextMenu && (
          <TagContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            tag={contextMenu.tag}
            onDelete={() => handleRemoveTag(contextMenu.noteId, contextMenu.tag)}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
