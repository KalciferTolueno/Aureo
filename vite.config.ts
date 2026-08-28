import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [vue(), tailwindcss(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'fonts/*.ttf'],
    manifest: {
      name: 'Áureo — Mi espacio personal', short_name: 'Áureo',
      description: 'Un espacio privado para cultivar tu Edad Dorada.',
      theme_color: '#080b11', background_color: '#080b11', display: 'standalone', start_url: './#/', scope: './',
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: { cleanupOutdatedCaches: true, navigateFallback: 'index.html', globPatterns: ['**/*.{js,css,html,svg,png,ttf}'] },
    devOptions: { enabled: true },
  })],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: '127.0.0.1', port: 4174 },
})
