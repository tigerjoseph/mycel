import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Square, Upload, FileText, Circle } from 'lucide-react'
import { format } from 'date-fns'
import type { Meeting } from '@shared/types'
import { useUIStore } from '../store/ui'

type RecState = 'idle' | 'recording' | 'processing'

function releaseStream(stream: MediaStream | null): void {
  if (!stream) return
  for (const track of stream.getTracks()) {
    try {
      track.stop()
    } catch {
      // ignore
    }
  }
}

export function Meetings(): React.JSX.Element {
  const showCopyFeedback = useUIStore((s) => s.showCopyFeedback)
  const createView = useUIStore((s) => s.createView)
  const activePage = useUIStore((s) => s.activePage)

  const [recState, setRecState] = useState<RecState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [title, setTitle] = useState('')
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const refreshMeetings = useCallback(async () => {
    try {
      const list = await window.mycel.getMeetings()
      if (mountedRef.current) setMeetings(list as Meeting[])
    } catch {
      // ignore
    }
  }, [])

  const teardownRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.ondataavailable = null
        recorder.onstop = null
        recorder.stop()
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null
    releaseStream(streamRef.current)
    streamRef.current = null
    chunksRef.current = []
  }, [])

  // Hard release on leave Create → Meetings or page switch (prevents mic lock / CPU bleed)
  useEffect(() => {
    mountedRef.current = true
    void refreshMeetings()
    return () => {
      mountedRef.current = false
      teardownRecording()
    }
  }, [refreshMeetings, teardownRecording])

  useEffect(() => {
    if (activePage !== 'create' || createView !== 'meetings') {
      teardownRecording()
      setRecState('idle')
      setElapsed(0)
    }
  }, [activePage, createView, teardownRecording])

  const startRecording = async (): Promise<void> => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      })
      streamRef.current = stream
      chunksRef.current = []

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : ''

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      mediaRecorderRef.current = recorder
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.start(1000)
      setRecState('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } catch (err) {
      releaseStream(streamRef.current)
      streamRef.current = null
      setError(err instanceof Error ? err.message : 'Microphone access denied')
      setRecState('idle')
    }
  }

  const stopAndProcess = async (): Promise<void> => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return

    setRecState('processing')
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm'
        resolve(new Blob(chunksRef.current, { type }))
      }
      recorder.onerror = () => reject(new Error('Recording failed'))
      try {
        recorder.stop()
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Could not stop recording'))
      }
    })

    releaseStream(streamRef.current)
    streamRef.current = null
    mediaRecorderRef.current = null
    chunksRef.current = []

    try {
      const buffer = await blob.arrayBuffer()
      const result = await window.mycel.importRecording({
        data: buffer,
        title: title.trim() || undefined,
        mimeType: blob.type || 'audio/webm'
      })
      const atomCount = result.atoms?.length ?? 0
      showCopyFeedback(
        atomCount > 0
          ? `Imported — ${atomCount} atom${atomCount === 1 ? '' : 's'}`
          : 'Meeting imported'
      )
      setTitle('')
      await refreshMeetings()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      if (mountedRef.current) setRecState('idle')
      setElapsed(0)
    }
  }

  const formatElapsed = (s: number): string => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '4px 20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
        <div>
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
            Meetings
          </h2>
          <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>
            Record or import in Mycel — no second app. Audio releases when you leave this tab.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button type="button" onClick={() => setPasteOpen((v) => !v)} style={ghostBtn} disabled={recState !== 'idle'}>
            <FileText size={13} />
            Paste
          </button>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                setError(null)
                setRecState('processing')
                try {
                  await window.mycel.pickAndImport()
                  showCopyFeedback('Imported')
                  await refreshMeetings()
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Import failed')
                } finally {
                  setRecState('idle')
                }
              })()
            }}
            style={ghostBtn}
            disabled={recState !== 'idle'}
          >
            <Upload size={13} />
            Import
          </button>
        </div>
      </div>

      <div
        style={{
          padding: 18,
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          marginBottom: 18,
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Meeting title (optional)"
          disabled={recState === 'processing'}
          style={{
            width: '100%',
            marginBottom: 14,
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            color: 'var(--text)',
            outline: 'none'
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {recState === 'recording' ? (
            <button type="button" onClick={() => void stopAndProcess()} style={stopBtn}>
              <Square size={14} fill="currentColor" />
              Stop & process
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startRecording()}
              disabled={recState === 'processing'}
              style={{ ...recordBtn, opacity: recState === 'processing' ? 0.55 : 1 }}
            >
              <Mic size={15} />
              {recState === 'processing' ? 'Processing…' : 'Start recording'}
            </button>
          )}

          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              fontVariantNumeric: 'tabular-nums',
              color: recState === 'recording' ? '#C0392B' : 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {recState === 'recording' && <Circle size={8} fill="currentColor" />}
            {recState === 'recording' ? formatElapsed(elapsed) : recState === 'processing' ? 'Transcribing…' : 'Mic idle'}
          </span>
        </div>

        {error && (
          <p style={{ margin: '12px 0 0', fontFamily: 'var(--font-ui)', fontSize: 12, color: '#C0392B' }}>
            {error}
          </p>
        )}
      </div>

      {pasteOpen && (
        <div
          style={{
            marginBottom: 18,
            padding: 14,
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)'
          }}
        >
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste a transcript…"
            rows={5}
            style={{
              width: '100%',
              resize: 'vertical',
              minHeight: 96,
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: 'var(--text)',
              outline: 'none'
            }}
          />
          <button
            type="button"
            disabled={!pasteText.trim() || recState !== 'idle'}
            onClick={() => {
              const text = pasteText.trim()
              if (!text) return
              void (async () => {
                setRecState('processing')
                try {
                  await window.mycel.importTranscript({
                    text,
                    title: title.trim() || undefined
                  })
                  setPasteText('')
                  setPasteOpen(false)
                  showCopyFeedback('Imported')
                  await refreshMeetings()
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Import failed')
                } finally {
                  setRecState('idle')
                }
              })()
            }}
            style={{ ...recordBtn, marginTop: 10, opacity: !pasteText.trim() ? 0.5 : 1 }}
          >
            Import transcript
          </button>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <div
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: 10
          }}
        >
          Recent
        </div>
        {meetings.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)' }}>
            No meetings yet. Record one or import a transcript / audio file.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {meetings.slice(0, 40).map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 8px',
                  borderRadius: 8,
                  borderBottom: '1px solid var(--border)'
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {m.title || 'Untitled meeting'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {m.source === 'recording' ? 'Recording' : 'Import'} ·{' '}
                    {format(m.createdAt, 'MMM d, yyyy · h:mm a')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const ghostBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 32,
  padding: '0 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text)'
}

const recordBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  minHeight: 36,
  padding: '0 16px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--text)',
  color: 'var(--bg)',
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
  fontSize: 13,
  fontWeight: 600
}

const stopBtn: React.CSSProperties = {
  ...recordBtn,
  background: '#C0392B',
  color: '#fff'
}
