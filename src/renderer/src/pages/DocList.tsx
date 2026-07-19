import { useEffect, useCallback, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { nanoid } from 'nanoid'
import { Trash2, Pencil } from 'lucide-react'
import { useUIStore } from '../store/ui'
import { useDocsStore } from '../store/docs'
import { fade } from '../styles/animation'
import { ContextMenu } from '../components/ContextMenu'
import { DocIcon } from '../components/DocIcon'
import { DocumentBreadcrumbs } from '../components/DocumentBreadcrumbs'
import { format } from 'date-fns'
import { openDoc } from '../utils/openDoc'

export function DocList(): React.JSX.Element {
  const activeFolderId = useUIStore((s) => s.activeFolderId)
  const setDocsView = useUIStore((s) => s.setDocsView)
  const folders = useDocsStore((s) => s.folders)
  const docs = useDocsStore((s) => s.docs)
  const loading = useDocsStore((s) => s.loading)
  const fetchDocs = useDocsStore((s) => s.fetchDocs)
  const fetchFolders = useDocsStore((s) => s.fetchFolders)

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; docId: string } | null>(null)
  const [renamingFolder, setRenamingFolder] = useState(false)
  const [renameFolderName, setRenameFolderName] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const folder = folders.find((f) => f.id === activeFolderId)

  useEffect(() => {
    if (activeFolderId) {
      fetchDocs(activeFolderId)
    }
  }, [activeFolderId, fetchDocs])

  useEffect(() => {
    if (renamingFolder && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingFolder])

  const handleDocClick = useCallback(
    (docId: string) => {
      const doc = docs.find((d) => d.id === docId)
      if (!doc) return
      openDoc(doc, {
        label: folder?.name ?? 'Folder',
        action: () => setDocsView('list')
      })
    },
    [docs, setDocsView, folder]
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
    openDoc(doc, {
      label: folder?.name ?? 'Folder',
      action: () => setDocsView('list')
    })
  }, [activeFolderId, folder, setDocsView])

  const startFolderRename = useCallback(() => {
    if (!folder) return
    setRenameFolderName(folder.name)
    setRenamingFolder(true)
  }, [folder])

  const handleRenameFolder = useCallback(async () => {
    const name = renameFolderName.trim()
    if (!activeFolderId || !name) {
      setRenamingFolder(false)
      return
    }
    await window.mycel.renameFolder(activeFolderId, name)
    setRenamingFolder(false)
    fetchFolders()
  }, [activeFolderId, renameFolderName, fetchFolders])

  return (
    <motion.div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 40px', height: '100%', overflowY: 'auto' }} {...fade}>
      <DocumentBreadcrumbs
        position="flow"
        items={[{ label: 'Docs', onClick: () => setDocsView('home') }]}
      />

      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 24
        }}
      >
        {renamingFolder ? (
          <input
            ref={renameInputRef}
            value={renameFolderName}
            onChange={(e) => setRenameFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameFolder()
              if (e.key === 'Escape') setRenamingFolder(false)
            }}
            onBlur={handleRenameFolder}
            className="font-heading"
            style={{
              fontSize: 22,
              color: 'var(--text)',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--accent)',
              outline: 'none',
              flex: 1,
              marginRight: 16
            }}
          />
        ) : (
          <h1
            className="font-heading"
            onDoubleClick={startFolderRename}
            title="Double-click to rename"
            style={{ fontSize: 22, color: 'var(--text)', fontWeight: 600, margin: 0, cursor: 'text' }}
          >
            {folder?.name ?? 'Folder'}
          </h1>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {!renamingFolder && (
            <button
              type="button"
              onClick={startFolderRename}
              className="font-ui"
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <Pencil size={13} />
              Rename
            </button>
          )}
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
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              style={{
                height: 48,
                borderRadius: 7,
                background: 'var(--surface)',
                opacity: 0.45 - index * 0.08,
                marginBottom: 4
              }}
            />
          ))}
        </div>
      ) : docs.length === 0 ? (
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
                style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}
              >
                {doc.icon && <DocIcon icon={doc.icon} size={15} />}
                <span
                  className="font-heading"
                  style={{
                    fontSize: 14,
                    color: 'var(--text)',
                    fontWeight: 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {doc.title || 'Untitled'}
                </span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  data-delete
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Delete this document? It can be restored from Recently deleted.')) {
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

      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            key="doc-list-menu"
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            items={[
              {
                label: 'Delete',
                danger: true,
                icon: <Trash2 size={13} />,
                onClick: () => {
                  const docId = contextMenu.docId
                  window.mycel.deleteDoc(docId).then(() => {
                    if (activeFolderId) fetchDocs(activeFolderId)
                  })
                }
              }
            ]}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
