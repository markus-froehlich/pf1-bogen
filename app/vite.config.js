import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'

let commitHash = 'dev'
try { commitHash = execSync('git rev-parse --short HEAD').toString().trim() } catch {}

export default defineConfig({
  define: { __COMMIT__: JSON.stringify(commitHash) },
  base: process.env.GITHUB_ACTIONS ? '/pf1-bogen/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Pathfinder Charakterbogen',
        short_name: 'PF1 Bogen',
        description: 'Pathfinder 1. Edition Charakterbogen — deutsch/englisch',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: /\.json$/,
            handler: 'CacheFirst',
            options: { cacheName: 'pf-data', expiration: { maxEntries: 50 } },
          },
        ],
      },
    }),
  ],
})
