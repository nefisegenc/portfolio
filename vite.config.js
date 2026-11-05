import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Serves the arcade's /api/scores during development, with the board kept in
// memory instead of the Redis database it uses on Vercel.
const devScores = () => {
  const board = {}
  const store = {
    update: async (entries) => {
      for (const [id, value] of entries) if (!(board[id] >= value)) board[id] = value
      return board
    },
  }
  return {
    name: 'dev-scores',
    configureServer(server) {
      server.middlewares.use('/api/scores', async (req, res) => {
        const { handle } = await server.ssrLoadModule('/api/scores.js')
        let body = ''
        for await (const chunk of req) body += chunk
        const request = new Request('http://localhost/api/scores', { method: req.method, body: body || undefined })
        const response = await handle(request, store)
        res.statusCode = response.status
        res.setHeader('Content-Type', 'application/json')
        res.end(await response.text())
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), devScores()],
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
