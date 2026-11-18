import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Precache the shell; cache route chunks when visited instead of downloading every role on first load.
        globPatterns: ['**/*.{html,css,ico,png,svg}', '**/index-*.js'],
        runtimeCaching: [{
          urlPattern: ({ request, url }) => request.destination === 'script' && url.origin === self.location.origin,
          handler: 'CacheFirst',
          options: { cacheName: 'workspace-scripts', expiration: { maxEntries: 100, maxAgeSeconds: 7 * 86400 } },
        }],
      },
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: 'Eldoret Muslim Academy Staff Portal',
        short_name: 'E-M-A App',
        description: 'Primary & Junior Secondary School Management System',
        start_url: '/login',
        display: 'standalone',
        theme_color: '#2563EB',
        background_color: '#0F172A',
        icons: [
          {
            src: '/logo.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  }
});
