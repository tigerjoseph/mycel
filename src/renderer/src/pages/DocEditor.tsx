import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { motion } from 'motion/react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import LinkExtension from '@tiptap/extension-link'
import { DocImage, ImageDropPaste } from '../extensions/docImages'
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
import { FolderClosed, MoreHorizontal, Copy, Files, Trash2, FileCode, Newspaper, Sparkles, FolderOutput } from 'lucide-react'
import { useUIStore } from '../store/ui'
import { useDocsStore } from '../store/docs'
import { FloatingToolbar } from '../components/FloatingToolbar'
import { SlashCommands, type ImportAudioHandler } from '../components/SlashMenu'
import { EmojiPicker } from '../components/EmojiPicker'
import { DocIcon } from '../components/DocIcon'
import { TagPicker } from '../components/TagPicker'
import { useFlushOnLeave } from '../hooks/useFlushOnLeave'
import { useCopyFeedback } from '../hooks/useCopyFeedback'
import { findCachedDoc } from '../utils/docCache'
import { htmlToMarkdown } from '../utils/htmlToMarkdown'
import { copyForSubstack } from '../utils/substackExport'
import {
  buildCursorClipboardBundle,
  buildCursorContext,
  buildCursorDraft,
  resolveLinkedContacts
} from '../utils/cursorExport'
import type { Doc } from '@shared/types'
import {
  insertAudioPlaceholder,
  progressLabel,
  replaceAudioPlaceholder,
  updateAudioPlaceholder
} from '../utils/docAudioImport'

function DocEditorShell(): React.JSX.Element {
  return (
    <div
      style={{
        height: '100%',
        background: 'var(--bg)',
        position: 'relative'
      }}
    >
      <div
        className="font-ui"
        style={{
          position: 'absolute',
          top: 20,
          left: 40,
          fontSize: 12,
          color: 'var(--text-muted)',
          zIndex: 10
        }}
      >
        Docs
      </div>
      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          width: '100%',
          padding: '120px 40px 60px'
        }}
      >
        <div
          style={{
            height: 52,
            marginBottom: 32,
            borderRadius: 8,
            background: 'var(--surface)',
            opacity: 0.45
          }}
        />
        <div
          style={{
            height: 180,
            borderRadius: 8,
            background: 'var(--surface)',
            opacity: 0.25
          }}
        />
      </div>
    </div>
  )
}

export function DocEditor(): React.JSX.Element {
  const activeDocId = useUIStore((s) => s.activeDocId)
  const [doc, setDoc] = useState<Doc | null>(() =>
    activeDocId ? findCachedDoc(activeDocId) ?? null : null
  )

  useEffect(() => {
    if (!activeDocId) {
      setDoc(null)
      return
    }
    const cached = findCachedDoc(activeDocId)
    if (cached) setDoc(cached)

    let cancelled = false
    void window.mycel.getDoc(activeDocId).then((d) => {
      if (!cancelled && d) setDoc(d as Doc)
    })
    return () => {
      cancelled = true
    }
  }, [activeDocId])

  if (!doc || doc.id !== activeDocId) {
    return <DocEditorShell />
  }

  return <DocEditorSurface key={doc.id} doc={doc} setDoc={setDoc} />
}

function DocEditorSurface({
  doc,
  setDoc
}: {
  doc: Doc
  setDoc: React.Dispatch<React.SetStateAction<Doc | null>>
}): React.JSX.Element {
  const setDocsView = useUIStore((s) => s.setDocsView)
  const setActiveDocId = useUIStore((s) => s.setActiveDocId)
  const activeFolderId = useUIStore((s) => s.activeFolderId)
  const breadcrumbs = useUIStore((s) => s.breadcrumbs)
  const popBreadcrumb = useUIStore((s) => s.popBreadcrumb)
  const [title, setTitle] = useState(doc.title)
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
  const { showCopyFeedback } = useCopyFeedback()
  const docRef = useRef(doc)
  docRef.current = doc
  const importAudioRef = useRef<ImportAudioHandler>(async () => {})

  // Load doc on mount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

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

  const handleImportAudio = useCallback<ImportAudioHandler>(
    async ({ editor, range }) => {
      const activeId = docRef.current?.id
      if (!activeId) return
      editor.chain().focus().deleteRange(range).run()
      insertAudioPlaceholder(editor)

      const stopProgress = window.mycel.onCorpusImportProgress((stage) => {
        updateAudioPlaceholder(editor, progressLabel(stage))
      })

      try {
        const result = await window.mycel.pickAndImportToDoc(activeId)
        if (!result) {
          replaceAudioPlaceholder(editor, null)
          return
        }
        replaceAudioPlaceholder(editor, result.fragmentHtml)
        const html = editor.getHTML()
        const currentDoc = docRef.current
        if (currentDoc) {
          const updated = { ...currentDoc, body: html, updatedAt: Date.now() }
          await window.mycel.upsertDoc(updated)
          if (isMountedRef.current) {
            setDoc(updated)
            showSaved()
          }
        }
        const noun = result.atomCount === 1 ? 'atom' : 'atoms'
        showCopyFeedback(`Added ${result.atomCount} ${noun} from voice note`)
      } catch (err) {
        replaceAudioPlaceholder(editor, null)
        const msg = err instanceof Error ? err.message : 'Voice note import failed'
        showCopyFeedback(msg)
      } finally {
        stopProgress()
      }
    },
    [setDoc, showSaved, showCopyFeedback]
  )

  importAudioRef.current = handleImportAudio

  const extensions = useMemo(
    () => [
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
      DocImage,
      ImageDropPaste,
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
      SlashCommands.configure({
        importAudio: (args) => importAudioRef.current(args)
      })
    ],
    [doc.id]
  )

  const editor = useEditor(
    {
      extensions,
      content: doc.body || '',
      onUpdate: ({ editor: ed }) => {
        debouncedSave({ body: ed.getHTML() })
      },
      editorProps: {
        attributes: {
          spellcheck: 'true',
          style: [
            'outline: none',
            'font-family: var(--font-ui)',
            'font-size: 15px',
            'color: var(--text)',
            'width: 100%',
            'padding: 0 0 120px'
          ].join('; ')
        }
      }
    },
    [doc.id]
  )

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (!doc || !editor) return
    const currentBody = editor.getHTML()
    if (title !== doc.title || currentBody !== doc.body) {
      const updated = { ...doc, title, body: currentBody, updatedAt: Date.now() }
      await window.mycel.upsertDoc(updated)
      if (isMountedRef.current) setDoc(updated)
    }
  }, [doc, editor, title])

  useFlushOnLeave(flushSave, { watchCreateView: true })

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
    await navigator.clipboard.writeText(editor.getText())
    setSettingsMenuOpen(false)
    showCopyFeedback('Copied')
  }, [editor, showCopyFeedback])

  const handleCopyMarkdown = useCallback(async () => {
    if (!editor) return
    await navigator.clipboard.writeText(htmlToMarkdown(editor.getHTML()))
    setSettingsMenuOpen(false)
    showCopyFeedback('Copied markdown')
  }, [editor, showCopyFeedback])

  const currentDoc = useCallback((): Doc | null => {
    if (!doc || !editor) return null
    return { ...doc, title, body: editor.getHTML() }
  }, [doc, editor, title])

  const handleCopySubstack = useCallback(async () => {
    const d = currentDoc()
    if (!d) return
    await copyForSubstack(d.title, d.body)
    setSettingsMenuOpen(false)
    showCopyFeedback('Copied for Substack')
  }, [currentDoc, showCopyFeedback])

  const handleCopyCursor = useCallback(async () => {
    const d = currentDoc()
    if (!d) return
    const linkedContacts = await resolveLinkedContacts(d.id)
    const bundle = buildCursorClipboardBundle({ doc: d, linkedContacts })
    await navigator.clipboard.writeText(bundle)
    setSettingsMenuOpen(false)
    showCopyFeedback('Copied for Cursor')
  }, [currentDoc, showCopyFeedback])

  const handleExportCursor = useCallback(async () => {
    const d = currentDoc()
    if (!d) return
    const linkedContacts = await resolveLinkedContacts(d.id)
    await window.mycel.exportCursorBundle({
      title: d.title,
      draft: buildCursorDraft(d),
      context: buildCursorContext({ doc: d, linkedContacts })
    })
    setSettingsMenuOpen(false)
    showCopyFeedback('Opened in Cursor')
  }, [currentDoc, showCopyFeedback])

  // Flush on editor blur
  useEffect(() => {
    if (!editor) return
    const onBlur = (): void => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveDoc({ body: editor.getHTML() })
      }
    }
    editor.on('blur', onBlur)
    return () => { editor.off('blur', onBlur) }
  }, [editor, saveDoc])

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
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    if (doc && editor) {
      const currentBody = editor.getHTML()
      if (title !== doc.title || currentBody !== doc.body) {
        await window.mycel.upsertDoc({ ...doc, title, body: currentBody, updatedAt: Date.now() })
      }
    }
    if (breadcrumbs.length > 0) {
      popBreadcrumb()
      return
    }
    setActiveDocId(null)
    setDocsView('home')
  }, [doc, editor, title, breadcrumbs.length, popBreadcrumb, setActiveDocId, setDocsView])

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
  const folder = folders.find((f) => f.id === (doc.folderId ?? activeFolderId))

  return (
    <div
      style={{
        height: '100%',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      <div
        className="font-ui"
        style={{
          position: 'absolute',
          top: 20,
          left: 40,
          fontSize: 12,
          color: 'var(--text-muted)',
          zIndex: 10
        }}
      >
        <span
          style={{ cursor: 'pointer' }}
          onClick={() => setDocsView('home')}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          Docs
        </span>
        {folder && (
          <>
            <span style={{ margin: '0 6px' }}>&rsaquo;</span>
            <span
              style={{ cursor: 'pointer' }}
              onClick={() => setDocsView('list')}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              {folder.name}
            </span>
          </>
        )}
        <span style={{ margin: '0 6px' }}>&rsaquo;</span>
        <span style={{ color: 'var(--text)' }}>{title || 'Untitled'}</span>
      </div>

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

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          maxWidth: 800,
          margin: '0 auto',
          width: '100%',
          padding: '120px 40px 60px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 16 }}>

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
                fontFamily: 'var(--font-ui)',
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
                      fontFamily: 'var(--font-ui)',
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
                      fontFamily: 'var(--font-ui)',
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
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-ui)', color: 'var(--text-muted)', padding: '7px 10px', display: 'block' }}>
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
                  { label: 'Copy as markdown', icon: FileCode, action: handleCopyMarkdown },
                  { label: 'Copy for Substack', icon: Newspaper, action: handleCopySubstack },
                  { label: 'Copy for Cursor', icon: Sparkles, action: handleCopyCursor },
                  { label: 'Export to Cursor', icon: FolderOutput, action: handleExportCursor },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '7px 10px', background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 12, fontFamily: 'var(--font-ui)', color: 'var(--text)',
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
                    fontSize: 12, fontFamily: 'var(--font-ui)', color: '#D93025',
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

        <div style={{ marginBottom: 8 }}>
          <EmojiPicker
            currentIcon={doc?.icon ?? null}
            onSelect={(icon) => saveDoc({ icon })}
          >
            {doc?.icon ? (
              <span style={{ cursor: 'pointer', display: 'inline-flex' }}>
                <DocIcon icon={doc.icon} size={48} color="var(--text)" />
              </span>
            ) : (
              <span style={{
                fontSize: 13,
                fontFamily: 'var(--font-ui)',
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
            padding: '8px 0 12px',
            marginBottom: 24,
            lineHeight: 1.2
          }}
        />

        {doc && (
          <div style={{ marginBottom: 16 }}>
            <TagPicker
              tags={doc.tags}
              onChange={(tags) => {
                setDoc({ ...doc, tags })
                debouncedSave({ tags })
              }}
            />
          </div>
        )}

        {/* TipTap content */}
        {editor && <FloatingToolbar editor={editor} />}
        <EditorContent editor={editor} />
      </div>

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
    </div>
  )
}
