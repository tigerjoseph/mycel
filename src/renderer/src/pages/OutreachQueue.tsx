import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { motion } from 'motion/react'
import { Plus, Check, X } from 'lucide-react'
import { fadeUp, spring } from '../styles/animation'
import { useUIStore } from '../store/ui'
import { useContactsStore } from '../store/contacts'
import type { Contact, Todo } from '@shared/types'

export function OutreachQueue(): React.JSX.Element {
  const setActiveContactId = useUIStore((s) => s.setActiveContactId)
  const setLogTouchpointOpen = useUIStore((s) => s.setLogTouchpointOpen)
  const contacts = useContactsStore((s) => s.contacts)

  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)

  // Todo state
  const [todos, setTodos] = useState<Todo[]>([])
  const [addingTodo, setAddingTodo] = useState(false)
  const [newTodoText, setNewTodoText] = useState('')
  const todoInputRef = useRef<HTMLInputElement>(null)

  // Fetch todos on mount
  useEffect(() => {
    window.mycel.getTodos().then(setTodos).catch(() => {})
  }, [])

  const toggleTodo = useCallback(async (todo: Todo) => {
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

  // All unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const c of contacts) {
      for (const t of c.tags) tagSet.add(t)
    }
    return Array.from(tagSet).sort()
  }, [contacts])

  const toggleTag = (tag: string): void => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  // Calculate reason and urgency score
  const getContactReason = (contact: Contact): { text: string; urgency: number; isAccent: boolean } => {
    if (!contact.lastContactedAt) {
      return { text: 'Never contacted', urgency: 1000, isAccent: true }
    }

    const now = Date.now()
    const daysSince = (now - contact.lastContactedAt) / (1000 * 60 * 60 * 24)

    if (daysSince > 90) {
      const months = Math.floor(daysSince / 30)
      return { text: `Not contacted in ${months} month${months > 1 ? 's' : ''}`, urgency: daysSince, isAccent: false }
    }

    if (daysSince > 30) {
      const weeks = Math.floor(daysSince / 7)
      return { text: `Last reached out ${weeks} week${weeks > 1 ? 's' : ''} ago`, urgency: daysSince, isAccent: false }
    }

    if (daysSince > 7) {
      const days = Math.floor(daysSince)
      return { text: `Last contacted ${days} day${days > 1 ? 's' : ''} ago`, urgency: daysSince, isAccent: false }
    }

    return { text: 'Contacted recently', urgency: 0, isAccent: false }
  }

  // Filter by selected tags then sort by urgency
  const suggestionCards = useMemo(() => {
    let filtered = contacts
    if (selectedTags.length > 0) {
      filtered = contacts.filter((c) =>
        selectedTags.every((tag) => c.tags.includes(tag))
      )
    }

    const withUrgency = filtered.map((c) => ({
      contact: c,
      ...getContactReason(c)
    }))

    return withUrgency
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, 10)
  }, [contacts, selectedTags])

  const handleCardClick = (contactId: string): void => {
    setActiveContactId(contactId)
  }

  const handleLogClick = (e: React.MouseEvent, contactId: string): void => {
    e.stopPropagation()
    setActiveContactId(contactId)
    setLogTouchpointOpen(true)
  }

  if (contacts.length === 0 && todos.length === 0) {
    return (
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
            fontFamily: 'Lora, serif',
            fontSize: 18,
            color: 'var(--text-muted)'
          }}
        >
          No actions yet
        </span>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            color: 'var(--text-muted)'
          }}
        >
          Add todos or contacts to get started
        </span>
      </motion.div>
    )
  }

  const sortedTodos = [...todos].sort((a, b) => a.position - b.position)

  return (
    <motion.div {...fadeUp}>
      {/* Todo list */}
      <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <h2
          style={{
            fontFamily: 'Inter, sans-serif',
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
                  fontFamily: 'Inter, sans-serif',
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

        {/* Inline add todo */}
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
                fontFamily: 'Inter, sans-serif',
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
              fontFamily: 'Inter, sans-serif',
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
      </div>

      {/* People to contact header */}
      <h2
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: '0 0 16px 0'
        }}
      >
        People to contact
      </h2>

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {allTags.map((tag) => {
            const isSelected = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: isSelected ? 'var(--accent)' : 'transparent',
                  color: isSelected ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease'
                }}
              >
                {tag}
              </button>
            )
          })}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 11,
                padding: '3px 10px',
                borderRadius: 12,
                border: 'none',
                background: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'color 150ms ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              clear
            </button>
          )}
        </div>
      )}

      {/* Suggestion cards grid */}
      {suggestionCards.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12
          }}
        >
          {suggestionCards.map((item, index) => {
            const { contact, text: reason, isAccent } = item
            const isHovered = hoveredCardId === contact.id
            const company = contact.metadata?.company as string | undefined
            const initials = (contact.name || 'U')
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()

            return (
              <motion.button
                key={contact.id}
                {...fadeUp}
                transition={{ ...spring, delay: index * 0.03 }}
                onClick={() => handleCardClick(contact.id)}
                onMouseEnter={() => setHoveredCardId(contact.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${isHovered ? 'var(--text-muted)' : 'var(--border)'}`,
                  borderLeft: `3px solid ${isAccent ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 12,
                  padding: 20,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  transition: 'border-color 200ms ease',
                  position: 'relative'
                }}
              >
                {/* Avatar + Name row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: isAccent ? 'var(--accent)' : 'var(--border)',
                      color: isAccent ? '#fff' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 13,
                      fontWeight: 600,
                      flexShrink: 0
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                    <span
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 14,
                        color: 'var(--text)',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {contact.name || 'Untitled'}
                    </span>
                    {company && (
                      <span
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {company}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reason */}
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 12,
                    fontStyle: 'italic',
                    color: isAccent ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: isAccent ? 600 : 400
                  }}
                >
                  {reason}
                </span>

                {/* Tags */}
                {contact.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {contact.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: 10,
                          color: 'var(--accent)',
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          padding: '2px 7px'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {contact.tags.length > 3 && (
                      <span
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: 10,
                          color: 'var(--text-muted)'
                        }}
                      >
                        +{contact.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Log touchpoint button on hover */}
                {isHovered && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                    onClick={(e) => handleLogClick(e, contact.id)}
                    style={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 11,
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      transition: 'background 100ms ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg)' }}
                  >
                    log
                  </motion.button>
                )}
              </motion.button>
            )
          })}
        </div>
      )}

      {/* Empty state for filtered results */}
      {suggestionCards.length === 0 && selectedTags.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200
          }}
        >
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              color: 'var(--text-muted)'
            }}
          >
            No contacts match the selected tags
          </span>
        </div>
      )}
    </motion.div>
  )
}
