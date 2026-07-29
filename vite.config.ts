import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base so the built assets resolve correctly regardless of where
  // the static site is served from (e.g. an Azure Storage $web container).
  base: './',
})
