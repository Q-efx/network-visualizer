import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // --- For the development server (vite dev) ---
  server: {
    // This makes the server accessible externally.
    // 'true' is equivalent to '0.0.0.0'.
    host: true, 
    
    // This disables the host check. 
    // It's useful for testing on mobile devices or through tunnels.
    // The value should be an array of strings or a wildcard.
    allowedHosts: ['*'], 
  },
  // --- For the preview server (vite preview) ---
  preview: {
    // This makes the server accessible externally.
    host: true,

    // This disables the host check for the preview server.
    allowedHosts: ['*'],
  },
})