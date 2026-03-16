import { useEffect, useState, useMemo } from 'react'
import Fuse from 'fuse.js'
import { formatDistanceToNow } from 'date-fns'
import { Plus, Search } from 'lucide-react'
import { useUIStore } from '../store/ui'
import { useContactsStore } from '../store/contacts'
import type { Contact } from '@shared/types'

type SortMode = 'recent' | 'name' | 'company' | 'last contacted'

export function ContactList(): React.JSX.Element {
  const setActiveContactId = useUIStore((s) => s.setActiveContactId)

  const contacts = useContactsStore((s) => s.contacts)
  const fetchContacts = useContactsStore((s) => s.fetch)
  const upsert = useContactsStore((s) => s.upsert)

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortMode>('recent')

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const fuse = useMemo(
    () =>
      new Fuse(contacts, {
        keys: ['name', 'tags', 'metadata.company', 'metadata.email'],
        threshold: 0.3
      }),
    [contacts]
  )

  const filtered = useMemo(() => {
    const base = query.trim()
      ? fuse.search(query).map((r) => r.item)
      : [...contacts]

    if (sort === 'name') {
      return base.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    }
    if (sort === 'company') {
      return base.sort((a, b) => {
        const compA = a.metadata?.company || ''
        const compB = b.metadata?.company || ''
        // contacts without a company sort to the end
        if (!compA && compB) return 1
        if (compA && !compB) return -1
        return compA.localeCompare(compB)
      })
    }
    if (sort === 'last contacted') {
      return base.sort((a, b) => {
        // null lastContactedAt sorts to the end
        if (a.lastContactedAt == null && b.lastContactedAt == null) return 0
        if (a.lastContactedAt == null) return 1
        if (b.lastContactedAt == null) return -1
        return b.lastContactedAt - a.lastContactedAt
      })
    }
    // recent: by updatedAt descending
    return base.sort((a, b) => b.updatedAt - a.updatedAt)
  }, [contacts, query, sort, fuse])

  const handleContactClick = (contact: Contact): void => {
    setActiveContactId(contact.id)
  }

  const handleNewContact = async (): Promise<void> => {
    const newContact: Contact = {
      id: crypto.randomUUID(),
      name: '',
      metadata: {},
      tags: [],
      lastContactedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    await upsert(newContact)
    setActiveContactId(newContact.id)
  }

  return (
    <>
      {/* Search input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          marginBottom: 16
        }}
      >
        <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search contacts..."
          style={{
            background: 'none',
            border: 'none',
            outline: 'none',
            flex: 1,
            fontSize: 14,
            fontFamily: 'Inter, sans-serif',
            color: 'var(--text)',
            lineHeight: 1.4
          }}
        />
      </div>

      {/* Sort toggle */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {(['recent', 'name', 'company', 'last contacted'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setSort(mode)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'Inter, sans-serif',
              fontWeight: sort === mode ? 500 : 400,
              color: sort === mode ? 'var(--text)' : 'var(--text-muted)',
              padding: 0,
              transition: 'color 150ms ease'
            }}
          >
            {mode === 'recent'
              ? 'Recent'
              : mode === 'name'
                ? 'Name'
                : mode === 'company'
                  ? 'Company'
                  : 'Last contacted'}
          </button>
        ))}
      </div>

      {/* Contact rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filtered.map((contact) => (
          <button
            key={contact.id}
            onClick={() => handleContactClick(contact)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid var(--border)',
              width: '100%',
              textAlign: 'left',
              transition: 'background 100ms ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
              {/* Subheading: company + role */}
              {(contact.metadata?.company || contact.metadata?.role) && (
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {[contact.metadata?.role, contact.metadata?.company]
                    .filter(Boolean)
                    .join(' at ')}
                </span>
              )}
              {/* Tags (max 2, inline pills) */}
              {contact.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                  {contact.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 10,
                        color: 'var(--accent)',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '0px 6px'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                  {contact.tags.length > 2 && (
                    <span
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 10,
                        color: 'var(--text-muted)'
                      }}
                    >
                      +{contact.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                color: 'var(--text-muted)',
                flexShrink: 0,
                marginLeft: 16
              }}
            >
              {formatDistanceToNow(contact.updatedAt, { addSuffix: true })}
            </span>
          </button>
        ))}
      </div>

      {/* New contact link at bottom */}
      <button
        onClick={handleNewContact}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 13,
          fontFamily: 'Inter, sans-serif',
          color: 'var(--text-muted)',
          padding: '16px 0 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          transition: 'color 150ms ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <Plus size={13} />
        new contact
      </button>
    </>
  )
}
