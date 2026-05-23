import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Prevent ELECTRON_RUN_AS_NODE from leaking into the spawned Electron process.
// When set, Electron runs as plain Node.js and the built-in 'electron' module is
// never registered, causing "Cannot read properties of undefined (reading 'whenReady')".
delete process.env.ELECTRON_RUN_AS_NODE

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
