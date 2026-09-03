import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'betini-simbolo.svg'],
      manifest: {
        name: 'VSM Builder',
        short_name: 'VSM Builder',
        description: 'Editor visual de Value Stream Mapping — um produto Betini Studio.',
        lang: 'pt-BR',
        start_url: '/app',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#201e1d',
        background_color: '#f3f2f2',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        // /api/ (funções serverless) e /__/ (proxy do handler OAuth do Firebase,
        // ver vercel.json) precisam bater na rede de verdade — o SW não pode
        // servir o index.html em cache no lugar dessas rotas.
        navigateFallbackDenylist: [/^\/api\//, /^\/__\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://fonts.googleapis.com' ||
              url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
