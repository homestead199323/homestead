import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // the ~300 rendered icons in src/assets/toy stay separate files (fetched only when shown,
    // cached by the service worker) instead of being inlined into the main bundle
    assetsInlineLimit: (file) => (/[\\/]assets[\\/]toy[\\/]/.test(file) ? false : undefined),
  },
})
