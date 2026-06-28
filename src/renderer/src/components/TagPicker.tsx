import { useState, useRef } from 'react'
import { motion } from 'motion/react'
import { Plus, X } from 'lucide-react'

const TAG_COLORS = [
  { bg: '#E8ECF4', text: '#4A5A8A' },
  { bg: '#F4E8E4', text: '#8B5A4A' },
  { bg: '#E4F0E8', text: '#4A7A5A' },
  { bg: '#F4EDE4', text: '#9A7A4A' },
  { bg: '#ECE4F4', text: '#6A4A8A' },
  { bg: '#E4EEF0', text: '#4A7A8A' },
  { bg: '#F4E4E8', text: '#8A4A5A' },
  { bg: '#EEF4E4', text: '#5A8A4A' }
]

export function getTagColor(tag: string): { bg: string; text: string } {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

interface TagPickerProps {
  tags: string[]
  onChange: (tags: string[]) => void
  normalize?: boolean
}

export function TagPicker({ tags, onChange, normalize = true }: TagPickerProps): React.JSX.Element {
  const [showInput, setShowInput] = useState(false)
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const commit = (): void => {
    const raw = input.trim()
    setShowInput(false)
    setInput('')
    if (!raw) return
    const tag = normalize ? raw.toLowerCase() : raw
    if (!tags.includes(tag)) onChange([...tags, tag])
  }

  const remove = (tag: string): void => {
    onChange(tags.filter((t) => t !== tag))
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {tags.map((tag) => {
        const color = getTagColor(tag)
        return (
          <motion.span
            key={tag}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              background: color.bg,
              color: color.text,
              borderRadius: 20,
              padding: '2px 8px',
              fontSize: 12,
              fontFamily: 'var(--font-ui)',
              fontWeight: 500
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: color.text,
                fontSize: 11,
                lineHeight: 1,
                display: 'flex'
              }}
            >
              <X size={10} />
            </button>
          </motion.span>
        )
      })}
      {showInput ? (
        <input
          ref={inputRef}
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit() }
            if (e.key === 'Escape') { setShowInput(false); setInput('') }
          }}
          onBlur={commit}
          placeholder="tag"
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '2px 8px',
            fontSize: 12,
            fontFamily: 'var(--font-ui)',
            color: 'var(--text)',
            outline: 'none',
            width: 72
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setShowInput(true)
            setTimeout(() => inputRef.current?.focus(), 50)
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'var(--font-ui)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '2px 0'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <Plus size={12} />
          tag
        </button>
      )}
    </div>
  )
}
