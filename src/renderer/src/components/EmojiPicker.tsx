import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { LUCIDE_ICON_PREFIX, LUCIDE_ICONS } from './DocIcon'

const EMOJI_CATEGORIES: Record<string, string[]> = {
  Smileys: ['😀', '😃', '😄', '😁', '😊', '🥰', '😍', '😘', '😎', '🤓', '🤔', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤯', '😴', '🤤', '😷', '🤒'],
  Gestures: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤝', '🙏', '💪', '🫶', '👏', '🙌'],
  Hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  Nature: ['🌱', '🌿', '🍀', '🌾', '🌵', '🌲', '🌳', '🌴', '🌸', '🌺', '🌻', '🌼', '🌷', '🪻', '🍄', '🌊', '🌈', '☀️', '🌤️', '⛅', '🌧️', '❄️', '⭐', '🌙'],
  Animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦋', '🐝', '🐢', '🐍', '🦈', '🐙'],
  Food: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🥑', '🥦', '🌽', '🍕', '🍔', '🌮', '🍜', '🍣', '🍰', '🧁', '☕', '🍵', '🧃', '🍷', '🍺', '🥂'],
  Objects: ['📝', '📚', '📖', '📓', '📔', '📕', '📗', '📘', '📙', '📎', '📌', '📍', '✂️', '🖊️', '🖋️', '✏️', '🔖', '📦', '🗂️', '🗃️', '🗄️', '📁', '📂', '💼'],
  Work: ['💡', '🎯', '🏆', '🥇', '🎖️', '🏅', '💎', '🔑', '🔒', '🔓', '⚙️', '🔧', '🔨', '🛠️', '🧰', '📊', '📈', '📉', '✅', '☑️', '📋', '🗒️', '🚀', '⚡'],
  Travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '✈️', '🛫', '🛬', '🚀', '🛸', '🚁', '⛵', '🚢', '🏠', '🏡', '🏢', '🏛️', '🗺️', '🧳', '🎒'],
  Symbols: ['✨', '💫', '🔥', '💧', '💨', '🎉', '🎊', '🎈', '🎁', '🎀', '🔔', '💬', '💭', '🗯️', '❗', '❓', '‼️', '✅', '❌', '⭕', '🔴', '🟠', '🟡', '🟢', '🔵']
}

const LUCIDE_ICON_NAMES = Object.keys(LUCIDE_ICONS)

interface EmojiPickerProps {
  currentIcon: string | null
  onSelect: (icon: string | null) => void
  children: React.ReactNode
}

export function EmojiPicker({ currentIcon, onSelect, children }: EmojiPickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'emoji' | 'icons'>('emoji')
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

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '6px 0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--text)' : 'var(--text-muted)',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent'
  })

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
              width: 280,
              zIndex: 50,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              <button type="button" onClick={() => setTab('emoji')} style={tabStyle(tab === 'emoji')}>
                Emoji
              </button>
              <button type="button" onClick={() => setTab('icons')} style={tabStyle(tab === 'icons')}>
                Icons
              </button>
            </div>

            <div style={{ padding: 8, maxHeight: 280, overflowY: 'auto' }}>
              {currentIcon && (
                <button
                  type="button"
                  onClick={() => { onSelect(null); setOpen(false) }}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    marginBottom: 6,
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

              {tab === 'emoji' ? (
                Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                  <div key={category}>
                    <div
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        padding: '4px 4px 2px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      {category}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 0 }}>
                      {emojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => { onSelect(emoji); setOpen(false) }}
                          style={{
                            background: currentIcon === emoji ? 'var(--border)' : 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 18,
                            padding: 4,
                            borderRadius: 4,
                            lineHeight: 1
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)' }}
                          onMouseLeave={(e) => {
                            if (currentIcon !== emoji) e.currentTarget.style.background = 'none'
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2 }}>
                  {LUCIDE_ICON_NAMES.map((name) => {
                    const Icon = LUCIDE_ICONS[name]
                    const value = `${LUCIDE_ICON_PREFIX}${name}`
                    const selected = currentIcon === value
                    return (
                      <button
                        key={name}
                        type="button"
                        title={name}
                        onClick={() => { onSelect(value); setOpen(false) }}
                        style={{
                          background: selected ? 'var(--border)' : 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 8,
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)' }}
                        onMouseLeave={(e) => {
                          if (!selected) e.currentTarget.style.background = 'none'
                        }}
                      >
                        <Icon size={18} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
