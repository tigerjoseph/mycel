import { motion, AnimatePresence } from 'motion/react'
import { format } from 'date-fns'
import { spring } from '../styles/animation'

interface MonthFilterProps {
  months: string[]
  selectedMonth: string | null
  onSelect: (month: string | null) => void
}

const pillStyle = (isSelected: boolean) => ({
  background: isSelected ? 'var(--accent)' : 'var(--surface)',
  color: isSelected ? '#fff' : 'var(--text-muted)',
  border: 'none' as const,
  borderRadius: 20,
  padding: '4px 12px',
  fontSize: 12,
  fontFamily: 'var(--font-ui)',
  fontWeight: 500,
  cursor: 'pointer' as const,
  whiteSpace: 'nowrap' as const,
  transition: 'background 150ms ease, color 150ms ease',
  lineHeight: 1.5
})

export function MonthFilter({ months, selectedMonth, onSelect }: MonthFilterProps): React.JSX.Element {
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
        <motion.button
          key="all"
          layout
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={spring}
          onClick={() => onSelect(null)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          style={pillStyle(selectedMonth === null)}
        >
          All
        </motion.button>

        {months.map((month) => {
          const isSelected = selectedMonth === month
          const label = format(new Date(month + '-01'), 'MMM yyyy')
          return (
            <motion.button
              key={month}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={spring}
              onClick={() => onSelect(month)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              style={pillStyle(isSelected)}
            >
              {label}
            </motion.button>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
