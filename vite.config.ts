import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    basicSsl(),
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'logos/favicon.svg',
        'logos/apple-touch-icon.svg',
        'fonts/ARCADECLASSIC.TTF',
        'fonts/dpcomic.ttf',
        'style.css',
      ],
      manifest: {
        name: 'QuickDuel',
        short_name: 'QuickDuel',
        description: 'A fast-paced wizard duel game',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'logos/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'logos/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'logos/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,mp3,ogg,ttf,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
  ],
})
