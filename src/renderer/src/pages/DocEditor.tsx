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
import { FolderClosed, MoreHorizontal, Copy, Files, Trash2, FileCode, Newspaper, Sparkles, FolderOutput, History, RotateCcw, X } from 'lucide-react'
import { useUIStore } from '../store/ui'
import { useDocsStore } from '../store/docs'
import { FloatingToolbar } from '../components/FloatingToolbar'
import { SlashCommands, type ImportAudioHandler } from '../components/SlashMenu'
import { EmojiPicker } from '../components/EmojiPicker'
import { DocIcon } from '../components/DocIcon'
import { TagPicker } from '../components/TagPicker'
import { DocumentBreadcrumbs } from '../components/DocumentBreadcrumbs'
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
import type { Doc, DocVersion } from '@shared/types'
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
      <DocumentBreadcrumbs items={[{ label: 'Docs' }]} />
      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          width: '100%',
          padding: '56px 40px 60px'
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
  const setActiveFolderId = useUIStore((s) => s.setActiveFolderId)
  const activeFolderId = useUIStore((s) => s.activeFolderId)
  const breadcrumbs = useUIStore((s) => s.breadcrumbs)
  const popBreadcrumb = useUIStore((s) => s.popBreadcrumb)
  const [title, setTitle] = useState(doc.title)
  const [savedIndicator, setSavedIndicator] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const indicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)
  const folders = useDocsStore((s) => s.folders)
  const fetchFolders = useDocsStore((s) => s.fetchFolders)
  const [folderMenuOpen, setFolderMenuOpen] = useState(false)
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false)
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false)
  const [versions, setVersions] = useState<DocVersion[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const folderMenuRef = useRef<HTMLDivElement>(null)
  const settingsMenuRef = useRef<HTMLDivElement>(null)
  const { showCopyFeedback } = useCopyFeedback()
  const docRef = useRef(doc)
  docRef.current = doc
  const titleRef = useRef(title)
  titleRef.current = title
  const bodyRef = useRef(doc.body)
  const pendingUpdatesRef = useRef<Partial<Doc>>({})
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const deletingRef = useRef(false)
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
    (updates: Partial<Doc>): Promise<void> => {
      if (deletingRef.current) return Promise.resolve()

      saveQueueRef.current = saveQueueRef.current.catch(() => {}).then(async () => {
        const current = docRef.current
        if (!current || deletingRef.current) return
        const draft = {
          ...current,
          title: titleRef.current,
          body: bodyRef.current,
          ...updates
        }
        const changed =
          draft.title !== current.title ||
          draft.body !== current.body ||
          Object.entries(updates).some(
            ([key, value]) => current[key as keyof Doc] !== value
          )
        if (!changed) return

        try {
          const saved = await window.mycel.upsertDoc({
            ...draft,
            expectedUpdatedAt: current.updatedAt
          })
          docRef.current = saved
          setSaveError(false)
          if (isMountedRef.current) {
            setDoc(saved)
            showSaved()
          }
        } catch (error) {
          setSaveError(true)
          throw error
        }
      })
      return saveQueueRef.current
    },
    [setDoc, showSaved]
  )

  const debouncedSave = useCallback(
    (updates: Partial<Doc>) => {
      pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates }
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null
        const pending = pendingUpdatesRef.current
        pendingUpdatesRef.current = {}
        void saveDoc(pending)
      }, 800)
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
        bodyRef.current = html
        await saveDoc({ body: html })
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
    [saveDoc, showCopyFeedback]
  )

  importAudioRef.current = handleImportAudio

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false
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
        bodyRef.current = ed.getHTML()
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
    if (deletingRef.current) return
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    const pending = pendingUpdatesRef.current
    pendingUpdatesRef.current = {}
    await saveDoc(pending)
  }, [saveDoc])

  useFlushOnLeave(flushSave, { watchCreateView: true })

  const handleDelete = useCallback(async () => {
    if (!doc) return
    if (!confirm('Delete this document? It can be recovered from version history.')) return
    deletingRef.current = true
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    pendingUpdatesRef.current = {}
    try {
      await saveQueueRef.current.catch(() => {})
      await window.mycel.deleteDoc(doc.id)
      setActiveDocId(null)
      setDocsView('home')
    } catch (error) {
      deletingRef.current = false
      showCopyFeedback(error instanceof Error ? error.message : 'Delete failed')
    }
  }, [doc, setActiveDocId, setDocsView, showCopyFeedback])

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

  const openVersionHistory = useCallback(async () => {
    if (!doc) return
    setSettingsMenuOpen(false)
    setVersionHistoryOpen(true)
    setVersionsLoading(true)
    try {
      await flushSave()
      setVersions(await window.mycel.getDocVersions(doc.id))
    } catch (error) {
      showCopyFeedback(error instanceof Error ? error.message : 'Could not load version history')
    } finally {
      setVersionsLoading(false)
    }
  }, [doc, flushSave, showCopyFeedback])

  const restoreVersion = useCallback(async (version: DocVersion) => {
    if (!editor) return
    if (!confirm(`Restore the version from ${new Date(version.updatedAt).toLocaleString()}?`)) return
    try {
      const restored = await window.mycel.restoreDocVersion(version.versionId)
      docRef.current = restored
      titleRef.current = restored.title
      bodyRef.current = restored.body
      setTitle(restored.title)
      editor.commands.setContent(restored.body, { emitUpdate: false })
      setDoc(restored)
      setVersionHistoryOpen(false)
      showCopyFeedback('Version restored')
    } catch (error) {
      showCopyFeedback(error instanceof Error ? error.message : 'Restore failed')
    }
  }, [editor, setDoc, showCopyFeedback])

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
      bodyRef.current = editor.getHTML()
      void flushSave()
    }
    editor.on('blur', onBlur)
    return () => { editor.off('blur', onBlur) }
  }, [editor, flushSave])

  // Title change handler with debounced save
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value
      titleRef.current = newTitle
      setTitle(newTitle)
      debouncedSave({ title: newTitle })
    },
    [debouncedSave]
  )

  const handleBack = useCallback(async () => {
    if (editor) bodyRef.current = editor.getHTML()
    await flushSave()
    if (breadcrumbs.length > 0) {
      popBreadcrumb()
      return
    }
    setActiveDocId(null)
    setDocsView('home')
  }, [editor, flushSave, breadcrumbs.length, popBreadcrumb, setActiveDocId, setDocsView])

  // Immediate save on blur (for title)
  const handleTitleBlur = useCallback(() => {
    void flushSave()
  }, [flushSave])

  // Escape key to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      if (folderMenuOpen || settingsMenuOpen) {
        setFolderMenuOpen(false)
        setSettingsMenuOpen(false)
        return
      }
      const target = e.target as HTMLElement | null
      if (target?.isContentEditable || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') {
        return
      }
      void handleBack()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleBack, folderMenuOpen, settingsMenuOpen])

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
      <DocumentBreadcrumbs
        items={[
          { label: 'Docs', onClick: () => setDocsView('home') },
          ...(folder
            ? [{
                label: folder.name,
                onClick: () => {
                  setActiveFolderId(folder.id)
                  setDocsView('list')
                }
              }]
            : [])
        ]}
      />

      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: savedIndicator || saveError ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="font-ui"
        style={{
          position: 'absolute',
          top: 16,
          right: 24,
          fontSize: 11,
          color: saveError ? 'var(--lost)' : 'var(--text-muted)',
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        {saveError ? 'Save failed — your draft is still open' : 'Saved'}
      </motion.span>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          maxWidth: 800,
          margin: '0 auto',
          width: '100%',
          padding: '56px 40px 60px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 8 }}>

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
                boxShadow: 'var(--shadow-md)'
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
                boxShadow: 'var(--shadow-md)'
              }}>
                {[
                  { label: 'Version history', icon: History, action: openVersionHistory },
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

      {versionHistoryOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setVersionHistoryOpen(false)
          }}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(0, 0, 0, 0.18)',
            backdropFilter: 'blur(2px)'
          }}
        >
          <motion.aside
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            style={{
              width: 'min(380px, 88vw)',
              height: '100%',
              padding: 20,
              overflowY: 'auto',
              background: 'var(--surface)',
              borderLeft: '1px solid var(--border)',
              boxShadow: 'var(--shadow-panel)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div className="font-heading" style={{ fontSize: 22, color: 'var(--text)' }}>Version history</div>
                <div className="font-ui" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  Previous content is saved automatically.
                </div>
              </div>
              <button
                onClick={() => setVersionHistoryOpen(false)}
                aria-label="Close version history"
                style={{ border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 6 }}
              >
                <X size={17} />
              </button>
            </div>

            {versionsLoading ? (
              <div className="font-ui" style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading versions…</div>
            ) : versions.length === 0 ? (
              <div className="font-ui" style={{ color: 'var(--text-muted)', fontSize: 13 }}>No earlier versions yet.</div>
            ) : versions.map((version) => (
              <div
                key={version.versionId}
                style={{
                  padding: 14,
                  marginBottom: 8,
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  background: 'var(--bg)'
                }}
              >
                <div className="font-ui" style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>
                  {new Date(version.updatedAt).toLocaleString()}
                </div>
                <div className="font-ui" style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 10px' }}>
                  {version.reason === 'delete' ? 'Saved before deletion' : version.body.length.toLocaleString() + ' characters'}
                </div>
                <button
                  onClick={() => { void restoreVersion(version) }}
                  className="font-ui"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    border: '1px solid var(--border)',
                    borderRadius: 7,
                    padding: '6px 9px',
                    color: 'var(--text)',
                    background: 'var(--surface)',
                    cursor: 'pointer',
                    fontSize: 12
                  }}
                >
                  <RotateCcw size={12} />
                  Restore
                </button>
              </div>
            ))}
          </motion.aside>
        </motion.div>
      )}

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
