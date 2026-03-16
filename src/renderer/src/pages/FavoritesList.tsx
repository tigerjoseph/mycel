import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useUIStore } from '../store/ui'
import { useDocsStore } from '../store/docs'
import { fadeUp } from '../styles/animation'
import { format } from 'date-fns'

export function FavoritesList(): React.JSX.Element {
  const setDocsView = useUIStore((s) => s.setDocsView)
  const setActiveDocId = useUIStore((s) => s.setActiveDocId)
  const pushBreadcrumb = useUIStore((s) => s.pushBreadcrumb)
  const favorites = useDocsStore((s) => s.favorites)
  const fetchFavorites = useDocsStore((s) => s.fetchFavorites)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchFavorites().then(() => setLoaded(true))
  }, [fetchFavorites])

  const sorted = [...favorites].sort((a, b) => {
    const ao = a.favoriteOrder ?? Infinity
    const bo = b.favoriteOrder ?? Infinity
    return ao - bo
  })

  const handleDocClick = (docId: string, _title: string): void => {
    setActiveDocId(docId)
    setDocsView('editor')
    pushBreadcrumb({
      label: 'Favorites',
      action: () => setDocsView('favorites')
    })
  }

  return (
    <motion.div style={{ padding: '32px 40px', height: '100%' }} {...fadeUp}>
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
        <span style={{ color: 'var(--text)' }}>Favorites</span>
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        loaded && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '50%'
            }}
          >
            <span className="font-heading" style={{ fontSize: 16, color: 'var(--text-muted)' }}>
              No favorites yet
            </span>
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {sorted.map((doc) => (
            <motion.button
              key={doc.id}
              onClick={() => handleDocClick(doc.id, doc.title)}
              whileHover={{ backgroundColor: 'var(--surface)' }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%'
              }}
            >
              <span
                className="font-heading"
                style={{ fontSize: 14, color: 'var(--text)', fontWeight: 400 }}
              >
                {doc.title || 'Untitled'}
              </span>
              <span className="font-ui" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  )
}
