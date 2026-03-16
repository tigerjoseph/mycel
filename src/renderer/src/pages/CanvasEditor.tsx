import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'motion/react'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { ArrowLeft } from 'lucide-react'
import { useUIStore } from '../store/ui'
import { fadeUp } from '../styles/animation'
import type { Doc } from '@shared/types'

export function CanvasEditor(): React.JSX.Element {
  const activeDocId = useUIStore((s) => s.activeDocId)
  const setDocsView = useUIStore((s) => s.setDocsView)
  const setActiveDocId = useUIStore((s) => s.setActiveDocId)
  const [doc, setDoc] = useState<Doc | null>(null)
  const [title, setTitle] = useState('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorRef = useRef<any>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    if (!activeDocId) return
    window.mycel.getDoc(activeDocId).then((d) => {
      if (!isMountedRef.current) return
      if (d) {
        setDoc(d)
        setTitle(d.title)
      }
    })
    return () => { isMountedRef.current = false }
  }, [activeDocId])

  const saveCanvas = useCallback(async (updates: Partial<Doc>) => {
    if (!doc) return
    const updated = { ...doc, ...updates, updatedAt: Date.now() }
    await window.mycel.upsertDoc(updated)
    if (isMountedRef.current) setDoc(updated)
  }, [doc])

  const debouncedSave = useCallback((updates: Partial<Doc>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveCanvas(updates), 2000)
  }, [saveCanvas])

  const handleMount = useCallback((editor: any) => {
    editorRef.current = editor
    // Load snapshot if we have saved data
    if (doc?.body) {
      try {
        const snapshot = JSON.parse(doc.body)
        editor.loadSnapshot(snapshot)
      } catch {
        // Fresh canvas if parse fails
      }
    }
    // Listen for changes
    const cleanup = editor.store.listen(() => {
      const snapshot = editor.getSnapshot()
      debouncedSave({ body: JSON.stringify(snapshot) })
    }, { scope: 'document', source: 'user' })
    return cleanup
  }, [doc?.body, debouncedSave])

  const handleBack = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    // Force save current canvas state
    if (doc && editorRef.current) {
      const snapshot = editorRef.current.getSnapshot()
      await window.mycel.upsertDoc({ ...doc, title, body: JSON.stringify(snapshot), updatedAt: Date.now() })
    }
    setActiveDocId(null)
    setDocsView('home')
  }, [doc, title, setActiveDocId, setDocsView])

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    debouncedSave({ title: newTitle })
  }, [debouncedSave])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') handleBack()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleBack])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  return (
    <motion.div
      style={{
        height: '100%',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column'
      }}
      {...fadeUp}
    >
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 24px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0
      }}>
        <button
          onClick={handleBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontFamily: 'Inter, sans-serif',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: 0,
            transition: 'color 150ms ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <ArrowLeft size={14} />
          Docs
        </button>
        <input
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled canvas"
          className="font-heading"
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text)',
            background: 'transparent',
            border: 'none',
            outline: 'none'
          }}
        />
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        {doc && <Tldraw onMount={handleMount} />}
      </div>
    </motion.div>
  )
}
