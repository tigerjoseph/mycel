import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pin, VolumeX, Plus } from 'lucide-react'
import { insightTextError, isMeetingInsightOrigin } from '@shared/contentEngine'
import type { CorpusInsight, CorpusThread, CorpusThreadStatus, CreateInsightInput, Dump, WorkSession } from '@shared/types'
import { format } from 'date-fns'
import { useUIStore } from '../store/ui'

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
  const corpusFocusSessionId = useUIStore((s) => s.corpusFocusSessionId)
  const setCorpusFocusSessionId = useUIStore((s) => s.setCorpusFocusSessionId)
  const createView = useUIStore((s) => s.createView)
  const [insights, setInsights] = useState<CorpusInsight[]>([])
  const [sessions, setSessions] = useState<WorkSession[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'manual' | 'meeting'>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [text, setText] = useState('')
  const [soWhat, setSoWhat] = useState('')
  const [source, setSource] = useState('')
  const [pillar, setPillar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [rows, meetingSessions] = await Promise.all([
      window.mycel.getInsights(),
      window.mycel.getSessions()
    ])
    setInsights(rows)
    setSessions(meetingSessions)
    setLoading(false)
  }, [])

  useEffect(() => {
    load().catch(() => setLoading(false))
  }, [load])

  useEffect(() => {
    if (createView === 'corpus') load().catch(() => {})
  }, [createView, load])

  useEffect(() => {
    if (corpusFocusSessionId) setFilter('meeting')
  }, [corpusFocusSessionId])

  const sessionTitle = useMemo(() => {
    const map = new Map<string, string>()
    for (const session of sessions) {
      map.set(session.id, session.title || 'Untitled session')
    }
    return map
  }, [sessions])

  const visible = useMemo(() => {
    return insights.filter((insight) => {
      if (corpusFocusSessionId && insight.sessionId !== corpusFocusSessionId) return false
      if (filter === 'manual') return insight.origin === 'manual'
      if (filter === 'meeting') return isMeetingInsightOrigin(insight.origin)
      return true
    })
  }, [insights, filter, corpusFocusSessionId])

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
      setInsights((prev) => (prev.some((row) => row.id === created.id) ? prev : [created, ...prev]))
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {([
            { id: 'all', label: 'All' },
            { id: 'manual', label: 'Manual' },
            { id: 'meeting', label: 'From meetings' }
          ] as const).map((tab) => {
            const active = filter === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilter(tab.id)
                  if (tab.id !== 'meeting') setCorpusFocusSessionId(null)
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: active ? 'var(--surface)' : 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 11,
                  fontWeight: active ? 600 : 500,
                  color: active ? 'var(--text)' : 'var(--text-muted)'
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
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
      ) : visible.length === 0 ? (
        <EmptyLine>
          {filter === 'meeting'
            ? 'No meeting-sourced insights yet. Import a transcript in Extractions.'
            : 'No insights yet. Add one by hand — extractors come later.'}
        </EmptyLine>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map((insight) => (
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
                  color: 'var(--text-muted)',
                  flexWrap: 'wrap'
                }}
              >
                <span>{originLabel(insight.origin)}</span>
                {insight.sessionId && sessionTitle.get(insight.sessionId) && (
                  <span>{sessionTitle.get(insight.sessionId)}</span>
                )}
                {insight.source && insight.source !== 'meeting' && <span>{insight.source}</span>}
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
  const createView = useUIStore((s) => s.createView)
  const [threads, setThreads] = useState<CorpusThread[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | CorpusThreadStatus>('all')

  const load = useCallback(async () => {
    const rows = await window.mycel.getCorpusThreads()
    setThreads(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    load().catch(() => setLoading(false))
  }, [load])

  useEffect(() => {
    if (createView === 'corpus') load().catch(() => {})
  }, [createView, load])

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

  const visible = useMemo(() => {
    return threads.filter((thread) => {
      const listed =
        thread.surfaced ||
        thread.status === 'pinned' ||
        thread.status === 'muted' ||
        (thread.status === 'emerging' && thread.evidenceCount >= 2)
      if (!listed) return false
      if (filter === 'all') return true
      return thread.status === filter
    })
  }, [threads, filter])

  if (loading) return <EmptyLine>Loading…</EmptyLine>
  if (visible.length === 0) {
    return (
      <div>
        <PatternFilters filter={filter} setFilter={setFilter} />
        <EmptyLine>
          No patterns yet. Add 3 related insights, or 2 from different sources, and they’ll cluster here.
        </EmptyLine>
      </div>
    )
  }

  return (
    <div>
      <PatternFilters filter={filter} setFilter={setFilter} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map((thread) => {
          const pinned = thread.status === 'pinned'
          const muted = thread.status === 'muted'
          const unpinTo = thread.surfaced ? 'active' : 'emerging'
          const unmuteTo = thread.surfaced ? 'active' : 'emerging'
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
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
                    {!thread.eligibleForDraft && muted && (
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-muted)' }}>
                        excluded from drafts
                      </span>
                    )}
                  </div>
                  {thread.meaning && thread.title && thread.meaning !== thread.title && (
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
                    {thread.evidenceCount} evidence · diversity {thread.sourceDiversity} · score{' '}
                    {thread.meaningScore.toFixed(1)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    aria-label={pinned ? 'Unpin pattern' : 'Pin pattern'}
                    onClick={() => void setStatus(thread, pinned ? unpinTo : 'pinned')}
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
                    onClick={() => void setStatus(thread, muted ? unmuteTo : 'muted')}
                    style={{
                      ...iconBtn,
                      color: muted ? 'var(--text)' : 'var(--text-muted)'
                    }}
                  >
                    <VolumeX size={13} />
                  </button>
                </div>
              </div>
              {thread.insights.length > 0 && (
                <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {thread.insights.map((insight) => (
                    <li
                      key={insight.id}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 6,
                        background: 'var(--bg)',
                        fontFamily: 'var(--font-ui)',
                        fontSize: 12,
                        lineHeight: 1.45,
                        color: 'var(--text)'
                      }}
                    >
                      <div>{insight.text}</div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 10,
                          color: 'var(--text-muted)'
                        }}
                      >
                        {originLabel(insight.origin)}
                        {insight.source ? ` · ${insight.source}` : ''}
                        {' · '}
                        {format(insight.createdAt, 'MMM d')}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

function PatternFilters({
  filter,
  setFilter
}: {
  filter: 'all' | CorpusThreadStatus
  setFilter: (id: 'all' | CorpusThreadStatus) => void
}): React.JSX.Element {
  const tabs: { id: 'all' | CorpusThreadStatus; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'emerging', label: 'Emerging' },
    { id: 'active', label: 'Active' },
    { id: 'pinned', label: 'Pinned' },
    { id: 'muted', label: 'Muted' }
  ]
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
      {tabs.map((tab) => {
        const active = filter === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: active ? 'var(--surface)' : 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              fontSize: 11,
              fontWeight: active ? 600 : 500,
              color: active ? 'var(--text)' : 'var(--text-muted)'
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

function InboxPane(): React.JSX.Element {
  const createView = useUIStore((s) => s.createView)
  const [dumps, setDumps] = useState<Dump[]>([])
  const [loading, setLoading] = useState(true)
  const [telegramConfigured, setTelegramConfigured] = useState<boolean | null>(null)

  const load = useCallback(async () => {
    const [rows, status] = await Promise.all([
      window.mycel.getDumps(),
      window.mycel.getTelegramStatus().catch(() => null)
    ])
    setDumps(rows)
    setTelegramConfigured(status ? status.configured : false)
    setLoading(false)
  }, [])

  useEffect(() => {
    load().catch(() => setLoading(false))
  }, [load])

  useEffect(() => {
    if (createView === 'corpus') load().catch(() => {})
  }, [createView, load])

  useEffect(() => {
    return window.mycel.onTelegramDumpReceived((dump) => {
      setDumps((prev) => (prev.some((row) => row.id === dump.id) ? prev : [dump, ...prev]))
    })
  }, [])

  if (loading) return <EmptyLine>Loading…</EmptyLine>

  return (
    <div>
      {telegramConfigured === false && (
        <p
          style={{
            margin: '0 0 12px',
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.45
          }}
        >
          Telegram is disconnected. Add a bot token and user id in Settings, or ingest a test dump there
          to exercise this inbox without a live bot.
        </p>
      )}
      {dumps.length === 0 ? (
        <EmptyLine>No dumps yet. Telegram text/voice lands here with a Saved. reply when connected.</EmptyLine>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dumps.map((dump) => {
            const destination = typeof dump.metadata.destination === 'string' ? dump.metadata.destination : 'inbox'
            const sttFailed = Boolean(dump.metadata.sttFailed)
            return (
              <article
                key={dump.id}
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
                    color: 'var(--text)',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {dump.payload}
                </p>
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: 'var(--font-ui)',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap'
                  }}
                >
                  <span>{dump.source === 'telegram' ? 'Telegram' : dump.source}</span>
                  <span>{dumpDestinationLabel(destination)}</span>
                  {sttFailed && <span>transcription needed</span>}
                  {dump.metadata.localTest ? <span>local test</span> : null}
                  <span>{format(dump.createdAt, 'MMM d, h:mm a')}</span>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function dumpDestinationLabel(destination: string): string {
  if (destination === 'session') return 'Attached to session'
  if (destination === 'thread') return 'Attached to pattern'
  if (destination === 'prompt') return 'Prompt reply'
  return 'Inbox'
}

function originLabel(origin: CorpusInsight['origin']): string {
  if (origin === 'manual') return 'Manual'
  if (origin === 'auto') return 'Meeting'
  if (origin === 'hybrid') return 'Meeting'
  if (origin === 'session') return 'Session'
  if (origin === 'dump') return 'Dump'
  return origin
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
