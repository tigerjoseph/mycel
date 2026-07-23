import { Upload, FileText, Trash2, ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fadeUp, pageEnter } from '../styles/animation'
import { CorpusChooser } from '../components/CorpusChooser'
import { LibraryFeed } from './LibraryFeed'
import { useUIStore } from '../store/ui'
import type { Atom, AtomKind, Meeting } from '@shared/types'

const KIND_LABELS: Record<AtomKind, string> = {
  frame: 'Frame',
  insight: 'Insight',
  quote: 'Quote',
  action: 'Action'
}

const KIND_COLORS: Record<AtomKind, string> = {
  frame: 'var(--accent)',
  insight: 'var(--text)',
  quote: '#6366f1',
  action: '#16a34a'
}

type MeetingGroup = Meeting & { atoms: Atom[] }

export function Corpus(): React.JSX.Element {
  const libraryView = useUIStore((s) => s.libraryView)
  const showCopyFeedback = useUIStore((s) => s.showCopyFeedback)
  const setPage = useUIStore((s) => s.setPage)
  const setCreateView = useUIStore((s) => s.setCreateView)
  const setActiveDocId = useUIStore((s) => s.setActiveDocId)
  const setDocsView = useUIStore((s) => s.setDocsView)
  const activeDocId = useUIStore((s) => s.activeDocId)
  const extractionsFocus = useUIStore((s) => s.extractionsFocus)
  const setExtractionsFocus = useUIStore((s) => s.setExtractionsFocus)

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [atoms, setAtoms] = useState<Atom[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [highlightedAtomId, setHighlightedAtomId] = useState<string | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteTitle, setPasteTitle] = useState('')
  const [importing, setImporting] = useState(false)
  const [chooserOpen, setChooserOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [hasGoogleKey, setHasGoogleKey] = useState(false)

  const load = useCallback(async () => {
    const [m, a] = await Promise.all([
      window.mycel.getMeetings(),
      window.mycel.getAtoms()
    ])
    setMeetings(m)
    setAtoms(a)
    setExpanded((prev) => {
      const next = new Set(prev)
      for (const meeting of m) next.add(meeting.id)
      return next
    })
  }, [])

  useEffect(() => {
    load().catch(() => {})
    window.mycel.getSettings().then((s) => {
      setHasGoogleKey(typeof s.googleApiKey === 'string' && s.googleApiKey.length > 0)
    })
  }, [load])

  // Jump to and highlight an atom requested from search (Cmd+K)
  useEffect(() => {
    if (!extractionsFocus || libraryView !== 'extractions') return
    const { meetingId, atomId } = extractionsFocus
    setExpanded((prev) => new Set(prev).add(meetingId))
    setHighlightedAtomId(atomId)
    const timer = setTimeout(() => {
      document.querySelector(`[data-atom-id="${atomId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
    const clear = setTimeout(() => setHighlightedAtomId(null), 2200)
    setExtractionsFocus(null)
    return () => {
      clearTimeout(timer)
      clearTimeout(clear)
    }
  }, [extractionsFocus, libraryView, setExtractionsFocus])

  const groups = useMemo<MeetingGroup[]>(() => {
    const byMeeting = new Map<string, Atom[]>()
    for (const atom of atoms) {
      const list = byMeeting.get(atom.meetingId) ?? []
      list.push(atom)
      byMeeting.set(atom.meetingId, list)
    }
    return meetings.map((meeting) => ({
      ...meeting,
      atoms: (byMeeting.get(meeting.id) ?? []).sort((a, b) => a.position - b.position)
    }))
  }, [meetings, atoms])

  const toggleAtom = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleMeeting = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const runImport = useCallback(async (fn: () => Promise<unknown>) => {
    setImporting(true)
    try {
      await fn()
      await load()
      showCopyFeedback('Imported')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed'
      showCopyFeedback(msg)
    } finally {
      setImporting(false)
      setPasteText('')
      setPasteTitle('')
      setPasteOpen(false)
    }
  }, [load, showCopyFeedback])

  const handlePasteImport = useCallback(() => {
    const text = pasteText.trim()
    if (!text) return
    void runImport(() =>
      window.mycel.importTranscript({ text, title: pasteTitle.trim() || undefined })
    )
  }, [pasteText, pasteTitle, runImport])

  const handlePickFiles = useCallback(() => {
    void runImport(() => window.mycel.pickAndImport())
  }, [runImport])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const paths = Array.from(e.dataTransfer.files)
      .map((f) => (f as File & { path?: string }).path)
      .filter((p): p is string => Boolean(p))
    if (paths.length === 0) return
    void runImport(() => window.mycel.importPaths(paths))
  }, [runImport])

  const handleDeleteMeeting = useCallback(async (id: string) => {
    await window.mycel.deleteMeeting(id)
    setSelected((prev) => {
      const meetingAtomIds = new Set(atoms.filter((a) => a.meetingId === id).map((a) => a.id))
      return new Set([...prev].filter((atomId) => !meetingAtomIds.has(atomId)))
    })
    await load()
  }, [atoms, load])

  const openDoc = useCallback((docId: string) => {
    setPage('create')
    setCreateView('docs')
    setActiveDocId(docId)
    setDocsView('editor')
  }, [setPage, setCreateView, setActiveDocId, setDocsView])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <AnimatePresence mode="wait" initial={false}>
        {libraryView === 'mindspace' ? (
          <motion.div
            key="mindspace"
            initial={pageEnter.initial}
            animate={pageEnter.animate}
            exit={pageEnter.exit}
            transition={pageEnter.transition}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <LibraryFeed />
          </motion.div>
        ) : (
          <motion.div
            key="extractions"
            initial={pageEnter.initial}
            animate={pageEnter.animate}
            exit={pageEnter.exit}
            transition={pageEnter.transition}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
      {dragOver && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.04)',
          border: '2px dashed var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, color: 'var(--accent)', fontWeight: 600 }}>
            Drop transcript or voice note
          </span>
        </div>
      )}

      <div style={{ maxWidth: 820, margin: '0 auto', width: '100%', padding: '28px 24px 120px', flex: 1, overflow: 'auto' }}>
        <motion.div {...fadeUp}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text)' }}>
                Extractions
              </h1>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                Drop voice notes or transcripts — Mycel extracts quotes, insights, and actions.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => setPasteOpen((v) => !v)}
                disabled={importing}
                style={actionBtnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-muted)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <FileText size={14} />
                Paste
              </button>
              <button
                onClick={handlePickFiles}
                disabled={importing}
                style={{ ...actionBtnStyle, background: 'var(--text)', color: 'var(--bg)', borderColor: 'var(--text)' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
              >
                <Upload size={14} />
                {importing ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>

          {!hasGoogleKey && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: 'var(--surface)', border: '1px solid var(--border)',
              fontSize: 12, fontFamily: 'var(--font-ui)', color: 'var(--text-muted)'
            }}>
              <Sparkles size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
              Add a Google AI Studio key in Settings for smarter atom extraction and optional Gemini drafts.
              Without it, imports split into paragraphs.
            </div>
          )}

          <AnimatePresence>
            {pasteOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden', marginBottom: 20 }}
              >
                <div style={{ padding: 16, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                  <input
                    value={pasteTitle}
                    onChange={(e) => setPasteTitle(e.target.value)}
                    placeholder="Title (optional)"
                    style={inputStyle}
                  />
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste transcript or voice-note text…"
                    rows={8}
                    style={{ ...inputStyle, marginTop: 8, resize: 'vertical', minHeight: 120 }}
                  />
                  <button
                    onClick={handlePasteImport}
                    disabled={importing || !pasteText.trim()}
                    style={{
                      marginTop: 10, padding: '8px 14px', borderRadius: 6, border: 'none',
                      background: 'var(--text)', color: 'var(--bg)', cursor: 'pointer',
                      fontSize: 13, fontFamily: 'var(--font-ui)', fontWeight: 500,
                      opacity: importing || !pasteText.trim() ? 0.5 : 1
                    }}
                  >
                    Extract atoms
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {groups.length === 0 && !importing && (
            <div style={{
              border: '1px dashed var(--border)', borderRadius: 12, padding: '48px 24px',
              textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 14
            }}>
              Drop a .txt transcript, paste text, or import a voice note (.m4a, .mp3, .wav).
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {groups.map((group) => (
              <section key={group.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <button
                    onClick={() => toggleMeeting(group.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex' }}
                  >
                    {expanded.has(group.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                      {group.title || 'Untitled'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
                      {group.atoms.length} {group.atoms.length === 1 ? 'extraction' : 'extractions'} · {new Date(group.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => void handleDeleteMeeting(group.id)}
                    title="Delete import"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {expanded.has(group.id) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 24 }}>
                    {group.atoms.map((atom) => {
                      const isSelected = selected.has(atom.id)
                      const isHighlighted = highlightedAtomId === atom.id
                      return (
                        <button
                          key={atom.id}
                          data-atom-id={atom.id}
                          onClick={() => toggleAtom(atom.id)}
                          style={{
                            textAlign: 'left', padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                            border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                            background: isHighlighted ? 'var(--surface)' : isSelected ? 'var(--bg)' : 'var(--surface)',
                            boxShadow: isHighlighted ? '0 0 0 2px var(--accent)' : 'none',
                            transition: 'border-color 150ms ease, background 150ms ease, box-shadow 150ms ease'
                          }}
                        >
                          <span style={{
                            fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                            color: KIND_COLORS[atom.kind], fontFamily: 'var(--font-ui)'
                          }}>
                            {KIND_LABELS[atom.kind]}
                          </span>
                          <p style={{
                            margin: '6px 0 0', fontSize: 14, lineHeight: 1.55,
                            color: 'var(--text)', fontFamily: 'var(--font-ui)'
                          }}>
                            {atom.text}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            style={{
              position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
              background: 'var(--text)', color: 'var(--bg)', borderRadius: 10, zIndex: 100,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <span style={{ fontSize: 13, fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
              {selected.size} selected
            </span>
            <button
              onClick={() => setChooserOpen(true)}
              style={{
                padding: '6px 12px', borderRadius: 6, border: 'none',
                background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer',
                fontSize: 12, fontFamily: 'var(--font-ui)', fontWeight: 600
              }}
            >
              New doc from selection…
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <CorpusChooser
        open={chooserOpen}
        atomIds={[...selected]}
        hasGoogleKey={hasGoogleKey}
        activeDocId={activeDocId}
        onClose={() => setChooserOpen(false)}
        onCreated={(docId) => {
          setChooserOpen(false)
          setSelected(new Set())
          openDoc(docId)
        }}
      />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const actionBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'var(--font-ui)',
  fontWeight: 500,
  color: 'var(--text)',
  transition: 'border-color 150ms ease, opacity 150ms ease'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  fontSize: 13,
  fontFamily: 'var(--font-ui)',
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box'
}
