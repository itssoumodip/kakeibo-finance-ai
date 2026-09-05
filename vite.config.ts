import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // App shell precached → repeat opens are instant, works offline
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Google Fonts: cache-first, ~1yr
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            // API: network-first (money must be fresh), 8s timeout → short cache fallback
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
            },
          },
        ],
      },
      manifest: {
        name: 'Kakeibo — AI Financial Assistant',
        short_name: 'Kakeibo',
        description: 'Track spends, budgets, investments with your AI finance buddy.',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#5f5b77',
        background_color: '#fcf9f8',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Ask AI Assistant', url: '/assistant?source=pwa', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Transactions', url: '/transactions?source=pwa', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    // Fail loudly if 5173 is taken instead of silently moving to 5174 —
    // a silent shift leaves stale tabs talking to the wrong server (HMR token errors).
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    target: 'es2019',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'charts';
            if (id.includes('gsap')) return 'anim';
            if (id.includes('react-router')) return 'router';
            if (id.includes('react') || id.includes('react-dom')) return 'vendor';
            if (id.includes('lucide-react')) return 'icons';
          }
          return undefined;
        },
      },
    },
  },
  optimizeDeps: {
    // Pre-bundle recharts + its CJS chain (react-redux -> use-sync-external-store
    // shim). Serving them raw breaks the shim's `module.exports = require(...)`
    // re-export, so the browser sees no named `useSyncExternalStoreWithSelector`.
    include: ['react', 'react-dom', 'react-router-dom', 'recharts', 'react-redux', 'use-sync-external-store'],
  },
})