import { useEffect, useCallback, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { nanoid } from 'nanoid'
import { Trash2 } from 'lucide-react'
import { useUIStore } from '../store/ui'
import { useDocsStore } from '../store/docs'
import { fadeUp, spring } from '../styles/animation'
import { format } from 'date-fns'

export function DocList(): React.JSX.Element {
  const activeFolderId = useUIStore((s) => s.activeFolderId)
  const setDocsView = useUIStore((s) => s.setDocsView)
  const setActiveDocId = useUIStore((s) => s.setActiveDocId)
  const pushBreadcrumb = useUIStore((s) => s.pushBreadcrumb)
  const folders = useDocsStore((s) => s.folders)
  const docs = useDocsStore((s) => s.docs)
  const fetchDocs = useDocsStore((s) => s.fetchDocs)

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; docId: string } | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contextMenu) return
    const handleClick = (e: MouseEvent): void => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [contextMenu])

  const folder = folders.find((f) => f.id === activeFolderId)

  useEffect(() => {
    if (activeFolderId) {
      fetchDocs(activeFolderId)
    }
  }, [activeFolderId, fetchDocs])

  const handleDocClick = useCallback(
    (docId: string) => {
      setActiveDocId(docId)
      setDocsView('editor')
      pushBreadcrumb({
        label: folder?.name ?? 'Folder',
        action: () => setDocsView('list')
      })
    },
    [setActiveDocId, setDocsView, pushBreadcrumb, folder]
  )

  const handleNewDoc = useCallback(async () => {
    const doc = await window.mycel.upsertDoc({
      id: nanoid(),
      title: '',
      body: '',
      type: 'doc',
      folderId: activeFolderId,
      icon: null,
      coverImage: null,
      isTemplate: false,
      isFavorite: false,
      favoriteOrder: null,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    setActiveDocId(doc.id)
    setDocsView('editor')
    pushBreadcrumb({
      label: folder?.name ?? 'Folder',
      action: () => setDocsView('list')
    })
  }, [activeFolderId, setActiveDocId, setDocsView, pushBreadcrumb, folder])

  return (
    <motion.div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 40px', height: '100%' }} {...fadeUp}>
      {/* Breadcrumb */}
      <div
        className="font-ui"
        style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}
      >
        <span
          style={{ cursor: 'pointer' }}
          onClick={() => setDocsView('home')}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          Docs
        </span>
        <span style={{ margin: '0 6px' }}>&rsaquo;</span>
        <span style={{ color: 'var(--text)' }}>{folder?.name ?? 'Folder'}</span>
      </div>

      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 24
        }}
      >
        <h1
          className="font-heading"
          style={{ fontSize: 22, color: 'var(--text)', fontWeight: 600, margin: 0 }}
        >
          {folder?.name ?? 'Folder'}
        </h1>
        <button
          onClick={handleNewDoc}
          className="font-ui"
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          + new doc
        </button>
      </div>

      {/* List */}
      {docs.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '40%'
          }}
        >
          <span className="font-heading" style={{ fontSize: 16, color: 'var(--text-muted)' }}>
            This folder is empty
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {docs.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'transparent',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'background 150ms ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface)'
                const del = e.currentTarget.querySelector('[data-delete]') as HTMLElement
                if (del) del.style.opacity = '1'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                const del = e.currentTarget.querySelector('[data-delete]') as HTMLElement
                if (del) del.style.opacity = '0'
              }}
              onClick={() => handleDocClick(doc.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                setContextMenu({ x: e.clientX, y: e.clientY, docId: doc.id })
              }}
            >
              <span
                className="font-heading"
                style={{ fontSize: 14, color: 'var(--text)', fontWeight: 400 }}
              >
                {doc.title || 'Untitled'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  data-delete
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Delete this document?')) {
                      window.mycel.deleteDoc(doc.id).then(() => {
                        if (activeFolderId) fetchDocs(activeFolderId)
                      })
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    color: 'var(--text-muted)',
                    opacity: 0,
                    transition: 'opacity 150ms ease, color 150ms ease',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#D93025' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  <Trash2 size={14} />
                </button>
                <span className="font-ui" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Right-click context menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            ref={contextMenuRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={spring}
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 6,
              minWidth: 160,
              zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            <button
              onClick={() => {
                const docId = contextMenu.docId
                setContextMenu(null)
                window.mycel.deleteDoc(docId).then(() => {
                  if (activeFolderId) fetchDocs(activeFolderId)
                })
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '7px 10px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'Inter, sans-serif',
                color: '#D93025',
                borderRadius: 6,
                transition: 'background 100ms ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
            >
              <Trash2 size={13} />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
