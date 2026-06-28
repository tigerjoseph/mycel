import './assets/globals.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyAppearanceToDocument, DEFAULT_APPEARANCE } from '@shared/appearance'
import App from './App'

// Bootstrap appearance before first paint (refined async in App from store)
if (!document.documentElement.dataset.palette) {
  applyAppearanceToDocument(DEFAULT_APPEARANCE)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
