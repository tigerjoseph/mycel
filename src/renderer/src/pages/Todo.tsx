import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'motion/react'
import { Plus, Check, X } from 'lucide-react'
import { fadeUp } from '../styles/animation'
import type { Todo as TodoItem } from '@shared/types'

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

  if (todos.length === 0 && !addingTodo) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px', minHeight: '100%' }}>
        <motion.div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 320,
            gap: 16
          }}
          {...fadeUp}
        >
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 18,
              color: 'var(--text-muted)'
            }}
          >
            No actions yet
          </span>
          <button
            onClick={() => {
              setAddingTodo(true)
              setTimeout(() => todoInputRef.current?.focus(), 50)
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'color 150ms ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <Plus size={13} />
            add action
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px', minHeight: '100%' }}>
      <motion.div {...fadeUp}>
        <h2
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: '0 0 12px 0'
          }}
        >
          To do
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sortedTodos.map((todo) => (
            <div
              key={todo.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 0',
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
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: todo.done ? 'none' : '1.5px solid var(--border)',
                  background: todo.done ? 'var(--accent)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 150ms ease'
                }}
              >
                {todo.done && <Check size={12} style={{ color: 'var(--bg)' }} />}
              </button>
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 14,
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
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--text-muted)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#e55' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {addingTodo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                border: '1.5px solid var(--border)',
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
                fontSize: 14,
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
          <button
            onClick={() => {
              setAddingTodo(true)
              setTimeout(() => todoInputRef.current?.focus(), 50)
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: 'var(--text-muted)',
              padding: '8px 0 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'color 150ms ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <Plus size={13} />
            add action
          </button>
        )}
      </motion.div>
    </div>
  )
}
