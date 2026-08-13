import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/zapsavr/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'ZapSavr',
        short_name: 'ZapSavr',
        description: 'A savings-first Lightning wallet for kids, built for the Bitcoin Amantikir community.',
        start_url: '/zapsavr/',
        scope: '/zapsavr/',
        display: 'standalone',
        background_color: '#0c1216',
        theme_color: '#0c1216',
        icons: [
          {
            src: 'icons/icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // App shell (HTML/CSS/JS) precached so a flaky or dropped connection
        // still loads the app — see CLAUDE.md's "flaky rural internet"
        // non-negotiable. Live data (balances, invoices) always needs the
        // network regardless; this only covers the shell around it.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        navigateFallback: '/zapsavr/index.html',
      },
    }),
  ],
})
