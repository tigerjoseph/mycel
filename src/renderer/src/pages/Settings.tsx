import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

export function Settings(): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>('light')
  const [stripeKey, setStripeKey] = useState('')
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.mycel.getTheme().then((t) => setTheme(t))
    window.mycel.getVersion().then((v) => setVersion(v))
  }, [])

  const handleTheme = (t: Theme): void => {
    setTheme(t)
    document.documentElement.dataset.theme = t
    window.mycel.setTheme(t)
  }

  return (
    <div
      style={{
        padding: 32,
        backgroundColor: 'var(--bg)',
        minHeight: '100%',
        overflowY: 'auto',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      {/* Appearance */}
      <section style={{ paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <h2
          style={{
            fontFamily: 'Lora, serif',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text)',
            margin: '0 0 16px 0'
          }}
        >
          Appearance
        </h2>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => handleTheme('light')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              border: theme === 'light' ? '1.5px solid var(--accent)' : '1px solid var(--border)',
              color: theme === 'light' ? 'var(--accent)' : 'var(--text-muted)',
              backgroundColor: theme === 'light' ? 'var(--bg)' : 'var(--surface)',
              transition: 'all 150ms ease'
            }}
          >
            Light
          </button>
          <button
            onClick={() => handleTheme('dark')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              border: theme === 'dark' ? '1.5px solid var(--accent)' : '1px solid var(--border)',
              color: theme === 'dark' ? 'var(--accent)' : 'var(--text-muted)',
              backgroundColor: theme === 'dark' ? 'var(--bg)' : 'var(--surface)',
              transition: 'all 150ms ease'
            }}
          >
            Dark
          </button>
        </div>
      </section>

      {/* Integrations */}
      <section style={{ paddingTop: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <h2
          style={{
            fontFamily: 'Lora, serif',
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
              fontFamily: 'Inter, sans-serif',
              color: 'var(--text-muted)',
              opacity: 0.6
            }}
          >
            Connect Google Calendar
          </button>
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
              fontFamily: 'Inter, sans-serif',
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
            fontFamily: 'Lora, serif',
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
              fontFamily: 'Inter, sans-serif',
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
              fontFamily: 'Inter, sans-serif',
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
            fontFamily: 'Inter, sans-serif',
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
