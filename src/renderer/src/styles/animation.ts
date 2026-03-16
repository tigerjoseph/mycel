export const spring = { type: 'spring' as const, stiffness: 400, damping: 28 }
export const springGentle = { type: 'spring' as const, stiffness: 280, damping: 24 }
export const springSnappy = { type: 'spring' as const, stiffness: 500, damping: 32 }
export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { type: 'spring' as const, stiffness: 280, damping: 24 }
}
