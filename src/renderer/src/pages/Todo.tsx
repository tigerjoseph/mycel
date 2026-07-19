import { useEffect, useState, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, Check, X } from 'lucide-react'
import { fadeUp } from '../styles/animation'
import type { Todo as TodoItem } from '@shared/types'

const SCALE = 0.85

const PAGE_STYLE: React.CSSProperties = {
  minHeight: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10vh 32px 64px'
}

const LIST_STYLE: React.CSSProperties = {
  width: '100%',
  maxWidth: Math.round(440 * SCALE)
}

const ROW_GAP = Math.round(8 * SCALE)
const ITEM_GAP = Math.round(15 * SCALE)
const FONT_SIZE = Math.round(21 * SCALE)
const META_FONT_SIZE = Math.round(20 * SCALE)
const CHECKBOX_SIZE = Math.round(27 * SCALE)
const CHECK_ICON = Math.round(18 * SCALE)
const DELETE_ICON = Math.round(20 * SCALE)
const PLUS_ICON = Math.round(20 * SCALE)
const EMPTY_FONT = Math.round(27 * SCALE)
const ROW_PAD = Math.round(9 * SCALE)
const BOX_RADIUS = Math.max(4, Math.round(6 * SCALE))

const listSpring = { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.8 }
const enterTween = { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const }

export function Todo(): React.JSX.Element {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [addingTodo, setAddingTodo] = useState(false)
  const [newTodoText, setNewTodoText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const todoInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.mycel.getTodos().then(setTodos).catch(() => {})
  }, [])

  useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus()
      editInputRef.current?.select()
    }
  }, [editingId])

  const toggleTodo = useCallback(async (todo: TodoItem) => {
    const updated = await window.mycel.upsertTodo({ ...todo, done: !todo.done })
    setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }, [])

  const startEditing = useCallback((todo: TodoItem) => {
    setEditingId(todo.id)
    setEditText(todo.text)
  }, [])

  const commitEdit = useCallback(async () => {
    if (!editingId) return
    const id = editingId
    const text = editText.trim()
    setEditingId(null)
    setEditText('')

    const current = todos.find((t) => t.id === id)
    if (!current) return

    if (!text) {
      await window.mycel.deleteTodo(id)
      setTodos((prev) => prev.filter((t) => t.id !== id))
      return
    }

    if (text === current.text) return

    const updated = await window.mycel.upsertTodo({ ...current, text })
    setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }, [editingId, editText, todos])

  const committingNewRef = useRef(false)
  const commitNewTodo = useCallback(async () => {
    if (committingNewRef.current) return
    committingNewRef.current = true
    const text = newTodoText.trim()
    setAddingTodo(false)
    setNewTodoText('')
    try {
      if (!text) return
      const id = crypto.randomUUID()
      const optimistic: TodoItem = {
        id,
        text,
        done: false,
        position: todos.length,
        createdAt: Date.now()
      }
      setTodos((prev) => [...prev, optimistic])
      try {
        const todo = await window.mycel.upsertTodo(optimistic)
        setTodos((prev) => prev.map((t) => (t.id === id ? todo : t)))
      } catch {
        setTodos((prev) => prev.filter((t) => t.id !== id))
      }
    } finally {
      committingNewRef.current = false
    }
  }, [newTodoText, todos.length])

  const deleteTodo = useCallback(async (id: string) => {
    if (editingId === id) {
      setEditingId(null)
      setEditText('')
    }
    await window.mycel.deleteTodo(id)
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }, [editingId])

  const sortedTodos = [...todos].sort((a, b) => a.position - b.position)

  const startAdding = (): void => {
    setEditingId(null)
    setAddingTodo(true)
    setTimeout(() => todoInputRef.current?.focus(), 50)
  }

  const addActionButton = (
    <motion.button
      layout
      transition={listSpring}
      onClick={startAdding}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        fontSize: META_FONT_SIZE,
        color: 'var(--text-muted)',
        padding: sortedTodos.length > 0 ? `${ROW_GAP + 4}px 0 0 0` : 0,
        display: 'flex',
        alignItems: 'center',
        gap: Math.round(6 * SCALE),
        transition: 'color 150ms ease'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)' }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
    >
      <Plus size={PLUS_ICON} />
      add action
    </motion.button>
  )

  if (todos.length === 0 && !addingTodo) {
    return (
      <div style={PAGE_STYLE}>
        <motion.div
          style={{
            ...LIST_STYLE,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: Math.round(20 * SCALE)
          }}
          {...fadeUp}
        >
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: EMPTY_FONT,
              color: 'var(--text-muted)'
            }}
          >
            No actions yet
          </span>
          {addActionButton}
        </motion.div>
      </div>
    )
  }

  return (
    <div style={PAGE_STYLE}>
      <motion.div style={LIST_STYLE} {...fadeUp}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
          <AnimatePresence initial={false} mode="popLayout">
            {sortedTodos.map((todo) => {
              const isEditing = editingId === todo.id
              return (
                <motion.div
                  key={todo.id}
                  layout="position"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.16, ease: 'easeOut' } }}
                  transition={{
                    layout: listSpring,
                    opacity: enterTween,
                    y: enterTween
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: ITEM_GAP,
                    padding: `${ROW_PAD}px 0`,
                    position: 'relative',
                    willChange: 'transform, opacity'
                  }}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget.querySelector('[data-delete]') as HTMLElement
                    if (btn) btn.style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget.querySelector('[data-delete]') as HTMLElement
                    if (btn) btn.style.opacity = '0'
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isEditing) void toggleTodo(todo)
                    }}
                    style={{
                      width: CHECKBOX_SIZE,
                      height: CHECKBOX_SIZE,
                      borderRadius: BOX_RADIUS,
                      border: todo.done ? 'none' : '2px solid var(--border)',
                      background: todo.done ? 'var(--accent)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'background 150ms ease, border-color 150ms ease'
                    }}
                  >
                    {todo.done && <Check size={CHECK_ICON} style={{ color: 'var(--bg)' }} />}
                  </button>

                  {isEditing ? (
                    <input
                      ref={editInputRef}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => void commitEdit()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void commitEdit()
                        }
                        if (e.key === 'Escape') {
                          setEditingId(null)
                          setEditText('')
                        }
                      }}
                      style={{
                        fontFamily: 'var(--font-ui)',
                        fontSize: FONT_SIZE,
                        lineHeight: 1.35,
                        color: 'var(--text)',
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        flex: 1,
                        padding: 0,
                        minWidth: 0
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditing(todo)}
                      style={{
                        fontFamily: 'var(--font-ui)',
                        fontSize: FONT_SIZE,
                        lineHeight: 1.35,
                        color: todo.done ? 'var(--text-muted)' : 'var(--text)',
                        textDecoration: todo.done ? 'line-through' : 'none',
                        background: 'none',
                        border: 'none',
                        cursor: 'text',
                        flex: 1,
                        textAlign: 'left',
                        padding: 0,
                        minWidth: 0,
                        transition: 'color 150ms ease'
                      }}
                    >
                      {todo.text}
                    </button>
                  )}

                  <button
                    data-delete=""
                    onClick={(e) => {
                      e.stopPropagation()
                      void deleteTodo(todo.id)
                    }}
                    style={{
                      opacity: 0,
                      transition: 'opacity 150ms ease, color 150ms ease',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: Math.round(6 * SCALE),
                      display: 'flex',
                      alignItems: 'center',
                      color: 'var(--text-muted)'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#e55' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    <X size={DELETE_ICON} />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        <AnimatePresence initial={false} mode="popLayout">
          {addingTodo ? (
            <motion.div
              key="add-row"
              layout="position"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.15, ease: 'easeOut' } }}
              transition={{
                layout: listSpring,
                opacity: enterTween,
                y: enterTween
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: ITEM_GAP,
                padding: `${ROW_PAD}px 0`,
                willChange: 'transform, opacity'
              }}
            >
              <div
                style={{
                  width: CHECKBOX_SIZE,
                  height: CHECKBOX_SIZE,
                  borderRadius: BOX_RADIUS,
                  border: '2px solid var(--border)',
                  background: 'transparent',
                  flexShrink: 0
                }}
              />
              <input
                ref={todoInputRef}
                autoFocus
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onBlur={() => void commitNewTodo()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void commitNewTodo()
                  if (e.key === 'Escape') { setAddingTodo(false); setNewTodoText('') }
                }}
                placeholder="Add action..."
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: FONT_SIZE,
                  lineHeight: 1.35,
                  color: 'var(--text)',
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  flex: 1,
                  padding: 0
                }}
              />
            </motion.div>
          ) : (
            <motion.div key="add-btn" layout transition={listSpring}>
              {addActionButton}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
