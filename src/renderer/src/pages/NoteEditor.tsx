import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CharacterCount from '@tiptap/extension-character-count'
import { fadeUp } from '../styles/animation'
import { useUIStore } from '../store/ui'
import { useNotesStore } from '../store/notes'
import type { Note } from '@shared/types'

export function NoteEditor(): React.JSX.Element {
  const activeNoteId = useUIStore((s) => s.activeNoteId)
  const setActiveNoteId = useUIStore((s) => s.setActiveNoteId)
  const setNoteEditorOpen = useUIStore((s) => s.setNoteEditorOpen)
  const notes = useNotesStore((s) => s.notes)
  const upsert = useNotesStore((s) => s.upsert)
  const remove = useNotesStore((s) => s.remove)

  const note = notes.find((n) => n.id === activeNoteId) ?? null

  const [title, setTitle] = useState(note?.title ?? '')
  const [tags, setTags] = useState<string[]>(note?.tags ?? [])
  const [addingTag, setAddingTag] = useState(false)
  const [newTagValue, setNewTagValue] = useState('')

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteRef = useRef<Note | null>(note)
  const titleRef = useRef(title)
  const tagsRef = useRef(tags)

  noteRef.current = note
  titleRef.current = title
  tagsRef.current = tags

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setTags(note.tags)
    }
  }, [note?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing...' }),
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount
    ],
    content: note?.body ?? '',
    onUpdate: ({ editor: ed }) => {
      scheduleSave(titleRef.current, ed.getHTML(), tagsRef.current)
    }
  })

  const saveNow = useCallback(
    async (t: string, b: string, tg: string[]) => {
      if (!noteRef.current) return
      await upsert({
        ...noteRef.current,
        title: t,
        body: b,
        tags: tg,
        updatedAt: Date.now()
      })
    },
    [upsert]
  )

  const scheduleSave = useCallback(
    (t: string, b: string, tg: string[]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveNow(t, b, tg)
      }, 2000)
    },
    [saveNow]
  )

  const handleTitleChange = (value: string): void => {
    setTitle(value)
    titleRef.current = value
    const body = editor?.getHTML() ?? noteRef.current?.body ?? ''
    scheduleSave(value, body, tagsRef.current)
  }

  const handleBack = async (): Promise<void> => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    const currentTitle = titleRef.current
    const currentBody = editor?.getHTML() ?? ''
    const isEmpty =
      !currentTitle.trim() && (!currentBody.trim() || currentBody === '<p></p>')

    if (isEmpty && noteRef.current) {
      await remove(noteRef.current.id)
    } else if (noteRef.current) {
      await saveNow(currentTitle, currentBody, tagsRef.current)
    }

    setActiveNoteId(null)
    setNoteEditorOpen(false)
  }

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const handleRemoveTag = (tag: string): void => {
    const next = tags.filter((t) => t !== tag)
    setTags(next)
    tagsRef.current = next
    const body = editor?.getHTML() ?? noteRef.current?.body ?? ''
    saveNow(titleRef.current, body, next)
  }

  const handleAddTag = (): void => {
    const trimmed = newTagValue.trim().toLowerCase()
    if (!trimmed || tags.includes(trimmed)) {
      setAddingTag(false)
      setNewTagValue('')
      return
    }
    const next = [...tags, trimmed]
    setTags(next)
    tagsRef.current = next
    setNewTagValue('')
    setAddingTag(false)
    const body = editor?.getHTML() ?? noteRef.current?.body ?? ''
    saveNow(titleRef.current, body, next)
  }

  const wordCount = editor?.storage.characterCount?.words() ?? 0

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {/* Close button */}
      <button
        onClick={handleBack}
        style={{
          position: 'absolute',
          top: 12,
          right: 16,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          fontSize: 18,
          lineHeight: 1,
          padding: 4,
          transition: 'color 150ms ease',
          zIndex: 1
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-muted)'
        }}
        aria-label="Close"
      >
        ×
      </button>

      <div
        style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: '20px 24px 32px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflowY: 'auto'
        }}
      >
        {/* Title input */}
        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled"
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            outline: 'none',
            fontFamily: 'Lora, serif',
            fontSize: 24,
            fontWeight: 600,
            color: 'var(--text)',
            padding: '0 0 16px 0',
            lineHeight: 1.3
          }}
        />

        {/* TipTap editor */}
        <div style={{ flex: 1, minHeight: 200 }}>
          <EditorContent
            editor={editor}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 15,
              lineHeight: 1.8,
              color: 'var(--text)'
            }}
          />
        </div>

        {/* Tags + word count row at bottom */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 24,
            paddingTop: 12,
            borderTop: '1px solid var(--border)'
          }}
        >
          {/* Tags */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', flex: 1 }}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'var(--surface)',
                  borderRadius: 20,
                  padding: '3px 8px',
                  fontSize: 11,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap'
                }}
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  aria-label={`Remove tag ${tag}`}
                >
                  &times;
                </button>
              </span>
            ))}

            {addingTag ? (
              <input
                autoFocus
                type="text"
                value={newTagValue}
                onChange={(e) => setNewTagValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                  if (e.key === 'Escape') {
                    setAddingTag(false)
                    setNewTagValue('')
                  }
                }}
                onBlur={handleAddTag}
                placeholder="tag name"
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 20,
                  padding: '3px 8px',
                  fontSize: 11,
                  fontFamily: 'Inter, sans-serif',
                  color: 'var(--text)',
                  outline: 'none',
                  width: 80
                }}
              />
            ) : (
              <button
                onClick={() => setAddingTag(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: 'Inter, sans-serif',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  padding: '3px 0',
                  whiteSpace: 'nowrap',
                  transition: 'color 150ms ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)'
                }}
              >
                <Plus size={11} />
                tag
              </button>
            )}
          </div>

          {/* Word count */}
          <span
            style={{
              fontSize: 11,
              fontFamily: 'Inter, sans-serif',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>
        </div>
      </div>
    </div>
  )
}
