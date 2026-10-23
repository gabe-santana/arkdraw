/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

// Tauri expects a fixed dev-server port and sets TAURI_ENV_* variables during builds.
const host = process.env.TAURI_DEV_HOST;
const platform = process.env.TAURI_ENV_PLATFORM;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Web build only: installable PWA with an offline app shell (docs/web.md).
    // Disabled for desktop builds (`tauri build` sets TAURI_ENV_PLATFORM); the
    // app also never registers the worker under Tauri (src/web/pwa.ts).
    VitePWA({
      disable: !!platform,
      registerType: 'prompt',
      injectRegister: false,
      manifest: false, // public/manifest.webmanifest
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,ico,webmanifest}'],
        // The vendor icon packs are large: cache them on first use instead.
        globIgnores: ['icons/**'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        navigateFallback: 'index.html',
        // Direct links to diagram files/assets must reach the network, not the app shell.
        navigateFallbackDenylist: [/\/icons\//, /\.(?:opendraw|drawio|xml|json|png|svg|pdf|txt|js|css|webmanifest)$/i],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.includes('/icons/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'opendraw-icons',
              expiration: { maxEntries: 6000, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Pre-bundle deps that are only reached through lazy imports, so the dev
  // server never has to re-optimize (and 504) mid-session.
  optimizeDeps: {
    include: [
      '@dagrejs/dagre',
      '@tauri-apps/api/core',
      '@tauri-apps/api/event',
      '@tauri-apps/api/window',
      '@tauri-apps/plugin-dialog',
      'gifenc',
      'jspdf',
      'svg2pdf.js',
      'mathjax-full/js/mathjax.js',
      'mathjax-full/js/input/tex.js',
      'mathjax-full/js/output/svg.js',
      'mathjax-full/js/adaptors/liteAdaptor.js',
      'mathjax-full/js/handlers/html.js',
      'mathjax-full/js/input/tex/AllPackages.js',
    ],
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  build: {
    // WebView2 (Windows) is Chromium; macOS/Linux use WebKit.
    target: platform === 'windows' ? 'chrome110' : 'safari16',
    minify: process.env.TAURI_ENV_DEBUG ? false : 'oxc',
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.ts'],
  },
});
