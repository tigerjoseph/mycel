import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😊', '🥰', '😎', '🤔', '😤', '🥳', '😴'],
  'People': ['👋', '🤝', '💪', '🙌', '👏', '🤞', '✌️', '🫶'],
  'Nature': ['🌱', '🌿', '🍀', '🌸', '🌻', '🌈', '⭐', '🔥'],
  'Objects': ['📝', '📚', '💡', '🎯', '🏆', '💎', '🔑', '📌'],
  'Work': ['💼', '📊', '📈', '🗂️', '📋', '✅', '🚀', '⚡'],
  'Food': ['☕', '🍕', '🎂', '🍎', '🥑', '🍜', '🧁', '🍷']
}

interface EmojiPickerProps {
  currentEmoji: string | null
  onSelect: (emoji: string | null) => void
  children: React.ReactNode  // trigger element
}

export function EmojiPicker({ currentEmoji, onSelect, children }: EmojiPickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <div onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>
        {children}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 4,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 8,
              width: 240,
              zIndex: 50,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
            }}
          >
            {/* Remove button */}
            {currentEmoji && (
              <button
                onClick={() => { onSelect(null); setOpen(false) }}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  marginBottom: 4,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  textAlign: 'left',
                  borderRadius: 4
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
              >
                Remove icon
              </button>
            )}
            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
              <div key={category}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'var(--text-muted)', padding: '4px 4px 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {category}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 0 }}>
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => { onSelect(emoji); setOpen(false) }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 18,
                        padding: 4,
                        borderRadius: 4,
                        lineHeight: 1,
                        transition: 'background 100ms ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
