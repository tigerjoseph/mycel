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

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: '⌘1', action: 'Go to To-Do' },
  { keys: '⌘2', action: 'Go to People' },
  { keys: '⌘3', action: 'Go to Create (docs)' },
  { keys: '⌘4', action: 'Go to Corpus' },
  { keys: '⌘K', action: 'Command palette' },
  { keys: '⌘J', action: 'Switch contact (People)' },
  { keys: '⌘[', action: 'Navigate back' },
  { keys: 'Esc', action: 'Close overlays' },
  { keys: '/', action: 'Slash menu in doc editor' }
]

type DataCounts = {
  contacts: number
  docs: number
  notes: number
  meetings: number
  projects: number
  todos: number
}

function appearanceOption(palette: PaletteId, mode: ModeId) {
  return APPEARANCE_OPTIONS.find((o) => o.palette === palette && o.mode === mode)!
}

export function Settings({ isOpen = true }: { isOpen?: boolean }): React.JSX.Element {
  const [appearance, setAppearance] = useState<AppearanceId>('bold-light')
  const [googleApiKey, setGoogleApiKey] = useState('')
  const [stripeApiKey, setStripeApiKey] = useState('')
  const [gcalConnected, setGcalConnected] = useState(false)
  const [gcalBusy, setGcalBusy] = useState(false)
  const [gcalMessage, setGcalMessage] = useState<string | null>(null)
  const [version, setVersion] = useState('')
  const [dbPath, setDbPath] = useState('')
  const [counts, setCounts] = useState<DataCounts | null>(null)
  const [voiceStatus, setVoiceStatus] = useState<{
    ready: boolean
    whisperCli: boolean
    ffmpeg: boolean
    model: boolean
  } | null>(null)
  const [updateBusy, setUpdateBusy] = useState(false)
  const [updateMessage, setUpdateMessage] = useState<string | null>(null)

  const refreshGcalStatus = (): void => {
    window.mycel.gcalGetStatus().then((s) => setGcalConnected(s.connected)).catch(() => {})
  }

  useEffect(() => {
    if (!isOpen) return
    window.mycel.getAppearance().then((a) => {
      setAppearance(a)
      applyAppearanceToDocument(a)
    })
    window.mycel.getVersion().then((v) => setVersion(v))
    window.mycel.getSettings().then((s) => {
      if (typeof s.googleApiKey === 'string') setGoogleApiKey(s.googleApiKey)
      if (typeof s.stripeApiKey === 'string') setStripeApiKey(s.stripeApiKey)
    })
    refreshGcalStatus()
    window.mycel.getDataInfo().then((info) => {
      setDbPath(info.dbPath)
      setCounts(info.counts)
    }).catch(() => {})
    window.mycel.getVoiceImportStatus().then(setVoiceStatus).catch(() => {})
  }, [isOpen])

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
      refreshGcalStatus()
      if (result.syncWarning) {
        setGcalMessage(`Connected. ${result.syncWarning}`)
      } else if (result.sync.created > 0) {
        setGcalMessage(
          `Added ${result.sync.created} contact${result.sync.created === 1 ? '' : 's'} from calendar`
        )
      } else {
        setGcalMessage('Connected — no new contacts to add')
      }
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

  const handleCheckUpdates = async (): Promise<void> => {
    setUpdateBusy(true)
    setUpdateMessage(null)
    try {
      const result = await window.mycel.checkForUpdates()
      if (result.status === 'dev') {
        setUpdateMessage('Updates are checked automatically in the packaged app')
      } else if (result.status === 'available') {
        setUpdateMessage(`Update available: v${result.version}`)
      } else if (result.status === 'current') {
        setUpdateMessage('You’re on the latest version')
      } else {
        setUpdateMessage('Could not check for updates')
      }
    } finally {
      setUpdateBusy(false)
    }
  }

  return (
    <div
      style={{
        padding: '20px 24px 28px',
        backgroundColor: 'var(--bg)',
        minHeight: '100%',
        fontFamily: 'var(--font-ui)'
      }}
    >
      <Section title="Appearance">
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
            <span key={mode} style={gridHeaderStyle}>
              {mode}
            </span>
          ))}

          {PALETTES.map((palette) => (
            <Fragment key={palette}>
              <span style={gridRowLabelStyle}>{PALETTE_LABELS[palette]}</span>
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
      </Section>

      <Section title="Integrations">
        <div style={{ marginBottom: 20 }}>
          <IntegrationRow
            connected={gcalConnected}
            label="Google Calendar"
            action={
              <div style={{ display: 'flex', gap: 8 }}>
                {gcalConnected && (
                  <button onClick={() => void handleGcalSync()} disabled={gcalBusy} style={secondaryBtn}>
                    Sync now
                  </button>
                )}
                <button
                  onClick={() => void (gcalConnected ? handleGcalDisconnect() : handleGcalConnect())}
                  disabled={gcalBusy}
                  style={{
                    ...secondaryBtn,
                    border: gcalConnected ? '1px solid var(--border)' : 'none',
                    backgroundColor: gcalConnected ? 'var(--surface)' : 'var(--text)',
                    color: gcalConnected ? 'var(--text)' : 'var(--bg)',
                    opacity: gcalBusy ? 0.6 : 1,
                    cursor: gcalBusy ? 'wait' : 'pointer'
                  }}
                >
                  {gcalBusy ? 'Working…' : gcalConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            }
          />
          <Hint>
            Meeting attendees from Cal.ai (or any calendar invite) are added to contacts on connect
            and each app launch.
          </Hint>
          {gcalMessage && <StatusLine>{gcalMessage}</StatusLine>}
        </div>

        <div style={{ marginBottom: 20 }}>
          <IntegrationRow
            connected={Boolean(googleApiKey.trim())}
            label="Google AI (Gemma + Gemini)"
            action={
              <input
                type="password"
                placeholder="AI Studio API key"
                value={googleApiKey}
                onChange={(e) => setGoogleApiKey(e.target.value)}
                onBlur={() => {
                  window.mycel.setSettings({ googleApiKey: googleApiKey.trim() })
                }}
                style={inputStyle}
              />
            }
          />
          <Hint>
            Powers atom extraction in Corpus and voice-note imports. Get a key at{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--accent)' }}
            >
              AI Studio
            </a>
            .
          </Hint>
        </div>

        <div style={{ marginBottom: 20 }}>
          <IntegrationRow
            connected={Boolean(stripeApiKey.trim())}
            label="Stripe"
            action={
              <input
                type="password"
                placeholder="rk_live_… or sk_live_…"
                value={stripeApiKey}
                onChange={(e) => setStripeApiKey(e.target.value)}
                onBlur={() => {
                  window.mycel.setSettings({ stripeApiKey: stripeApiKey.trim() })
                }}
                style={inputStyle}
              />
            }
          />
          <Hint>
            In{' '}
            <a
              href="https://dashboard.stripe.com/apikeys"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--accent)' }}
            >
              Stripe → API keys
            </a>
            , create a <strong>restricted key</strong> with read access to{' '}
            <code style={{ fontSize: 11 }}>Customers</code> and{' '}
            <code style={{ fontSize: 11 }}>Invoices</code> (Charges optional). Paste it here — stored only on this Mac.
            Sync is not live yet; when it ships, Mycel will match customer email to contacts and pull paid totals into Won.
          </Hint>
        </div>
      </Section>

      <Section title="Voice & Corpus">
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
          Local transcription for audio in Corpus and the <code style={{ fontSize: 11 }}>/voice</code> slash
          command in docs. Gemini key above improves atom extraction.
        </p>
        {voiceStatus ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <ToolStatus ok={voiceStatus.whisperCli} label="whisper-cli" />
            <ToolStatus ok={voiceStatus.ffmpeg} label="ffmpeg" />
            <ToolStatus ok={voiceStatus.model} label="Whisper model" />
          </div>
        ) : (
          <StatusLine>Checking local tools…</StatusLine>
        )}
        {!voiceStatus?.ready && (
          <Hint>
            Install with:{' '}
            <code style={{ fontSize: 11 }}>brew install whisper-cpp ffmpeg</code>
            . Models live in{' '}
            <code style={{ fontSize: 11 }}>/usr/local/share/whisper-cpp/models/</code>.
          </Hint>
        )}
      </Section>

      <Section title="Keyboard shortcuts">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {SHORTCUTS.map((s) => (
            <div
              key={s.keys}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{s.action}</span>
              <kbd
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-ui)',
                  color: 'var(--text-muted)',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  padding: '2px 6px',
                  flexShrink: 0
                }}
              >
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Data & storage">
        {counts && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginBottom: 14
            }}
          >
            {(
              [
                ['Contacts', counts.contacts],
                ['Docs', counts.docs],
                ['Notes', counts.notes],
                ['Meetings', counts.meetings],
                ['Projects', counts.projects],
                ['To-dos', counts.todos]
              ] as const
            ).map(([label, n]) => (
              <div
                key={label}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)'
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>
                  {n}
                </div>
              </div>
            ))}
          </div>
        )}

        {dbPath && (
          <p
            title={dbPath}
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              margin: '0 0 12px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {dbPath}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ActionButton onClick={() => void window.mycel.openDataFolder()}>
            Open data folder
          </ActionButton>
          <ActionButton disabled onClick={() => {}}>
            Export all as Markdown
            <ComingSoonBadge />
          </ActionButton>
          <ActionButton disabled onClick={() => {}}>
            Import from Apple Contacts
            <ComingSoonBadge />
          </ActionButton>
        </div>
      </Section>

      <Section title="About" border={false}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text)' }}>
            Mycel {version ? `v${version}` : ''}
          </span>
          <button
            onClick={() => void handleCheckUpdates()}
            disabled={updateBusy}
            style={{
              ...secondaryBtn,
              opacity: updateBusy ? 0.6 : 1,
              cursor: updateBusy ? 'wait' : 'pointer'
            }}
          >
            {updateBusy ? 'Checking…' : 'Check for updates'}
          </button>
        </div>
        {updateMessage && <StatusLine>{updateMessage}</StatusLine>}
        <a
          href="https://github.com/tigerjoseph/mycel/releases"
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}
        >
          View releases on GitHub
        </a>
      </Section>
    </div>
  )
}

function Section({
  title,
  children,
  border = true
}: {
  title: string
  children: React.ReactNode
  border?: boolean
}): React.JSX.Element {
  return (
    <section
      style={{
        paddingBottom: 22,
        marginBottom: 22,
        borderBottom: border ? '1px solid var(--border)' : undefined
      }}
    >
      <h2 style={sectionTitleStyle}>{title}</h2>
      {children}
    </section>
  )
}

function IntegrationRow({
  connected,
  label,
  action
}: {
  connected: boolean
  label: string
  action: React.ReactNode
}): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 6
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <StatusDot ok={connected} />
        <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
      </div>
      <div style={{ flexShrink: 0 }}>{action}</div>
    </div>
  )
}

function StatusDot({ ok }: { ok: boolean }): React.JSX.Element {
  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: ok ? '#22c55e' : '#9ca3af',
        flexShrink: 0
      }}
    />
  )
}

function ToolStatus({ ok, label }: { ok: boolean; label: string }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <StatusDot ok={ok} />
      <span style={{ fontSize: 12, color: 'var(--text)' }}>{label}</span>
    </div>
  )
}

function ComingSoonBadge(): React.JSX.Element {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 500,
        color: 'var(--text-muted)',
        backgroundColor: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '2px 6px',
        marginLeft: 8
      }}
    >
      Soon
    </span>
  )
}

function Hint({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
      {children}
    </p>
  )
}

function StatusLine({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0' }}>{children}</p>
  )
}

function ActionButton({
  children,
  onClick,
  disabled
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 14px',
        borderRadius: 6,
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface)',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 13,
        fontFamily: 'var(--font-ui)',
        color: disabled ? 'var(--text-muted)' : 'var(--text)',
        textAlign: 'left',
        opacity: disabled ? 0.7 : 1,
        transition: 'background 150ms ease'
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.backgroundColor = 'var(--bg)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--surface)'
      }}
    >
      {children}
    </button>
  )
}

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--text)',
  margin: '0 0 14px 0'
}

const gridHeaderStyle: React.CSSProperties = {
  fontSize: 11,
  fontFamily: 'var(--font-ui)',
  fontWeight: 500,
  color: 'var(--text-muted)',
  textAlign: 'center',
  textTransform: 'capitalize'
}

const gridRowLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontFamily: 'var(--font-ui)',
  fontWeight: 500,
  color: 'var(--text-muted)',
  paddingRight: 8
}

const secondaryBtn: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  backgroundColor: 'var(--surface)',
  fontSize: 12,
  fontFamily: 'var(--font-ui)',
  color: 'var(--text)'
}

const inputStyle: React.CSSProperties = {
  width: 200,
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  backgroundColor: 'var(--surface)',
  fontSize: 12,
  fontFamily: 'var(--font-ui)',
  color: 'var(--text)',
  outline: 'none'
}
