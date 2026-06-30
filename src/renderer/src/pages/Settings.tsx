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
  const [gcalConnected, setGcalConnected] = useState(false)
  const [gcalBusy, setGcalBusy] = useState(false)
  const [gcalMessage, setGcalMessage] = useState<string | null>(null)
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
    window.mycel.gcalGetStatus().then((s) => setGcalConnected(s.connected)).catch(() => {})
  }, [])

  const handleAppearance = (id: AppearanceId): void => {
    setAppearance(id)
    applyAppearanceToDocument(id)
    window.mycel.setAppearance(id)
  }

  const handleGcalConnect = async (): Promise<void> => {
    setGcalBusy(true)
    setGcalMessage(null)
    try {
      const result = await window.mycel.gcalConnect()
      setGcalConnected(true)
      setGcalMessage(
        result.created > 0
          ? `Added ${result.created} contact${result.created === 1 ? '' : 's'} from calendar`
          : 'Connected — no new contacts to add'
      )
    } catch (err) {
      setGcalMessage(err instanceof Error ? err.message : 'Could not connect Google Calendar')
    } finally {
      setGcalBusy(false)
    }
  }

  const handleGcalDisconnect = async (): Promise<void> => {
    setGcalBusy(true)
    setGcalMessage(null)
    try {
      await window.mycel.gcalDisconnect()
      setGcalConnected(false)
      setGcalMessage('Disconnected')
    } catch {
      setGcalMessage('Could not disconnect')
    } finally {
      setGcalBusy(false)
    }
  }

  const handleGcalSync = async (): Promise<void> => {
    setGcalBusy(true)
    setGcalMessage(null)
    try {
      const result = await window.mycel.gcalSyncContacts()
      setGcalMessage(
        result.created > 0
          ? `Added ${result.created} new contact${result.created === 1 ? '' : 's'}`
          : 'Up to date — no new contacts'
      )
    } catch (err) {
      setGcalMessage(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setGcalBusy(false)
    }
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
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: gcalConnected ? '#22c55e' : '#9ca3af',
                  flexShrink: 0
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--text)' }}>Google Calendar</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {gcalConnected && (
                <button
                  onClick={() => void handleGcalSync()}
                  disabled={gcalBusy}
                  style={integrationBtnStyle}
                >
                  Sync now
                </button>
              )}
              <button
                onClick={() => void (gcalConnected ? handleGcalDisconnect() : handleGcalConnect())}
                disabled={gcalBusy}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: gcalConnected ? '1px solid var(--border)' : 'none',
                  backgroundColor: gcalConnected ? 'var(--surface)' : 'var(--text)',
                  color: gcalConnected ? 'var(--text)' : 'var(--bg)',
                  fontSize: 12,
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 500,
                  opacity: gcalBusy ? 0.6 : 1,
                  cursor: gcalBusy ? 'wait' : 'pointer'
                }}
              >
                {gcalBusy ? 'Working…' : gcalConnected ? 'Disconnect' : 'Connect Google Calendar'}
              </button>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 4px', lineHeight: 1.5 }}>
            When you book via Cal.ai (or any calendar invite), meeting attendees are added to your
            contact list automatically on connect and each app launch.
          </p>
          {gcalMessage && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0' }}>{gcalMessage}</p>
          )}
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

const integrationBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  backgroundColor: 'var(--surface)',
  fontSize: 12,
  fontFamily: 'var(--font-ui)',
  color: 'var(--text)'
}
