import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { spring } from '../styles/animation'

export interface ContextMenuItem {
  label: string
  onClick: () => void
  danger?: boolean
  icon?: React.ReactNode
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

/** Fixed-position menu portaled to document.body (avoids offset inside transformed/scroll parents). */
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pad = 8
    let nextX = x
    let nextY = y
    if (nextX + rect.width > window.innerWidth - pad) nextX = window.innerWidth - rect.width - pad
    if (nextY + rect.height > window.innerHeight - pad) nextY = window.innerHeight - rect.height - pad
    setPos({ x: Math.max(pad, nextX), y: Math.max(pad, nextY) })
  }, [x, y, items])

  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return createPortal(
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={spring}
      style={{
        position: 'fixed',
        top: pos.y,
        left: pos.x,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 6,
        minWidth: 160,
        zIndex: 10000,
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            item.onClick()
            onClose()
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '7px 10px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'Inter, sans-serif',
            color: item.danger ? '#D93025' : 'var(--text)',
            borderRadius: 6,
            transition: 'background 100ms ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </motion.div>,
    document.body
  )
}
