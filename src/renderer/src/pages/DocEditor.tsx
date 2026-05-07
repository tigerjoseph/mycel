import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'motion/react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import LinkExtension from '@tiptap/extension-link'
import ImageExtension from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Typography from '@tiptap/extension-typography'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { Table as TableExtension } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { ArrowLeft, FolderClosed, MoreHorizontal, Copy, Files, Trash2 } from 'lucide-react'
import { useUIStore } from '../store/ui'
import { useDocsStore } from '../store/docs'
import { fadeUp } from '../styles/animation'
import { FloatingToolbar } from '../components/FloatingToolbar'
import { SlashCommands } from '../components/SlashMenu'
import { EmojiPicker } from '../components/EmojiPicker'
import type { Doc } from '@shared/types'

export function DocEditor(): React.JSX.Element {
  const activeDocId = useUIStore((s) => s.activeDocId)
  const setDocsView = useUIStore((s) => s.setDocsView)
  const setActiveDocId = useUIStore((s) => s.setActiveDocId)
  const [doc, setDoc] = useState<Doc | null>(null)
  const [title, setTitle] = useState('')
  const [savedIndicator, setSavedIndicator] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const indicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)
  const folders = useDocsStore((s) => s.folders)
  const fetchFolders = useDocsStore((s) => s.fetchFolders)
  const [folderMenuOpen, setFolderMenuOpen] = useState(false)
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false)
  const folderMenuRef = useRef<HTMLDivElement>(null)
  const settingsMenuRef = useRef<HTMLDivElement>(null)

  // Load doc on mount
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
    return () => {
      isMountedRef.current = false
    }
  }, [activeDocId])

  useEffect(() => { fetchFolders() }, [fetchFolders])

  useEffect(() => {
    if (!folderMenuOpen && !settingsMenuOpen) return
    const handleClick = (e: MouseEvent): void => {
      if (folderMenuOpen && folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) {
        setFolderMenuOpen(false)
      }
      if (settingsMenuOpen && settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setSettingsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [folderMenuOpen, settingsMenuOpen])

  const showSaved = useCallback(() => {
    setSavedIndicator(true)
    if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current)
    indicatorTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) setSavedIndicator(false)
    }, 1500)
  }, [])

  const saveDoc = useCallback(
    async (updates: Partial<Doc>) => {
      if (!doc) return
      const updated = { ...doc, ...updates, updatedAt: Date.now() }
      await window.mycel.upsertDoc(updated)
      if (isMountedRef.current) {
        setDoc(updated)
        showSaved()
      }
    },
    [doc, showSaved]
  )

  const debouncedSave = useCallback(
    (updates: Partial<Doc>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveDoc(updates)
      }, 2000)
    },
    [saveDoc]
  )

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] }
        }),
        Underline,
        LinkExtension.configure({
          openOnClick: false,
          HTMLAttributes: {
            style: 'color: var(--accent); text-decoration: underline;'
          }
        }),
        ImageExtension,
        TaskList,
        TaskItem.configure({ nested: true }),
        Placeholder.configure({ placeholder: 'Type / for commands...' }),
        CharacterCount,
        Typography,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Color,
        TextStyle,
        TableExtension.configure({ resizable: true }),
        TableRow,
        TableCell,
        TableHeader,
        SlashCommands
      ],
      content: doc?.body || '',
      onUpdate: ({ editor: ed }) => {
        debouncedSave({ body: ed.getHTML() })
      },
      editorProps: {
        attributes: {
          spellcheck: 'true',
          style: [
            'outline: none',
            'font-family: Inter, sans-serif',
            'font-size: 15px',
            'line-height: 1.8',
            'color: var(--text)',
            'max-width: 760px',
            'margin: 0 auto',
            'padding: 0 40px 120px'
          ].join('; ')
        }
      }
    },
    [doc?.id]
  )

  const handleDelete = useCallback(async () => {
    if (!doc) return
    if (!confirm('Delete this document? This cannot be undone.')) return
    await window.mycel.deleteDoc(doc.id)
    setActiveDocId(null)
    setDocsView('home')
  }, [doc, setActiveDocId, setDocsView])

  const handleDuplicate = useCallback(async () => {
    if (!doc || !editor) return
    const { nanoid } = await import('nanoid')
    const copy = await window.mycel.upsertDoc({
      id: nanoid(),
      title: doc.title ? `${doc.title} (copy)` : '',
      body: editor.getHTML(),
      type: doc.type,
      folderId: doc.folderId,
      icon: doc.icon,
      coverImage: doc.coverImage,
      isTemplate: false,
      isFavorite: false,
      favoriteOrder: null,
      tags: doc.tags,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    setActiveDocId(copy.id)
    setSettingsMenuOpen(false)
  }, [doc, editor, setActiveDocId])

  const handleCopyText = useCallback(async () => {
    if (!editor) return
    const text = editor.getText()
    await navigator.clipboard.writeText(text)
    setSettingsMenuOpen(false)
    showSaved()
  }, [editor, showSaved])

  // Title change handler with debounced save
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value
      setTitle(newTitle)
      debouncedSave({ title: newTitle })
    },
    [debouncedSave]
  )

  const handleBack = useCallback(async () => {
    // Flush any pending save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    // Force save current state
    if (doc && editor) {
      const currentBody = editor.getHTML()
      if (title !== doc.title || currentBody !== doc.body) {
        await window.mycel.upsertDoc({ ...doc, title, body: currentBody, updatedAt: Date.now() })
      }
    }
    setActiveDocId(null)
    setDocsView('home')
  }, [doc, editor, title, setActiveDocId, setDocsView])

  // Immediate save on blur (for title)
  const handleTitleBlur = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (doc && title !== doc.title) {
      saveDoc({ title })
    }
  }, [doc, title, saveDoc])

  // Escape key to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') handleBack()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleBack])

  // Word count
  const wordCount = editor?.storage.characterCount?.words() ?? 0

  return (
    <motion.div
      style={{
        height: '100%',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
      {...fadeUp}
    >
      {/* Saved indicator */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: savedIndicator ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="font-ui"
        style={{
          position: 'absolute',
          top: 16,
          right: 24,
          fontSize: 11,
          color: 'var(--text-muted)',
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        Saved
      </motion.span>

      {/* Editor area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{
          flex: 1,
          overflowY: 'auto',
          maxWidth: 760,
          margin: '0 auto',
          width: '100%',
          paddingTop: 48
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px 24px' }}>
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
              transition: 'color 150ms ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <ArrowLeft size={14} />
            Docs
          </button>

          {/* Right-side actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

          {/* Move to folder */}
          <div style={{ position: 'relative' }} ref={folderMenuRef}>
            <button
              onClick={() => setFolderMenuOpen(!folderMenuOpen)}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'Inter, sans-serif',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                transition: 'color 150ms ease, border-color 150ms ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text-muted)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <FolderClosed size={12} />
              {doc?.folderId ? folders.find((f) => f.id === doc.folderId)?.name ?? 'Folder' : 'Move to folder'}
            </button>

            {folderMenuOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 6,
                minWidth: 180,
                zIndex: 20,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}>
                {doc?.folderId && (
                  <button
                    onClick={() => {
                      saveDoc({ folderId: null })
                      setFolderMenuOpen(false)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '7px 10px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontFamily: 'Inter, sans-serif',
                      color: 'var(--text-muted)',
                      borderRadius: 6,
                      transition: 'background 100ms ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                  >
                    Remove from folder
                  </button>
                )}
                {folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      saveDoc({ folderId: f.id })
                      setFolderMenuOpen(false)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '7px 10px',
                      background: doc?.folderId === f.id ? 'var(--border)' : 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontFamily: 'Inter, sans-serif',
                      color: doc?.folderId === f.id ? 'var(--text)' : 'var(--text)',
                      fontWeight: doc?.folderId === f.id ? 500 : 400,
                      borderRadius: 6,
                      transition: 'background 100ms ease'
                    }}
                    onMouseEnter={(e) => { if (doc?.folderId !== f.id) e.currentTarget.style.background = 'var(--border)' }}
                    onMouseLeave={(e) => { if (doc?.folderId !== f.id) e.currentTarget.style.background = 'none' }}
                  >
                    <FolderClosed size={12} style={{ color: 'var(--text-muted)' }} />
                    {f.name}
                  </button>
                ))}
                {folders.length === 0 && (
                  <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', color: 'var(--text-muted)', padding: '7px 10px', display: 'block' }}>
                    No folders yet
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Settings menu */}
          <div style={{ position: 'relative' }} ref={settingsMenuRef}>
            <button
              onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 6,
                cursor: 'pointer',
                padding: '4px 6px',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-muted)',
                transition: 'color 150ms ease, border-color 150ms ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text-muted)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <MoreHorizontal size={14} />
            </button>

            {settingsMenuOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 6,
                minWidth: 180,
                zIndex: 20,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}>
                {[
                  { label: 'Duplicate', icon: Files, action: handleDuplicate },
                  { label: 'Copy as text', icon: Copy, action: handleCopyText },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 12, fontFamily: 'Inter, sans-serif', color: 'var(--text)',
                      borderRadius: 6, transition: 'background 100ms ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                  >
                    <item.icon size={13} style={{ color: 'var(--text-muted)' }} />
                    {item.label}
                  </button>
                ))}
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                <button
                  onClick={handleDelete}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#D93025',
                    borderRadius: 6, transition: 'background 100ms ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </div>
            )}
          </div>

          </div>
        </div>

        {/* Icon picker — Notion style */}
        <div style={{ padding: '0 40px', marginBottom: 8 }}>
          <EmojiPicker
            currentEmoji={doc?.icon ?? null}
            onSelect={(emoji) => saveDoc({ icon: emoji })}
          >
            {doc?.icon ? (
              <span style={{ fontSize: 48, lineHeight: 1, cursor: 'pointer' }}>{doc.icon}</span>
            ) : (
              <span style={{
                fontSize: 13,
                fontFamily: 'Inter, sans-serif',
                color: 'var(--text-muted)',
                opacity: 0.5,
                cursor: 'pointer',
                transition: 'opacity 150ms ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5' }}
              >
                Add icon
              </span>
            )}
          </EmojiPicker>
        </div>

        {/* Title input */}
        <input
          value={title}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          placeholder="Untitled"
          spellCheck
          className="font-heading"
          style={{
            display: 'block',
            width: '100%',
            fontSize: 48,
            fontWeight: 600,
            color: 'var(--text)',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: '8px 40px 12px',
            marginBottom: 24,
            lineHeight: 1.35
          }}
        />

        {/* TipTap content */}
        {editor && <FloatingToolbar editor={editor} />}
        <EditorContent editor={editor} />
      </motion.div>

      {/* Word count */}
      <div
        className="font-ui"
        style={{
          position: 'absolute',
          bottom: 16,
          right: 24,
          fontSize: 11,
          color: 'var(--text-muted)',
          pointerEvents: 'none'
        }}
      >
        {wordCount} {wordCount === 1 ? 'word' : 'words'}
      </div>
    </motion.div>
  )
}
