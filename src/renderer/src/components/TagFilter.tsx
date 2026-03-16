import { motion, AnimatePresence } from 'motion/react'
import { spring } from '../styles/animation'

interface TagFilterProps {
  tags: string[]
  selectedTags: string[]
  onToggle: (tag: string) => void
  onClear: () => void
}

export function TagFilter({ tags, selectedTags, onToggle, onClear }: TagFilterProps): React.JSX.Element {
  const hasSelection = selectedTags.length > 0

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 4,
        scrollbarWidth: 'none'
      }}
    >
      <AnimatePresence mode="popLayout">
        {tags.map((tag) => {
          const isSelected = selectedTags.includes(tag)
          return (
            <motion.button
              key={tag}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={spring}
              onClick={() => onToggle(tag)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              style={{
                background: isSelected ? 'var(--accent)' : 'var(--surface)',
                color: isSelected ? '#fff' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: 12,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 150ms ease, color 150ms ease',
                lineHeight: 1.5
              }}
            >
              {tag}
            </motion.button>
          )
        })}

        {hasSelection && (
          <motion.button
            key="clear-tags"
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={spring}
            onClick={onClear}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 8px',
              fontSize: 12,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              color: 'var(--text-muted)',
              cursor: 'pointer',
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
            &times; clear
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
