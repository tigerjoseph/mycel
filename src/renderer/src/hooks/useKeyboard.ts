import { useEffect } from 'react'
import { useUIStore } from '../store/ui'

export function useKeyboard(): void {
  const setPage = useUIStore((s) => s.setPage)
  const popBreadcrumb = useUIStore((s) => s.popBreadcrumb)
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen)
  const closeAllOverlays = useUIStore((s) => s.closeAllOverlays)
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen)
  const contactSwitcherOpen = useUIStore((s) => s.contactSwitcherOpen)
  const logTouchpointOpen = useUIStore((s) => s.logTouchpointOpen)
  const settingsOpen = useUIStore((s) => s.settingsOpen)

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
      // Cmd+4 → Mindspace
      if (e.metaKey && e.key === '4') {
        e.preventDefault()
        setPage('library')
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
      // Escape → dismiss top overlay only when one is open (don't steal editor Esc)
      if (e.key === 'Escape') {
        const overlayOpen =
          commandPaletteOpen || contactSwitcherOpen || logTouchpointOpen || settingsOpen
        if (overlayOpen) {
          e.preventDefault()
          closeAllOverlays()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    setPage,
    popBreadcrumb,
    setCommandPaletteOpen,
    closeAllOverlays,
    commandPaletteOpen,
    contactSwitcherOpen,
    logTouchpointOpen,
    settingsOpen
  ])
}
