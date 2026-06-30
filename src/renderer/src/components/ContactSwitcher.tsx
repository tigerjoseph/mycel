import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Fuse from 'fuse.js'
import { Plus } from 'lucide-react'
import { springGentle } from '../styles/animation'
import { useUIStore } from '../store/ui'
import { useContactsStore } from '../store/contacts'
import { contactFromQuery, hasExactContactName } from '../utils/contactFromQuery'

export function ContactSwitcher(): React.JSX.Element {
  const open = useUIStore((s) => s.contactSwitcherOpen)
  const setOpen = useUIStore((s) => s.setContactSwitcherOpen)
  const setPage = useUIStore((s) => s.setPage)
  const setActiveContactId = useUIStore((s) => s.setActiveContactId)
  const pushBreadcrumb = useUIStore((s) => s.pushBreadcrumb)

  const contacts = useContactsStore((s) => s.contacts)
  const upsertContact = useContactsStore((s) => s.upsert)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const fuse = useMemo(
    () => new Fuse(contacts, { keys: ['name', 'tags', 'metadata.company'], threshold: 0.3 }),
    [contacts]
  )

  const queryTrimmed = query.trim()
  const results = useMemo(() => {
    if (!queryTrimmed) return contacts.slice(0, 8)
    return fuse.search(queryTrimmed).map((r) => r.item).slice(0, 8)
  }, [contacts, queryTrimmed, fuse])

  const showAddNew = queryTrimmed.length > 0 && !hasExactContactName(contacts, queryTrimmed)
  const itemCount = results.length + (showAddNew ? 1 : 0)
  const addNewIndex = showAddNew ? results.length : -1

  useEffect(() => {
    if (selectedIndex >= itemCount) {
      setSelectedIndex(Math.max(0, itemCount - 1))
    }
  }, [itemCount, selectedIndex])

  const selectContact = useCallback(
    (id: string, name: string) => {
      setPage('people')
      setActiveContactId(id)
      pushBreadcrumb({
        label: name || 'Untitled',
        action: () => setActiveContactId(null)
      })
      setOpen(false)
    },
    [setPage, setActiveContactId, pushBreadcrumb, setOpen]
  )

  const handleAddNew = useCallback(async () => {
    if (!queryTrimmed || creating) return
    setCreating(true)
    try {
      const contact = contactFromQuery(queryTrimmed)
      await upsertContact(contact)
      selectContact(contact.id, contact.name)
    } finally {
      setCreating(false)
    }
  }, [queryTrimmed, creating, upsertContact, selectContact])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, itemCount - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        return
      }
      if (e.key === 'Enter' && itemCount > 0) {
        e.preventDefault()
        if (selectedIndex === addNewIndex) {
          void handleAddNew()
          return
        }
        const contact = results[selectedIndex]
        if (contact) selectContact(contact.id, contact.name)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, results, selectedIndex, addNewIndex, itemCount, selectContact, handleAddNew, setOpen])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.metaKey && e.key === 'j') {
        e.preventDefault()
        setOpen(!open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, setOpen])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: 120,
            zIndex: 110
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={springGentle}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              borderRadius: 12,
              border: '1px solid var(--border)',
              width: 480,
              maxWidth: '90vw',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)'
              }}
            >
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedIndex(0)
                }}
                placeholder="Jump to contact..."
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontSize: 15,
                  fontFamily: 'var(--font-ui)',
                  color: 'var(--text)',
                  lineHeight: 1.4
                }}
              />
            </div>

            {itemCount > 0 && (
              <div style={{ maxHeight: 360, overflowY: 'auto', padding: '4px 0' }}>
                {results.map((contact, i) => {
                  const isSelected = i === selectedIndex
                  return (
                    <button
                      key={contact.id}
                      onClick={() => selectContact(contact.id, contact.name)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      style={{
                        background: isSelected ? 'var(--bg)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        width: '100%',
                        textAlign: 'left',
                        transition: 'background 60ms ease'
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-ui)',
                          fontSize: 14,
                          color: 'var(--text)',
                          fontWeight: 400
                        }}
                      >
                        {contact.name || 'Untitled'}
                      </span>
                      {contact.metadata?.company && (
                        <span
                          style={{
                            fontFamily: 'var(--font-ui)',
                            fontSize: 12,
                            color: 'var(--text-muted)'
                          }}
                        >
                          {contact.metadata.company}
                        </span>
                      )}
                    </button>
                  )
                })}
                {showAddNew && (
                  <button
                    onClick={() => void handleAddNew()}
                    onMouseEnter={() => setSelectedIndex(addNewIndex)}
                    disabled={creating}
                    style={{
                      background: selectedIndex === addNewIndex ? 'var(--bg)' : 'transparent',
                      border: 'none',
                      borderTop: results.length > 0 ? '1px solid var(--border)' : undefined,
                      cursor: creating ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 16px',
                      width: '100%',
                      textAlign: 'left',
                      opacity: creating ? 0.6 : 1
                    }}
                  >
                    <Plus size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--accent)' }}>
                      {creating ? 'Adding…' : `Add new contact — ${queryTrimmed}`}
                    </span>
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
