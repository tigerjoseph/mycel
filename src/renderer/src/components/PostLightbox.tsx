import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import LinkExtension from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import { X } from 'lucide-react'
import type { Doc } from '@shared/types'
import { spring } from '../styles/animation'
import { FloatingToolbar } from './FloatingToolbar'
import { useFlushOnLeave } from '../hooks/useFlushOnLeave'

interface PostLightboxProps {
  post: Doc
  onClose: () => void
  onSaved: (doc: Doc) => void
}

export function PostLightbox({ post, onClose, onSaved }: PostLightboxProps): React.JSX.Element {
  const [full, setFull] = useState<Doc | null>(null)
  const [title, setTitle] = useState(post.title)
  const fullRef = useRef<Doc | null>(null)
  const titleRef = useRef(post.title)
  const bodyRef = useRef('<p></p>')
  const titleDirtyRef = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const flushSave = useCallback(async () => {
    const current = fullRef.current
    if (!current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const nextTitle = titleRef.current
    const nextBody = bodyRef.current
    if (nextTitle === current.title && nextBody === (current.body || '<p></p>')) return
    const saved = await window.mycel.upsertDoc({
      ...current,
      title: nextTitle,
      body: nextBody,
      updatedAt: Date.now()
    })
    fullRef.current = saved
    onSaved(saved)
  }, [onSaved])

  const scheduleSave = useCallback(() => {
    if (!fullRef.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { void flushSave() }, 500)
  }, [flushSave])

  useFlushOnLeave(flushSave)

  useEffect(() => {
    let cancelled = false
    window.mycel.getDoc(post.id).then((doc) => {
      if (cancelled || !doc) return
      fullRef.current = doc
      bodyRef.current = doc.body || '<p></p>'
      setFull(doc)
      if (!titleDirtyRef.current) {
        setTitle(doc.title)
        titleRef.current = doc.title
      }
    })
    const focusTimer = window.setTimeout(() => {
      if (!titleRef.current.trim()) titleInputRef.current?.focus()
    }, 40)
    return () => {
      cancelled = true
      window.clearTimeout(focusTimer)
    }
  }, [post.id])

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

  const close = (): void => {
    void flushSave().then(onClose)
  }

  const onBody = useCallback((html: string) => {
    bodyRef.current = html
    scheduleSave()
  }, [scheduleSave])

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 28
        }}
        data-ui-overlay=""
        onClick={close}
      >
        <motion.div
          initial={{ y: 16, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 12, opacity: 0, scale: 0.98 }}
          transition={spring}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 'min(760px, 100%)',
            height: 'min(84vh, 820px)',
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
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '16px 18px 8px',
              flexShrink: 0
            }}
          >
            <input
              ref={titleInputRef}
              value={title}
              onChange={(e) => {
                titleDirtyRef.current = true
                setTitle(e.target.value)
                titleRef.current = e.target.value
                scheduleSave()
              }}
              placeholder="Untitled post"
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontFamily: 'var(--font-heading)',
                fontSize: 26,
                fontWeight: 600,
                color: 'var(--text)',
                outline: 'none',
                letterSpacing: '-0.02em',
                lineHeight: 1.25
              }}
            />
            <button type="button" onClick={close} aria-label="Close" style={iconBtn}>
              <X size={16} />
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '0 22px 28px', minHeight: 0 }}>
            {full ? <PostBodyEditor key={full.id} doc={full} onHtml={onBody} /> : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

function PostBodyEditor({
  doc,
  onHtml
}: {
  doc: Doc
  onHtml: (html: string) => void
}): React.JSX.Element {
  const onHtmlRef = useRef(onHtml)
  onHtmlRef.current = onHtml

  const extensions = useMemo(
    () => [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false, underline: false }),
      Underline,
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
      Typography
    ],
    []
  )

  const editor = useEditor({
    extensions,
    content: doc.body || '<p></p>',
    onUpdate: ({ editor: ed }) => {
      if (!ed.isFocused) return
      onHtmlRef.current(ed.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'tiptap',
        spellcheck: 'true',
        style: 'outline: none; min-height: 100%;'
      }
    }
  })

  return (
    <>
      {editor && <FloatingToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </>
  )
}

const iconBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 6,
  cursor: 'pointer',
  color: 'var(--text-muted)',
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  marginTop: 4
}
