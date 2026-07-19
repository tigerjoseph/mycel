import { ChevronRight } from 'lucide-react'

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
        height: 28,
        overflow: 'hidden',
        fontSize: 12,
        color: 'var(--text-muted)'
      }}
    >
      {items.map((item, index) => {
        const isCurrent = !item.onClick

        return (
          <div
            key={`${item.label}-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              minWidth: 0,
              flexShrink: index === 0 ? 0 : 1
            }}
          >
            {index > 0 && (
              <ChevronRight
                size={13}
                aria-hidden
                style={{
                  flexShrink: 0,
                  margin: '0 5px',
                  opacity: 0.55
                }}
              />
            )}

            {item.onClick ? (
              <button
                type="button"
                onClick={item.onClick}
                title={item.label}
                style={{
                  display: 'block',
                  minWidth: 0,
                  maxWidth: index === 0 ? 72 : 'min(220px, 32vw)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  padding: '4px 2px',
                  border: 0,
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  font: 'inherit',
                  cursor: 'pointer',
                  transition: 'color 150ms ease'
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.color = 'var(--text)'
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.color = 'var(--text-muted)'
                }}
              >
                {item.label}
              </button>
            ) : (
              <span
                aria-current="page"
                title={item.label}
                style={{
                  display: 'block',
                  minWidth: 0,
                  maxWidth: 'min(220px, 32vw)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: isCurrent ? 'var(--text)' : 'var(--text-muted)'
                }}
              >
                {item.label}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
