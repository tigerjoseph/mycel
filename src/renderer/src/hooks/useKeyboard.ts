import { useEffect } from 'react'
import { useUIStore } from '../store/ui'

export function useKeyboard(): void {
  const setPage = useUIStore((s) => s.setPage)
  const popBreadcrumb = useUIStore((s) => s.popBreadcrumb)
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen)
  const closeAllOverlays = useUIStore((s) => s.closeAllOverlays)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      // Cmd+1 → CRM
      if (e.metaKey && e.key === '1') {
        e.preventDefault()
        setPage('crm')
      }
      // Cmd+2 → Docs
      if (e.metaKey && e.key === '2') {
        e.preventDefault()
        setPage('docs')
      }
      // Cmd+3 → Notes
      if (e.metaKey && e.key === '3') {
        e.preventDefault()
        setPage('notes')
      }
      // Cmd+[ → Navigate back
      if (e.metaKey && e.key === '[') {
        e.preventDefault()
        popBreadcrumb()
      }
      // Cmd+K → Command palette
      if (e.metaKey && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
      // Escape → Close overlays
      if (e.key === 'Escape') {
        closeAllOverlays()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setPage, popBreadcrumb, setCommandPaletteOpen, closeAllOverlays])
}
