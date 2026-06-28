import { Fragment, useState, useEffect } from 'react'
import {
  APPEARANCE_OPTIONS,
  applyAppearanceToDocument,
  type AppearanceId,
  type ModeId,
  type PaletteId
} from '@shared/appearance'

const PALETTES: PaletteId[] = ['warm', 'bold']
const MODES: ModeId[] = ['light', 'dark']

const PALETTE_LABELS: Record<PaletteId, string> = {
  warm: 'Warm',
  bold: 'Bold'
}

function appearanceOption(palette: PaletteId, mode: ModeId) {
  return APPEARANCE_OPTIONS.find((o) => o.palette === palette && o.mode === mode)!
}

export function Settings(): React.JSX.Element {
  const [appearance, setAppearance] = useState<AppearanceId>('bold-light')
  const [stripeKey, setStripeKey] = useState('')
  const [googleApiKey, setGoogleApiKey] = useState('')
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.mycel.getAppearance().then((a) => {
      setAppearance(a)
      applyAppearanceToDocument(a)
    })
    window.mycel.getVersion().then((v) => setVersion(v))
    window.mycel.getSettings().then((s) => {
      if (typeof s.googleApiKey === 'string') setGoogleApiKey(s.googleApiKey)
    })
  }, [])

  const handleAppearance = (id: AppearanceId): void => {
    setAppearance(id)
    applyAppearanceToDocument(id)
    window.mycel.setAppearance(id)
  }

  return (
    <div
      style={{
        padding: 32,
        backgroundColor: 'var(--bg)',
        minHeight: '100%',
        overflowY: 'auto',
        fontFamily: 'var(--font-ui)'
      }}
    >
      {/* Appearance */}
      <section style={{ paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text)',
            margin: '0 0 16px 0'
          }}
        >
          Appearance
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr 1fr',
            gap: 8,
            alignItems: 'center'
          }}
        >
          <div />
          {MODES.map((mode) => (
            <span
              key={mode}
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-ui)',
                fontWeight: 500,
                color: 'var(--text-muted)',
                textAlign: 'center',
                textTransform: 'capitalize'
              }}
            >
              {mode}
            </span>
          ))}

          {PALETTES.map((palette) => (
            <Fragment key={palette}>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                  paddingRight: 8
                }}
              >
                {PALETTE_LABELS[palette]}
              </span>
              {MODES.map((mode) => {
                const option = appearanceOption(palette, mode)
                const selected = appearance === option.id
                return (
                  <button
                    key={option.id}
                    onClick={() => handleAppearance(option.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontFamily: 'var(--font-ui)',
                      fontWeight: 500,
                      border: selected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                      color: selected ? 'var(--accent)' : 'var(--text-muted)',
                      backgroundColor: selected ? 'var(--bg)' : 'var(--surface)',
                      transition: 'all 150ms ease'
                    }}
                  >
                    {option.label}
                  </button>
                )
              })}
            </Fragment>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section style={{ paddingTop: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text)',
            margin: '0 0 16px 0'
          }}
        >
          Integrations
        </h2>

        {/* Google Calendar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#9ca3af',
                flexShrink: 0
              }}
            />
            <span style={{ fontSize: 13, color: 'var(--text)' }}>Google Calendar</span>
          </div>
          <button
            disabled
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              cursor: 'not-allowed',
              fontSize: 12,
              fontFamily: 'var(--font-ui)',
              color: 'var(--text-muted)',
              opacity: 0.6
            }}
          >
            Connect Google Calendar
          </button>
        </div>

        {/* Google AI */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: googleApiKey ? '#22c55e' : '#9ca3af',
                flexShrink: 0
              }}
            />
            <span style={{ fontSize: 13, color: 'var(--text)' }}>Google AI (Gemma + Gemini)</span>
          </div>
          <input
            type="password"
            placeholder="AI Studio API key"
            value={googleApiKey}
            onChange={(e) => setGoogleApiKey(e.target.value)}
            onBlur={() => {
              window.mycel.setSettings({ googleApiKey: googleApiKey.trim() })
            }}
            style={{
              width: 220,
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              fontSize: 12,
              fontFamily: 'var(--font-ui)',
              color: 'var(--text)',
              outline: 'none'
            }}
          />
        </div>

        {/* Stripe */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#9ca3af',
                flexShrink: 0
              }}
            />
            <span style={{ fontSize: 13, color: 'var(--text)' }}>Stripe</span>
          </div>
          <input
            type="text"
            placeholder="sk_live_..."
            value={stripeKey}
            onChange={(e) => setStripeKey(e.target.value)}
            onBlur={() => {
              if (stripeKey.trim()) {
                window.mycel.setSettings({ stripeApiKey: stripeKey.trim() })
              }
            }}
            style={{
              width: 200,
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              fontSize: 12,
              fontFamily: 'var(--font-ui)',
              color: 'var(--text)',
              outline: 'none'
            }}
          />
        </div>
      </section>

      {/* Data */}
      <section style={{ paddingTop: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text)',
            margin: '0 0 16px 0'
          }}
        >
          Data
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => alert('Export coming soon')}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'var(--font-ui)',
              color: 'var(--text)',
              textAlign: 'left',
              transition: 'background 150ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface)'
            }}
          >
            Export all as Markdown
          </button>
          <button
            onClick={() => alert('Import coming soon')}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'var(--font-ui)',
              color: 'var(--text)',
              textAlign: 'left',
              transition: 'background 150ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface)'
            }}
          >
            Import from Apple Contacts
          </button>
        </div>
      </section>

      {/* Footer */}
      <div style={{ paddingTop: 24, textAlign: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 11,
            color: 'var(--text-muted)'
          }}
        >
          Mycel {version ? `v${version}` : ''}
        </span>
      </div>
    </div>
  )
}
