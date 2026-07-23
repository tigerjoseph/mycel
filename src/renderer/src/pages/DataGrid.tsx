import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'motion/react'
import { Plus, Trash2 } from 'lucide-react'
import { useUIStore } from '../store/ui'
import { useDocsStore } from '../store/docs'
import { DocumentBreadcrumbs } from '../components/DocumentBreadcrumbs'
import { findCachedDoc } from '../utils/docCache'
import { useFlushOnLeave } from '../hooks/useFlushOnLeave'
import type { Doc } from '@shared/types'

interface GridData {
  columns: string[]
  rows: string[][]
}

function parseGridData(body: string): GridData | null {
  try {
    const parsed = JSON.parse(body)
    if (Array.isArray(parsed.columns) && Array.isArray(parsed.rows)) {
      return parsed as GridData
    }
  } catch {
    // ignore
  }
  return null
}

function serializeGridData(data: GridData): string {
  return JSON.stringify(data)
}

export function DataGrid(): React.JSX.Element {
  const activeDocId = useUIStore((s) => s.activeDocId)
  const setDocsView = useUIStore((s) => s.setDocsView)
  const setActiveFolderId = useUIStore((s) => s.setActiveFolderId)
  const folders = useDocsStore((s) => s.folders)
  const activeFolderId = useUIStore((s) => s.activeFolderId)
  const [doc, setDoc] = useState<Doc | null>(() =>
    activeDocId ? findCachedDoc(activeDocId) ?? null : null
  )
  const [title, setTitle] = useState('')
  const [grid, setGrid] = useState<GridData>({ columns: [], rows: [] })
  const [loadError, setLoadError] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [savedIndicator, setSavedIndicator] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    type: 'row' | 'column'
    index: number
  } | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const indicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)
  const docRef = useRef<Doc | null>(doc)
  docRef.current = doc
  const titleRef = useRef(title)
  titleRef.current = title
  const gridRef = useRef(grid)
  gridRef.current = grid
  const pendingUpdatesRef = useRef<Partial<Doc>>({})
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())

  const folder = folders.find((f) => f.id === (doc?.folderId ?? activeFolderId))

  // Load doc on mount
  useEffect(() => {
    isMountedRef.current = true
    if (!activeDocId) {
      setDoc(null)
      return
    }
    let cancelled = false
    const requestedId = activeDocId

    const cached = findCachedDoc(activeDocId)
    if (cached) {
      const parsed = parseGridData(cached.body)
      setDoc(cached)
      setTitle(cached.title)
      setLoadError(!parsed)
      if (parsed) setGrid(parsed)
    }

    void window.mycel.getDoc(activeDocId).then((d) => {
      if (cancelled || !isMountedRef.current || d?.id !== requestedId) return
      if (d) {
        const parsed = parseGridData(d.body)
        setDoc(d)
        setTitle(d.title)
        setLoadError(!parsed)
        if (parsed) setGrid(parsed)
      }
    })
    return () => {
      cancelled = true
    }
  }, [activeDocId])

  useEffect(() => () => {
    isMountedRef.current = false
  }, [])

  // Close context menu on click elsewhere or Escape
  useEffect(() => {
    if (!contextMenu) return
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setContextMenu(null)
    }
    const handleClick = (): void => setContextMenu(null)
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [contextMenu])

  const showSaved = useCallback(() => {
    setSavedIndicator(true)
    if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current)
    indicatorTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) setSavedIndicator(false)
    }, 1500)
  }, [])

  const saveDoc = useCallback(
    (updates: Partial<Doc>): Promise<void> => {
      saveQueueRef.current = saveQueueRef.current.catch(() => {}).then(async () => {
        const current = docRef.current
        if (!current || loadError) return
        const updated = {
          ...current,
          title: titleRef.current,
          body: serializeGridData(gridRef.current),
          ...updates
        }
        const changed =
          updated.title !== current.title ||
          updated.body !== current.body ||
          Object.entries(updates).some(
            ([key, value]) => current[key as keyof Doc] !== value
          )
        if (!changed) return
        try {
          const saved = await window.mycel.upsertDoc({
            ...updated,
            expectedUpdatedAt: current.updatedAt
          })
          docRef.current = saved
          setSaveError(false)
          if (isMountedRef.current) {
            setDoc(saved)
            showSaved()
          }
        } catch (error) {
          setSaveError(true)
          throw error
        }
      })
      return saveQueueRef.current
    },
    [loadError, showSaved]
  )

  const debouncedSave = useCallback(
    (updates: Partial<Doc>) => {
      pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates }
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null
        const pending = pendingUpdatesRef.current
        pendingUpdatesRef.current = {}
        void saveDoc(pending)
      }, 800)
    },
    [saveDoc]
  )

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    if (!doc || loadError) return
    const pending = pendingUpdatesRef.current
    pendingUpdatesRef.current = {}
    await saveDoc(pending)
  }, [doc, loadError, saveDoc])

  useFlushOnLeave(flushSave, { watchCreateView: true })

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value
      titleRef.current = newTitle
      setTitle(newTitle)
      debouncedSave({ title: newTitle })
    },
    [debouncedSave]
  )

  const handleTitleBlur = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (doc && title !== doc.title) {
      saveDoc({ title })
    }
  }, [doc, title, saveDoc])

  const updateGrid = useCallback(
    (newGrid: GridData) => {
      gridRef.current = newGrid
      setGrid(newGrid)
      debouncedSave({ body: serializeGridData(newGrid) })
    },
    [debouncedSave]
  )

  const handleCellEdit = useCallback(
    (rowIdx: number, colIdx: number, value: string) => {
      const newRows = grid.rows.map((row, ri) =>
        ri === rowIdx ? row.map((cell, ci) => (ci === colIdx ? value : cell)) : [...row]
      )
      updateGrid({ ...grid, rows: newRows })
    },
    [grid, updateGrid]
  )

  const handleColumnEdit = useCallback(
    (colIdx: number, value: string) => {
      const newColumns = grid.columns.map((col, i) => (i === colIdx ? value : col))
      updateGrid({ ...grid, columns: newColumns })
    },
    [grid, updateGrid]
  )

  const addColumn = useCallback(() => {
    const newColumns = [...grid.columns, `Column ${grid.columns.length + 1}`]
    const newRows = grid.rows.map((row) => [...row, ''])
    updateGrid({ columns: newColumns, rows: newRows })
  }, [grid, updateGrid])

  const addRow = useCallback(() => {
    const newRow = new Array(grid.columns.length).fill('')
    updateGrid({ ...grid, rows: [...grid.rows, newRow] })
  }, [grid, updateGrid])

  const deleteRow = useCallback(
    (rowIdx: number) => {
      if (grid.rows.length <= 1) return
      const newRows = grid.rows.filter((_, i) => i !== rowIdx)
      updateGrid({ ...grid, rows: newRows })
      setContextMenu(null)
    },
    [grid, updateGrid]
  )

  const deleteColumn = useCallback(
    (colIdx: number) => {
      if (grid.columns.length <= 1) return
      const newColumns = grid.columns.filter((_, i) => i !== colIdx)
      const newRows = grid.rows.map((row) => row.filter((_, i) => i !== colIdx))
      updateGrid({ columns: newColumns, rows: newRows })
      setContextMenu(null)
    },
    [grid, updateGrid]
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, type: 'row' | 'column', index: number) => {
      e.preventDefault()
      setContextMenu({ x: e.clientX, y: e.clientY, type, index })
    },
    []
  )

  // Tab / Enter navigation in cells
  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        const nextCol = colIdx + 1
        if (nextCol < grid.columns.length) {
          // Focus next cell in same row
          const el = document.querySelector(
            `[data-cell="${rowIdx}-${nextCol}"]`
          ) as HTMLElement | null
          el?.focus()
        } else if (rowIdx + 1 < grid.rows.length) {
          // Focus first cell of next row
          const el = document.querySelector(
            `[data-cell="${rowIdx + 1}-0"]`
          ) as HTMLElement | null
          el?.focus()
        }
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const nextRow = rowIdx + 1
        if (nextRow < grid.rows.length) {
          const el = document.querySelector(
            `[data-cell="${nextRow}-${colIdx}"]`
          ) as HTMLElement | null
          el?.focus()
        }
      }
    },
    [grid]
  )

  const cellStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid var(--border)',
    fontFamily: 'var(--font-ui)',
    fontSize: 13,
    color: 'var(--text)',
    background: 'transparent',
    outline: 'none',
    minWidth: 120,
    lineHeight: 1.4
  }

  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: 600,
    background: 'var(--surface)',
    fontSize: 12,
    color: 'var(--text-muted)'
  }

  return (
    <div
      style={{
        height: '100%',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      <DocumentBreadcrumbs
        items={[
          { label: 'Docs', onClick: () => setDocsView('home') },
          ...(folder
            ? [{
                label: folder.name,
                onClick: () => {
                  setActiveFolderId(folder.id)
                  setDocsView('list')
                }
              }]
            : [])
        ]}
      />

      {/* Saved indicator */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: savedIndicator || saveError ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="font-ui"
        style={{
          position: 'absolute',
          top: 16,
          right: 24,
          fontSize: 11,
          color: saveError ? 'var(--lost)' : 'var(--text-muted)',
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        {saveError ? 'Save failed — changes remain open' : 'Saved'}
      </motion.span>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          maxWidth: 800,
          margin: '0 auto',
          width: '100%',
          padding: '56px 40px 60px'
        }}
      >
        {/* Title input */}
        <input
          value={title}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          placeholder="Untitled Grid"
          spellCheck
          className="font-heading"
          style={{
            display: 'block',
            width: '100%',
            fontSize: 48,
            fontWeight: 600,
            color: 'var(--text)',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            marginBottom: 32,
            lineHeight: 1.2
          }}
        />

        {loadError ? (
          <div
            className="font-ui"
            style={{
              padding: 20,
              border: '1px solid var(--lost-border)',
              borderRadius: 10,
              color: 'var(--lost)',
              background: 'var(--lost-bg)',
              fontSize: 13,
              lineHeight: 1.5
            }}
          >
            This table’s saved data is malformed. Editing is disabled so the original data is not
            overwritten.
          </div>
        ) : (
        /* Table */
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              borderCollapse: 'collapse',
              width: 'auto'
            }}
          >
            <thead>
              <tr>
                {grid.columns.map((col, colIdx) => (
                  <th
                    key={colIdx}
                    onContextMenu={(e) => handleContextMenu(e, 'column', colIdx)}
                    style={{ padding: 0 }}
                  >
                    <input
                      value={col}
                      spellCheck
                      onChange={(e) => handleColumnEdit(colIdx, e.target.value)}
                      style={headerCellStyle}
                    />
                  </th>
                ))}
                <th style={{ padding: 0 }}>
                  <button
                    onClick={addColumn}
                    style={{
                      ...headerCellStyle,
                      cursor: 'pointer',
                      width: 40,
                      textAlign: 'center',
                      border: '1px solid var(--border)',
                      minWidth: 40
                    }}
                    title="Add column"
                  >
                    <Plus size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {grid.rows.map((row, rowIdx) => (
                <tr key={rowIdx} onContextMenu={(e) => handleContextMenu(e, 'row', rowIdx)}>
                  {row.map((cell, colIdx) => (
                    <td key={colIdx} style={{ padding: 0 }}>
                      <input
                        data-cell={`${rowIdx}-${colIdx}`}
                        value={cell}
                        spellCheck
                        onChange={(e) => handleCellEdit(rowIdx, colIdx, e.target.value)}
                        onKeyDown={(e) => handleCellKeyDown(e, rowIdx, colIdx)}
                        style={cellStyle}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add row button */}
          <button
            onClick={addRow}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '8px 12px',
              marginTop: -1,
              background: 'transparent',
              border: '1px dashed var(--border)',
              borderRadius: '0 0 4px 4px',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              fontSize: 12,
              color: 'var(--text-muted)',
              width: '100%'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <Plus size={14} />
            New row
          </button>
        </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '4px 0',
            zIndex: 100,
            boxShadow: 'var(--shadow-md)',
            minWidth: 140
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() =>
              contextMenu.type === 'row'
                ? deleteRow(contextMenu.index)
                : deleteColumn(contextMenu.index)
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '6px 12px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: '#c0392b',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--border)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none'
            }}
          >
            <Trash2 size={14} />
            Delete {contextMenu.type}
          </button>
        </div>
      )}
    </div>
  )
}
