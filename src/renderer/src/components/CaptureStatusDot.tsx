import { useEffect, useState } from 'react'
import type { CaptureStatus } from '@shared/types'
import { useUIStore } from '../store/ui'

export function CaptureStatusDot(): React.JSX.Element | null {
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen)
  const [status, setStatus] = useState<CaptureStatus | null>(null)

  useEffect(() => {
    window.mycel.getCaptureStatus().then(setStatus).catch(() => {})
    return window.mycel.onCaptureChanged(setStatus)
  }, [])

  if (!status?.enabled || !status.supported) return null

  const tracking = Boolean(status.running && status.currentSessionId)
  const label = tracking
    ? status.currentSessionTitle || 'Tracking work'
    : status.allowlist.length === 0
      ? 'Capture on — pick apps in Settings'
      : 'Capture on — waiting for an allowlisted app'

  return (
    <button
      type="button"
      onClick={() => setSettingsOpen(true)}
      title={label}
      aria-label={label}
      style={btnStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--text)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--text-muted)'
      }}
    >
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          flexShrink: 0,
          background: tracking ? 'var(--accent)' : 'var(--text-muted)',
          boxShadow: tracking ? '0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent)' : undefined
        }}
      />
      <span
        style={{
          maxWidth: 132,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-ui)',
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '-0.01em'
        }}
      >
        {tracking ? status.currentSessionTitle || 'Tracking' : 'Watching'}
      </span>
    </button>
  )
}

const btnStyle: React.CSSProperties = {
  WebkitAppRegion: 'no-drag',
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  maxWidth: 168,
  padding: '4px 6px',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  color: 'var(--text-muted)',
  borderRadius: 4,
  transition: 'color 150ms ease'
}
