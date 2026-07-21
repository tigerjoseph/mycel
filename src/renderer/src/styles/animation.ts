export const spring = { type: 'spring' as const, stiffness: 400, damping: 28 }
export const springGentle = { type: 'spring' as const, stiffness: 280, damping: 24 }
export const springSnappy = { type: 'spring' as const, stiffness: 500, damping: 32 }
export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { type: 'spring' as const, stiffness: 280, damping: 24 }
}

/** Subtle enter for page / sub-tab switches */
export const pageEnter = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -3 },
  transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const }
}

export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.14, ease: 'easeOut' as const }
}
