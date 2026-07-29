import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base so the built assets resolve correctly whether served from
  // a domain root or a GitHub Pages project path (e.g. /test-consume-data-protos/).
  base: './',
})
