import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'motion/react'
import { Plus, Check, X } from 'lucide-react'
import { fadeUp } from '../styles/animation'
import type { Todo as TodoItem } from '@shared/types'

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
  maxWidth: 440
}

const ROW_GAP = 8
const ITEM_GAP = 15
const FONT_SIZE = 21
const META_FONT_SIZE = 20
const CHECKBOX_SIZE = 27
const CHECK_ICON = 18
const DELETE_ICON = 20
const PLUS_ICON = 20

export function Todo(): React.JSX.Element {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [addingTodo, setAddingTodo] = useState(false)
  const [newTodoText, setNewTodoText] = useState('')
  const todoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.mycel.getTodos().then(setTodos).catch(() => {})
  }, [])

  const toggleTodo = useCallback(async (todo: TodoItem) => {
    const updated = await window.mycel.upsertTodo({ ...todo, done: !todo.done })
    setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }, [])

  const commitNewTodo = useCallback(async () => {
    const text = newTodoText.trim()
    setAddingTodo(false)
    setNewTodoText('')
    if (!text) return
    const todo = await window.mycel.upsertTodo({
      id: crypto.randomUUID(),
      text,
      done: false,
      position: todos.length,
      createdAt: Date.now()
    })
    setTodos((prev) => [...prev, todo])
  }, [newTodoText, todos.length])

  const deleteTodo = useCallback(async (id: string) => {
    await window.mycel.deleteTodo(id)
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const sortedTodos = [...todos].sort((a, b) => a.position - b.position)

  const startAdding = (): void => {
    setAddingTodo(true)
    setTimeout(() => todoInputRef.current?.focus(), 50)
  }

  const addActionButton = (
    <button
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
        gap: 6,
        transition: 'color 150ms ease'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)' }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
    >
      <Plus size={PLUS_ICON} />
      add action
    </button>
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
            gap: 20
          }}
          {...fadeUp}
        >
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 27,
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
          {sortedTodos.map((todo) => (
            <div
              key={todo.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: ITEM_GAP,
                padding: '9px 0',
                position: 'relative'
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
                onClick={() => toggleTodo(todo)}
                style={{
                  width: CHECKBOX_SIZE,
                  height: CHECKBOX_SIZE,
                  borderRadius: 6,
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
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: FONT_SIZE,
                  lineHeight: 1.35,
                  color: todo.done ? 'var(--text-muted)' : 'var(--text)',
                  textDecoration: todo.done ? 'line-through' : 'none',
                  flex: 1,
                  transition: 'color 150ms ease'
                }}
              >
                {todo.text}
              </span>
              <button
                data-delete=""
                onClick={() => deleteTodo(todo.id)}
                style={{
                  opacity: 0,
                  transition: 'opacity 150ms ease, color 150ms ease',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 6,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--text-muted)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#e55' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                <X size={DELETE_ICON} />
              </button>
            </div>
          ))}
        </div>

        {addingTodo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: ITEM_GAP, padding: '9px 0' }}>
            <div
              style={{
                width: CHECKBOX_SIZE,
                height: CHECKBOX_SIZE,
                borderRadius: 6,
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
              onBlur={commitNewTodo}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitNewTodo()
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
          </div>
        ) : (
          addActionButton
        )}
      </motion.div>
    </div>
  )
}
