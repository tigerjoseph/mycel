import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, LayoutGrid, List, FolderClosed, FileText, Table, PenTool, Search, Trash2 } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useUIStore } from '../store/ui'
import { useDocsStore } from '../store/docs'
import { fadeUp, spring } from '../styles/animation'
import { formatDistanceToNow } from 'date-fns'
import type { Folder } from '@shared/types'

export function DocsHome(): React.JSX.Element {
  const setDocsView = useUIStore((s) => s.setDocsView)
  const setActiveDocId = useUIStore((s) => s.setActiveDocId)
  const setActiveFolderId = useUIStore((s) => s.setActiveFolderId)
  const pushBreadcrumb = useUIStore((s) => s.pushBreadcrumb)
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen)
  const folders = useDocsStore((s) => s.folders)
  const favorites = useDocsStore((s) => s.favorites)
  const fetchFolders = useDocsStore((s) => s.fetchFolders)
  const fetchFavorites = useDocsStore((s) => s.fetchFavorites)
  const recentDocs = useDocsStore((s) => s.recentDocs)
  const fetchRecentDocs = useDocsStore((s) => s.fetchRecentDocs)

  const [newDropdownOpen, setNewDropdownOpen] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [folderLayout, setFolderLayout] = useState<'grid' | 'list'>('grid')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; docId: string } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchFolders()
    fetchFavorites()
    fetchRecentDocs()
  }, [fetchFolders, fetchFavorites, fetchRecentDocs])

  useEffect(() => {
    if (creatingFolder && folderInputRef.current) {
      folderInputRef.current.focus()
    }
  }, [creatingFolder])

  // Close dropdown on Escape or outside click
  useEffect(() => {
    if (!newDropdownOpen) return
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setNewDropdownOpen(false)
    }
    const handleClick = (e: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNewDropdownOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [newDropdownOpen])

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

  const handleNewDoc = useCallback(async () => {
    setNewDropdownOpen(false)
    const doc = await window.mycel.upsertDoc({
      id: nanoid(),
      title: '',
      body: '',
      type: 'doc',
      folderId: null,
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
    pushBreadcrumb({ label: 'Docs', action: () => setDocsView('home') })
  }, [setActiveDocId, setDocsView, pushBreadcrumb])

  const handleNewGrid = useCallback(async () => {
    setNewDropdownOpen(false)
    const doc = await window.mycel.upsertDoc({
      id: nanoid(),
      title: '',
      body: JSON.stringify({ columns: ['Column 1', 'Column 2', 'Column 3'], rows: [['', '', '']] }),
      type: 'grid',
      folderId: null,
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
    setDocsView('grid')
    pushBreadcrumb({ label: 'Docs', action: () => setDocsView('home') })
  }, [setActiveDocId, setDocsView, pushBreadcrumb])

  const handleNewCanvas = useCallback(async () => {
    setNewDropdownOpen(false)
    const doc = await window.mycel.upsertDoc({
      id: nanoid(),
      title: '',
      body: '',
      type: 'canvas',
      folderId: null,
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
    setDocsView('canvas')
    pushBreadcrumb({ label: 'Docs', action: () => setDocsView('home') })
  }, [setActiveDocId, setDocsView, pushBreadcrumb])

  const handleFolderClick = useCallback(
    (folder: Folder) => {
      setActiveFolderId(folder.id)
      setDocsView('list')
      pushBreadcrumb({ label: 'Docs', action: () => setDocsView('home') })
    },
    [setActiveFolderId, setDocsView, pushBreadcrumb]
  )

  const handleFavoritesClick = useCallback(() => {
    setDocsView('favorites')
    pushBreadcrumb({ label: 'Docs', action: () => setDocsView('home') })
  }, [setDocsView, pushBreadcrumb])

  const handleCreateFolder = useCallback(async () => {
    const name = folderName.trim()
    if (!name) {
      setCreatingFolder(false)
      setFolderName('')
      return
    }
    await window.mycel.createFolder(name)
    setCreatingFolder(false)
    setFolderName('')
    fetchFolders()
  }, [folderName, fetchFolders])

  return (
    <motion.div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 40px', height: '100%', overflowY: 'auto' }} {...fadeUp}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <h1 className="font-heading" style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
          Docs
        </h1>
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setNewDropdownOpen(!newDropdownOpen)}
            style={{
              WebkitAppRegion: 'no-drag',
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px 14px',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'Inter, sans-serif',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'color 150ms ease, border-color 150ms ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text-muted)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <Plus size={14} />
            New
          </button>

          {/* Dropdown */}
          {newDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 6,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 8,
                minWidth: 240,
                zIndex: 20,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}
            >
              {/* Document option */}
              <button
                onClick={handleNewDoc}
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 8, transition: 'background 100ms ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <div className="font-ui" style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>Document</div>
                  <div className="font-ui" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Rich text with formatting</div>
                </div>
              </button>

              {/* Table option */}
              <button
                onClick={handleNewGrid}
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 8, transition: 'background 100ms ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Table size={18} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <div className="font-ui" style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>Table</div>
                  <div className="font-ui" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Rows, columns, and data</div>
                </div>
              </button>

              {/* Canvas option */}
              <button
                onClick={handleNewCanvas}
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 8, transition: 'background 100ms ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <PenTool size={18} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <div className="font-ui" style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>Canvas</div>
                  <div className="font-ui" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Infinite canvas whiteboard</div>
                </div>
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* 1. FAVORITES */}
      {favorites.length > 0 && (
        <>
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={handleFavoritesClick}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
              onMouseEnter={(e) => { e.currentTarget.querySelector('span')!.style.color = 'var(--text)' }}
              onMouseLeave={(e) => { e.currentTarget.querySelector('span')!.style.color = 'var(--text-muted)' }}
            >
              <span className="font-ui" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'color 150ms ease' }}>
                Favorites
              </span>
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, marginBottom: 28 }}>
            {favorites.map((doc) => (
              <motion.button
                key={doc.id}
                onClick={() => {
                  setActiveDocId(doc.id)
                  setDocsView(doc.type === 'grid' ? 'grid' : doc.type === 'canvas' ? 'canvas' : 'editor')
                  pushBreadcrumb({ label: 'Docs', action: () => setDocsView('home') })
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                style={{
                  minWidth: 160,
                  maxWidth: 200,
                  height: 80,
                  background: 'var(--surface)',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: '12px 16px',
                  textAlign: 'left',
                  flexShrink: 0
                }}
              >
                <div className="font-ui" style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {doc.icon && <span style={{ marginRight: 5 }}>{doc.icon}</span>}
                  {doc.title || 'Untitled'}
                </div>
                <div className="font-ui" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {doc.type === 'grid' ? 'Table' : doc.type === 'canvas' ? 'Canvas' : 'Document'}
                </div>
              </motion.button>
            ))}
          </div>
        </>
      )}

      {/* 2. RECENTS */}
      {recentDocs.length > 0 && (
        <>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="font-ui" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recent
            </span>
            <button
              onClick={() => setCommandPaletteOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                transition: 'color 150ms ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
              title="Search documents"
            >
              <Search size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 28 }}>
            {recentDocs.slice(0, 6).map((doc) => (
              <button
                key={doc.id}
                onClick={() => {
                  setActiveDocId(doc.id)
                  setDocsView(doc.type === 'grid' ? 'grid' : doc.type === 'canvas' ? 'canvas' : 'editor')
                  pushBreadcrumb({ label: 'Docs', action: () => setDocsView('home') })
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 4px',
                  width: '100%',
                  textAlign: 'left',
                  borderRadius: 6,
                  transition: 'background 100ms ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenu({ x: e.clientX, y: e.clientY, docId: doc.id })
                }}
              >
                <span style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {doc.icon ? (
                    <span style={{ fontSize: 16 }}>{doc.icon}</span>
                  ) : doc.type === 'grid' ? (
                    <Table size={15} style={{ color: 'var(--text-muted)' }} />
                  ) : doc.type === 'canvas' ? (
                    <PenTool size={15} style={{ color: 'var(--text-muted)' }} />
                  ) : (
                    <FileText size={15} style={{ color: 'var(--text-muted)' }} />
                  )}
                </span>
                <span className="font-ui" style={{ fontSize: 13, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.title || 'Untitled'}
                </span>
                <span className="font-ui" style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {formatDistanceToNow(doc.updatedAt, { addSuffix: true })}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* 3. FOLDERS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span className="font-ui" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Folders
        </span>
        <button
          onClick={() => setFolderLayout(folderLayout === 'grid' ? 'list' : 'grid')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            transition: 'color 150ms ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
          title={folderLayout === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
        >
          {folderLayout === 'grid' ? <List size={15} /> : <LayoutGrid size={15} />}
        </button>
      </div>

      {/* Folder grid / list */}
      {folderLayout === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => handleFolderClick(folder)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
                width: '100%',
                textAlign: 'left',
                transition: 'background 100ms ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
            >
              <FolderClosed size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span className="font-heading" style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
                {folder.name}
              </span>
            </button>
          ))}
          {creatingFolder ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
              <FolderClosed size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                ref={folderInputRef}
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder()
                  if (e.key === 'Escape') { setCreatingFolder(false); setFolderName('') }
                }}
                onBlur={handleCreateFolder}
                placeholder="Folder name..."
                className="font-heading"
                style={{ fontSize: 14, color: 'var(--text)', background: 'transparent', border: 'none', outline: 'none', flex: 1 }}
              />
            </div>
          ) : (
            <button
              onClick={() => setCreatingFolder(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 0',
                color: 'var(--text-muted)',
                fontSize: 13,
                fontFamily: 'Inter, sans-serif',
                transition: 'color 150ms ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <Plus size={14} />
              New folder
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {folders.map((folder) => (
            <motion.button
              key={folder.id}
              onClick={() => handleFolderClick(folder)}
              whileHover={{ filter: 'brightness(1.04)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              style={{
                height: 100,
                background: 'var(--surface)',
                borderRadius: 8,
                border: '1px solid var(--border)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '16px',
                textAlign: 'left'
              }}
            >
              <FolderClosed size={16} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <span
                className="font-heading"
                style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}
              >
                {folder.name}
              </span>
            </motion.button>
          ))}
          {creatingFolder ? (
            <div
              style={{
                height: 100,
                background: 'var(--surface)',
                borderRadius: 8,
                border: '2px dashed var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
              }}
            >
              <input
                ref={folderInputRef}
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder()
                  if (e.key === 'Escape') {
                    setCreatingFolder(false)
                    setFolderName('')
                  }
                }}
                onBlur={handleCreateFolder}
                placeholder="Folder name..."
                className="font-heading"
                style={{
                  fontSize: 14,
                  color: 'var(--text)',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  textAlign: 'center'
                }}
              />
            </div>
          ) : (
            <motion.button
              onClick={() => setCreatingFolder(true)}
              whileHover={{ filter: 'brightness(1.04)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              style={{
                height: 100,
                background: 'transparent',
                borderRadius: 8,
                border: '2px dashed var(--border)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}
            >
              <Plus size={16} style={{ color: 'var(--text-muted)' }} />
              <span className="font-ui" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Folder
              </span>
            </motion.button>
          )}
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
                  fetchRecentDocs()
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
