import { AnimatePresence, motion } from 'motion/react'
import { useUIStore } from '../store/ui'
import { pageEnter } from '../styles/animation'
import { Docs } from './Docs'
import { Notes } from './Notes'
import { ContentTracking } from './ContentTracking'

export function Create(): React.JSX.Element {
  const activeCreateView = useUIStore((s) => s.createView)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeCreateView}
            initial={pageEnter.initial}
            animate={pageEnter.animate}
            exit={pageEnter.exit}
            transition={pageEnter.transition}
            style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
          >
            {activeCreateView === 'docs' ? <Docs /> : activeCreateView === 'content' ? <ContentTracking /> : <Notes />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
