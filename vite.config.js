import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: three.js changes far less often than the app.
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three'
          if (/node_modules\/(@react-three|postprocessing|three-stdlib|troika|maath|camera-controls)/.test(id)) return 'r3f'
        },
      },
    },
  },
})
