import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { springGentle } from '../styles/animation'
import type { CorpusDocType } from '@shared/types'

interface CorpusChooserProps {
  open: boolean
  atomIds: string[]
  hasGoogleKey: boolean
  activeDocId: string | null
  onClose: () => void
  onCreated: (docId: string) => void
}

export function CorpusChooser({
  open,
  atomIds,
  hasGoogleKey,
  activeDocId,
  onClose,
  onCreated
}: CorpusChooserProps): React.JSX.Element | null {
  const [mode, setMode] = useState<'new' | 'append'>('new')
  const [docType, setDocType] = useState<CorpusDocType>('newsletter')
  const [title, setTitle] = useState('')
  const [generateWithGemini, setGenerateWithGemini] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMode('new')
    setDocType('newsletter')
    setTitle('')
    setGenerateWithGemini(false)
    setError(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, onClose])

  const handleCreate = useCallback(async () => {
    if (atomIds.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const doc = await window.mycel.createDocFromAtoms({
        atomIds,
        mode,
        docId: mode === 'append' ? activeDocId ?? undefined : undefined,
        docType,
        title: title.trim() || undefined,
        generateWithGemini: generateWithGemini && hasGoogleKey
      })
      onCreated(doc.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create document')
    } finally {
      setSaving(false)
    }
  }, [atomIds, mode, activeDocId, docType, title, generateWithGemini, hasGoogleKey, onCreated])

  if (!open) return null

  const canAppend = Boolean(activeDocId)

  return (
    <AnimatePresence>
      <motion.div
        key="corpus-chooser-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 200
        }}
      />
      <motion.div
        key="corpus-chooser"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={springGentle}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 'min(420px, calc(100vw - 32px))',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 20, zIndex: 201,
          boxShadow: '0 16px 48px rgba(0,0,0,0.12)'
        }}
      >
        <h2 style={{
          fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 600,
          margin: '0 0 16px', color: 'var(--text)'
        }}>
          New doc from selection
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
            <legend style={labelStyle}>Destination</legend>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <ChoiceButton selected={mode === 'new'} onClick={() => setMode('new')}>
                New document
              </ChoiceButton>
              <ChoiceButton
                selected={mode === 'append'}
                onClick={() => setMode('append')}
                disabled={!canAppend}
              >
                Append to open doc
              </ChoiceButton>
            </div>
            {mode === 'append' && !canAppend && (
              <p style={hintStyle}>Open a doc in Create first to append.</p>
            )}
          </fieldset>

          <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
            <legend style={labelStyle}>Type</legend>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <ChoiceButton selected={docType === 'newsletter'} onClick={() => setDocType('newsletter')}>
                Newsletter
              </ChoiceButton>
              <ChoiceButton selected={docType === 'outline'} onClick={() => setDocType('outline')}>
                Outline
              </ChoiceButton>
            </div>
          </fieldset>

          {mode === 'new' && (
            <div>
              <label style={labelStyle}>Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={docType === 'newsletter' ? 'Newsletter draft' : 'Outline'}
                style={{
                  width: '100%', marginTop: 6, padding: '8px 10px', borderRadius: 6,
                  border: '1px solid var(--border)', background: 'var(--bg)',
                  fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--text)', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          <label style={{
            display: 'flex', alignItems: 'center', gap: 8, cursor: hasGoogleKey ? 'pointer' : 'not-allowed',
            fontSize: 13, fontFamily: 'var(--font-ui)', color: hasGoogleKey ? 'var(--text)' : 'var(--text-muted)'
          }}>
            <input
              type="checkbox"
              checked={generateWithGemini}
              disabled={!hasGoogleKey}
              onChange={(e) => setGenerateWithGemini(e.target.checked)}
            />
            Generate with Gemini
          </label>
          {!hasGoogleKey && (
            <p style={hintStyle}>Add Google AI key in Settings to enable Gemini drafts.</p>
          )}

          {error && (
            <p style={{ ...hintStyle, color: '#dc2626' }}>{error}</p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button
            onClick={() => void handleCreate()}
            disabled={saving || (mode === 'append' && !canAppend)}
            style={{
              ...secondaryBtnStyle,
              background: 'var(--text)', color: 'var(--bg)', borderColor: 'var(--text)',
              opacity: saving || (mode === 'append' && !canAppend) ? 0.5 : 1
            }}
          >
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function ChoiceButton({
  selected,
  onClick,
  disabled,
  children
}: {
  selected: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: '8px 10px',
        borderRadius: 8,
        border: selected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
        background: selected ? 'var(--bg)' : 'var(--surface)',
        color: disabled ? 'var(--text-muted)' : selected ? 'var(--accent)' : 'var(--text)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12,
        fontFamily: 'var(--font-ui)',
        fontWeight: 500,
        opacity: disabled ? 0.5 : 1
      }}
    >
      {children}
    </button>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-ui)'
}

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  margin: '6px 0 0',
  fontFamily: 'var(--font-ui)'
}

const secondaryBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'var(--font-ui)',
  fontWeight: 500
}
