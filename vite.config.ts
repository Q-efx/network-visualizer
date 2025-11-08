import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,          // bind to 0.0.0.0 for dev
    allowedHosts: true,  // accept any Host header in dev
  },
  preview: {
    host: true,          // bind to 0.0.0.0 for vite preview
    allowedHosts: true,  // accept any Host header in preview
  },
})
