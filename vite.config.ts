import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // --- For the development server (vite dev) ---
  server: {
    host: true,
    allowedHosts: true,
  },
  // --- For the preview server (vite preview) ---
  preview: {
    host: true,
    allowedHosts: true,
  },
})