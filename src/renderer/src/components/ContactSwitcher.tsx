import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Fuse from 'fuse.js'
import { springGentle } from '../styles/animation'
import { useUIStore } from '../store/ui'
import { useContactsStore } from '../store/contacts'

export function ContactSwitcher(): React.JSX.Element {
  const open = useUIStore((s) => s.contactSwitcherOpen)
  const setOpen = useUIStore((s) => s.setContactSwitcherOpen)
  const setPage = useUIStore((s) => s.setPage)
  const setActiveContactId = useUIStore((s) => s.setActiveContactId)
  const pushBreadcrumb = useUIStore((s) => s.pushBreadcrumb)

  const contacts = useContactsStore((s) => s.contacts)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset when opened
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

  const results = useMemo(() => {
    if (!query.trim()) return contacts.slice(0, 8)
    return fuse.search(query).map((r) => r.item).slice(0, 8)
  }, [contacts, query, fuse])

  // Clamp selected index
  useEffect(() => {
    if (selectedIndex >= results.length) {
      setSelectedIndex(Math.max(0, results.length - 1))
    }
  }, [results.length, selectedIndex])

  const selectContact = useCallback(
    (id: string, name: string) => {
      setPage('crm')
      setActiveContactId(id)
      pushBreadcrumb({
        label: name || 'Untitled',
        action: () => setActiveContactId(null)
      })
      setOpen(false)
    },
    [setPage, setActiveContactId, pushBreadcrumb, setOpen]
  )

  // Keyboard navigation
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
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        return
      }
      if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault()
        const contact = results[selectedIndex]
        if (contact) selectContact(contact.id, contact.name)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, results, selectedIndex, selectContact, setOpen])

  // Register Cmd+J shortcut
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
            {/* Search input */}
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
                  fontFamily: 'Inter, sans-serif',
                  color: 'var(--text)',
                  lineHeight: 1.4
                }}
              />
            </div>

            {/* Results */}
            {results.length > 0 && (
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
                          fontFamily: 'Inter, sans-serif',
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
                            fontFamily: 'Inter, sans-serif',
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
              </div>
            )}

            {results.length === 0 && query.trim() && (
              <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 13,
                    color: 'var(--text-muted)'
                  }}
                >
                  No contacts found
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
