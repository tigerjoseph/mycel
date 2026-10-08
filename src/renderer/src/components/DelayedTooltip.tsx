import { useEffect, useId, useRef, useState } from 'react'

const SHOW_DELAY_MS = 350

/** Native-feel tooltip with hover delay so fast sweeps don't flash labels. */
export function DelayedTooltip({
  label,
  children,
  side = 'bottom'
}: {
  label: string
  children: React.ReactElement
  side?: 'top' | 'bottom'
}): React.JSX.Element {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = (): void => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => () => clear(), [])

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => {
        clear()
        timerRef.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS)
      }}
      onMouseLeave={() => {
        clear()
        setVisible(false)
      }}
      onFocus={() => {
        clear()
        timerRef.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS)
      }}
      onBlur={() => {
        clear()
        setVisible(false)
      }}
    >
      {children}
      {visible && (
        <span
          id={id}
          role="tooltip"
          style={{
            position: 'absolute',
            [side === 'top' ? 'bottom' : 'top']: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 200,
            padding: '4px 8px',
            borderRadius: 6,
            background: 'var(--text)',
            color: 'var(--bg)',
            fontFamily: 'var(--font-ui)',
            fontSize: 11,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          {label}
        </span>
      )}
    </span>
  )
}
