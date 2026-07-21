import { ArrowLeft, ChevronRight } from 'lucide-react'

export interface DocumentBreadcrumbItem {
  label: string
  onClick?: () => void
}

interface DocumentBreadcrumbsProps {
  items: DocumentBreadcrumbItem[]
  position?: 'overlay' | 'flow'
}

export function DocumentBreadcrumbs({
  items,
  position = 'overlay'
}: DocumentBreadcrumbsProps): React.JSX.Element {
  const backItem = [...items].reverse().find((item) => item.onClick)
  const currentItem = [...items].reverse().find((item) => !item.onClick)

  if (!backItem && position === 'overlay') return <></>

  return (
    <nav
      aria-label="Document location"
      className="font-ui"
      style={{
        ...(position === 'overlay'
          ? {
              position: 'absolute',
              top: 14,
              left: 32,
              right: 120,
              zIndex: 10
            }
          : {
              marginBottom: 24
            }),
        display: 'flex',
        alignItems: 'center',
        minWidth: 0,
        height: 30,
        overflow: 'hidden',
        fontSize: 12,
        color: 'var(--text-muted)'
      }}
    >
      {backItem?.onClick && (
        <button
          type="button"
          onClick={backItem.onClick}
          aria-label={`Back to ${backItem.label}`}
          title={`Back to ${backItem.label}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
            padding: '5px 7px 5px 4px',
            border: 0,
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--text-muted)',
            font: 'inherit',
            cursor: 'pointer',
            transition: 'color 150ms ease, background 150ms ease'
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.color = 'var(--text)'
            event.currentTarget.style.background = 'var(--surface)'
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.color = 'var(--text-muted)'
            event.currentTarget.style.background = 'transparent'
          }}
        >
          <ArrowLeft size={14} aria-hidden />
          <span>Back</span>
        </button>
      )}

      {position === 'flow' && currentItem && (
        <>
          {backItem && (
            <ChevronRight
              size={13}
              aria-hidden
              style={{ flexShrink: 0, margin: '0 5px', opacity: 0.55 }}
            />
          )}
          <span
            aria-current="page"
            title={currentItem.label}
            style={{
              minWidth: 0,
              maxWidth: 'min(220px, 32vw)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'var(--text)'
            }}
          >
            {currentItem.label}
          </span>
        </>
      )}
    </nav>
  )
}
