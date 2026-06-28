import { useEffect } from 'react'
import { useUIStore } from '../store/ui'

export function useKeyboard(): void {
  const setPage = useUIStore((s) => s.setPage)
  const popBreadcrumb = useUIStore((s) => s.popBreadcrumb)
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen)
  const closeAllOverlays = useUIStore((s) => s.closeAllOverlays)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      // Cmd+1 → To-Do
      if (e.metaKey && e.key === '1') {
        e.preventDefault()
        setPage('todo')
      }
      // Cmd+2 → People
      if (e.metaKey && e.key === '2') {
        e.preventDefault()
        setPage('people')
      }
      // Cmd+3 → Create
      if (e.metaKey && e.key === '3') {
        e.preventDefault()
        setPage('create')
      }
      // Cmd+4 → Corpus
      if (e.metaKey && e.key === '4') {
        e.preventDefault()
        setPage('corpus')
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
