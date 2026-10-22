import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8088',
        ws: true,
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
    },
  },
})
