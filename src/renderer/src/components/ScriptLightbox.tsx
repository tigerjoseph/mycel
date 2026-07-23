import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import LinkExtension from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import { Bold, Minus, Plus, X } from 'lucide-react'
import { spring } from '../styles/animation'
import { FloatingToolbar } from './FloatingToolbar'
import type { ContentScript } from '@shared/types'

type ReadSize = 'normal' | 'large' | 'xlarge'
const READ_SIZES: ReadSize[] = ['normal', 'large', 'xlarge']

interface ScriptLightboxProps {
  script: ContentScript
  onClose: () => void
  onSaved: (script: ContentScript) => void
  onDelete?: () => void
}

export function ScriptLightbox({
  script,
  onClose,
  onSaved,
  onDelete
}: ScriptLightboxProps): React.JSX.Element {
  const [title, setTitle] = useState(script.title)
  const [readBold, setReadBold] = useState(false)
  const [readSize, setReadSize] = useState<ReadSize>('normal')
  const scriptRef = useRef(script)
  const titleRef = useRef(title)
  const bodyRef = useRef(script.body || '<p></p>')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  scriptRef.current = script
  titleRef.current = title

  useEffect(() => {
    setTitle(script.title)
    bodyRef.current = script.body || '<p></p>'
  }, [script.id, script.title, script.body])

  const flushSave = useCallback(async () => {
    const saved = (await window.mycel.upsertContentScript({
      ...scriptRef.current,
      title: titleRef.current.trim() || 'Untitled script',
      body: bodyRef.current,
      updatedAt: Date.now()
    })) as ContentScript
    onSaved(saved)
  }, [onSaved])

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { void flushSave() }, 600)
  }, [flushSave])

  const extensions = useMemo(
    () => [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false, underline: false }),
      Underline,
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing your script…' }),
      Typography
    ],
    [script.id]
  )

  const editor = useEditor(
    {
      extensions,
      content: script.body || '<p></p>',
      onUpdate: ({ editor: ed }) => {
        bodyRef.current = ed.getHTML()
        scheduleSave()
      },
      editorProps: {
        attributes: {
          class: 'tiptap',
          spellcheck: 'true',
          style: 'outline: none; min-height: 100%;'
        }
      }
    },
    [script.id]
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape' && !e.metaKey && !e.ctrlKey) {
        e.stopPropagation()
        void flushSave().then(onClose)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose, flushSave])

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
  }, [])

  const bumpSize = (dir: 1 | -1): void => {
    const idx = READ_SIZES.indexOf(readSize)
    setReadSize(READ_SIZES[Math.min(READ_SIZES.length - 1, Math.max(0, idx + dir))])
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
        onClick={() => { void flushSave().then(onClose) }}
      >
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.98 }}
          transition={spring}
          onClick={(e) => e.stopPropagation()}
          className="script-lightbox"
          data-read-bold={readBold ? 'true' : 'false'}
          data-read-size={readSize}
          style={{
            width: 'min(560px, 100%)',
            height: 'min(78vh, 640px)',
            background: 'var(--bg)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            boxShadow: '0 20px 64px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
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
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                titleRef.current = e.target.value
                scheduleSave()
              }}
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
              onClick={() => { void flushSave().then(onClose) }}
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
              padding: '0 18px 56px',
              minHeight: 0
            }}
          >
            {editor && <FloatingToolbar editor={editor} />}
            <EditorContent editor={editor} />
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              padding: '4px 6px',
              borderRadius: 999,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            <span style={readLabel}>Read</span>
            <div style={divider} />
            <button
              onClick={() => setReadBold((b) => !b)}
              aria-label="Bold"
              aria-pressed={readBold}
              style={{
                ...toolBtn,
                background: readBold ? 'var(--text)' : 'transparent',
                color: readBold ? 'var(--bg)' : 'var(--text)'
              }}
            >
              <Bold size={12} />
            </button>
            <button onClick={() => bumpSize(-1)} aria-label="Smaller" style={toolBtn}>
              <Minus size={12} />
            </button>
            <button onClick={() => bumpSize(1)} aria-label="Larger" style={toolBtn}>
              <Plus size={12} />
            </button>
            {onDelete && (
              <>
                <div style={divider} />
                <button
                  onClick={() => { if (window.confirm('Delete this script?')) onDelete() }}
                  style={{ ...toolBtn, fontSize: 10, fontFamily: 'var(--font-ui)', color: '#D93025', padding: '0 7px' }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
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

const toolBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '5px 7px',
  cursor: 'pointer',
  color: 'var(--text)',
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const readLabel: React.CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontSize: 9,
  fontWeight: 600,
  color: 'var(--text-muted)',
  padding: '0 5px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
}

const divider: React.CSSProperties = {
  width: 1,
  height: 16,
  background: 'var(--border)'
}
