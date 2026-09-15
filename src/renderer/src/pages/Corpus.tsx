import { useCallback, useEffect, useState } from 'react'
import { Pin, VolumeX, Plus } from 'lucide-react'
import { insightTextError } from '@shared/contentEngine'
import type { CorpusInsight, CorpusThread, CorpusThreadStatus, CreateInsightInput } from '@shared/types'
import { format } from 'date-fns'

type CorpusPane = 'insights' | 'patterns' | 'inbox'

const PANES: { id: CorpusPane; label: string }[] = [
  { id: 'insights', label: 'Insights' },
  { id: 'patterns', label: 'Patterns' },
  { id: 'inbox', label: 'Inbox' }
]

export function Corpus(): React.JSX.Element {
  const [pane, setPane] = useState<CorpusPane>('insights')

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '4px 20px 24px' }}>
      <div style={{ marginBottom: 14 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-heading)',
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--text)'
          }}
        >
          Corpus
        </h2>
        <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>
          Distilled meaning — insights and patterns. Capture inbox is a later phase.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {PANES.map((tab) => {
          const active = pane === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPane(tab.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: active ? 'var(--surface)' : 'transparent',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: active ? 'var(--shadow-sm)' : undefined
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {pane === 'insights' && <InsightsPane />}
        {pane === 'patterns' && <PatternsPane />}
        {pane === 'inbox' && <InboxPane />}
      </div>
    </div>
  )
}

function InsightsPane(): React.JSX.Element {
  const [insights, setInsights] = useState<CorpusInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [text, setText] = useState('')
  const [soWhat, setSoWhat] = useState('')
  const [source, setSource] = useState('')
  const [pillar, setPillar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const rows = await window.mycel.getInsights()
    setInsights(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    load().catch(() => setLoading(false))
  }, [load])

  const resetForm = (): void => {
    setText('')
    setSoWhat('')
    setSource('')
    setPillar('')
    setError(null)
  }

  const handleSave = async (): Promise<void> => {
    const validation = insightTextError(text)
    if (validation) {
      setError(validation)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const input: CreateInsightInput = {
        text: text.trim(),
        soWhat: soWhat.trim() || null,
        source: source.trim() || null,
        pillar: pillar.trim() || null,
        origin: 'manual'
      }
      const created = await window.mycel.createInsight(input)
      setInsights((prev) => [created, ...prev])
      resetForm()
      setFormOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save insight')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => {
            setFormOpen((open) => !open)
            setError(null)
          }}
          style={primaryBtn}
        >
          <Plus size={13} />
          Add insight
        </button>
      </div>

      {formOpen && (
        <div
          style={{
            marginBottom: 16,
            padding: 14,
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <label style={labelStyle}>Insight</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="1–3 sentences. One clear idea."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
            <div>
              <label style={labelStyle}>So what</label>
              <input
                value={soWhat}
                onChange={(e) => setSoWhat(e.target.value)}
                placeholder="Optional"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Source</label>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Optional"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Pillar</label>
              <input
                value={pillar}
                onChange={(e) => setPillar(e.target.value)}
                placeholder="Optional"
                style={inputStyle}
              />
            </div>
          </div>
          {error && (
            <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-ui)', fontSize: 12, color: '#D93025' }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => {
                resetForm()
                setFormOpen(false)
              }}
              style={ghostBtn}
            >
              Cancel
            </button>
            <button type="button" onClick={() => void handleSave()} disabled={saving} style={primaryBtn}>
              {saving ? 'Saving…' : 'Save insight'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <EmptyLine>Loading…</EmptyLine>
      ) : insights.length === 0 ? (
        <EmptyLine>No insights yet. Add one by hand — extractors come later.</EmptyLine>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {insights.map((insight) => (
            <article
              key={insight.id}
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)'
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-ui)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: 'var(--text)'
                }}
              >
                {insight.text}
              </p>
              {insight.soWhat && (
                <p
                  style={{
                    margin: '6px 0 0',
                    fontFamily: 'var(--font-ui)',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.4
                  }}
                >
                  {insight.soWhat}
                </p>
              )}
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  marginTop: 8,
                  fontFamily: 'var(--font-ui)',
                  fontSize: 11,
                  color: 'var(--text-muted)'
                }}
              >
                {insight.origin === 'manual' && <span>Manual</span>}
                {insight.source && <span>{insight.source}</span>}
                {insight.pillar && <span>{insight.pillar}</span>}
                <span>{format(insight.createdAt, 'MMM d')}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function PatternsPane(): React.JSX.Element {
  const [threads, setThreads] = useState<CorpusThread[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const rows = await window.mycel.getCorpusThreads()
    setThreads(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    load().catch(() => setLoading(false))
  }, [load])

  const setStatus = async (thread: CorpusThread, status: CorpusThreadStatus): Promise<void> => {
    const previous = threads
    setThreads((prev) => prev.map((t) => (t.id === thread.id ? { ...t, status } : t)))
    try {
      const updated = await window.mycel.setCorpusThreadStatus(thread.id, status)
      setThreads((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    } catch {
      setThreads(previous)
    }
  }

  if (loading) return <EmptyLine>Loading…</EmptyLine>
  if (threads.length === 0) {
    return <EmptyLine>No patterns yet. They’ll cluster here from insights in a later phase.</EmptyLine>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {threads.map((thread) => {
        const pinned = thread.status === 'pinned'
        const muted = thread.status === 'muted'
        return (
          <article
            key={thread.id}
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              opacity: muted ? 0.65 : 1
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text)'
                    }}
                  >
                    {thread.title || thread.meaning || 'Untitled pattern'}
                  </span>
                  <StatusChip status={thread.status} />
                </div>
                {thread.meaning && thread.title && (
                  <p
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-ui)',
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      lineHeight: 1.4
                    }}
                  >
                    {thread.meaning}
                  </p>
                )}
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: 'var(--font-ui)',
                    fontSize: 11,
                    color: 'var(--text-muted)'
                  }}
                >
                  {thread.evidenceCount} evidence · diversity {thread.sourceDiversity}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  aria-label={pinned ? 'Unpin pattern' : 'Pin pattern'}
                  onClick={() => void setStatus(thread, pinned ? 'active' : 'pinned')}
                  style={{
                    ...iconBtn,
                    color: pinned ? 'var(--accent)' : 'var(--text-muted)'
                  }}
                >
                  <Pin size={13} />
                </button>
                <button
                  type="button"
                  aria-label={muted ? 'Unmute pattern' : 'Mute pattern'}
                  onClick={() => void setStatus(thread, muted ? 'emerging' : 'muted')}
                  style={{
                    ...iconBtn,
                    color: muted ? 'var(--text)' : 'var(--text-muted)'
                  }}
                >
                  <VolumeX size={13} />
                </button>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function InboxPane(): React.JSX.Element {
  return (
    <EmptyLine>Inbox is empty. Raw dumps and capture land here in a later phase.</EmptyLine>
  )
}

function StatusChip({ status }: { status: CorpusThreadStatus }): React.JSX.Element {
  return (
    <span
      style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: 'var(--text-muted)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '1px 6px'
      }}
    >
      {status}
    </span>
  )
}

function EmptyLine({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p
      style={{
        margin: '24px 0 0',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-muted)',
        textAlign: 'center'
      }}
    >
      {children}
    </p>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-ui)',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--text-muted)',
  marginBottom: 4
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg)',
  fontSize: 13,
  fontFamily: 'var(--font-ui)',
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box'
}

const primaryBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'var(--font-ui)',
  fontWeight: 600,
  color: 'var(--text)',
  boxShadow: 'var(--shadow-sm)'
}

const ghostBtn: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid transparent',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'var(--font-ui)',
  color: 'var(--text-muted)'
}

const iconBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  cursor: 'pointer'
}
