import { useEffect, useRef } from 'react'
import { useUIStore } from '../store/ui'

/** Flush pending saves when leaving Create tab or switching Create sub-view. */
export function useFlushOnLeave(
  flush: () => void | Promise<void>,
  options?: { watchCreateView?: boolean }
): void {
  const activePage = useUIStore((s) => s.activePage)
  const createView = useUIStore((s) => s.createView)
  const wasOnCreateRef = useRef(false)
  const prevCreateViewRef = useRef(createView)

  useEffect(() => {
    const onCreate = activePage === 'create'
    if (wasOnCreateRef.current && !onCreate) {
      void flush()
    }
    wasOnCreateRef.current = onCreate
  }, [activePage, flush])

  useEffect(() => {
    if (!options?.watchCreateView) return
    if (activePage !== 'create') return
    if (prevCreateViewRef.current === 'docs' && createView === 'notes') {
      void flush()
    }
    prevCreateViewRef.current = createView
  }, [activePage, createView, flush, options?.watchCreateView])

  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') void flush()
    }
    window.addEventListener('visibilitychange', onVisibility)
    return () => window.removeEventListener('visibilitychange', onVisibility)
  }, [flush])

  useEffect(() => () => { void flush() }, [flush])
}
