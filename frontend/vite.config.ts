import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the site from /video-tube/, so the Pages build sets BASE_PATH
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  server: {
    // Forward API calls to the Express backend so cookies are same-origin
    // and the backend's CORS settings don't get in the way during development.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
    // Accept requests arriving through a Cloudflare quick tunnel
    allowedHosts: ['.trycloudflare.com'],
  },
  preview: {
    allowedHosts: ['.trycloudflare.com'],
  },
})
