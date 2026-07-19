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
  const flushRef = useRef(flush)
  flushRef.current = flush

  useEffect(() => {
    const onCreate = activePage === 'create'
    if (wasOnCreateRef.current && !onCreate) {
      void flushRef.current()
    }
    wasOnCreateRef.current = onCreate
  }, [activePage])

  useEffect(() => {
    if (!options?.watchCreateView) return
    if (activePage !== 'create') return
    if (prevCreateViewRef.current === 'docs' && createView === 'notes') {
      void flushRef.current()
    }
    prevCreateViewRef.current = createView
  }, [activePage, createView, options?.watchCreateView])

  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') void flushRef.current()
    }
    window.addEventListener('visibilitychange', onVisibility)
    return () => window.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => () => { void flushRef.current() }, [])
}
