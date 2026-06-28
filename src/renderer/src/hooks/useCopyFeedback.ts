import { useCallback } from 'react'
import { useUIStore } from '../store/ui'

export function useCopyFeedback(): {
  showCopyFeedback: (message?: string) => void
  copyText: (text: string, message?: string) => Promise<void>
} {
  const showCopyFeedback = useUIStore((s) => s.showCopyFeedback)

  const copyText = useCallback(
    async (text: string, message = 'Copied') => {
      await navigator.clipboard.writeText(text)
      showCopyFeedback(message)
    },
    [showCopyFeedback]
  )

  return { showCopyFeedback, copyText }
}
