import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base MUST match the GitHub repo name for GH Pages
export default defineConfig({
  base: '/better-tailor-mvp/',
  plugins: [react(), tailwindcss()],
})
