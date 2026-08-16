import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT;
if (!rawPort) throw new Error('PORT environment variable is required but was not provided.');
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

const basePath = process.env.BASE_PATH;
if (!basePath) throw new Error('BASE_PATH environment variable is required but was not provided.');

// ── Vendor chunk groupings ────────────────────────────────────────────────────
// Splitting by library lets browsers cache stable vendor bundles independently
// from frequently-changing app code.  Three.js alone is ~650 KB minified, so
// isolating it means users never re-download it on code-only deploys.
function manualChunks(id: string): string | undefined {
  // Three.js core + examples/jsm helpers (FBXLoader, TGALoader, SkeletonUtils…)
  if (id.includes('/three/')) return 'vendor-three';
  // React Three Fiber — rendering bridge (changes infrequently)
  if (id.includes('@react-three/fiber')) return 'vendor-r3f';
  // Drei — helper components (changes with the game more often, keep separate)
  if (id.includes('@react-three/drei')) return 'vendor-drei';
  // Rapier physics — WASM binary + JS bindings (large, cache-stable)
  if (id.includes('@react-three/rapier') || id.includes('@dimforge') || id.includes('rapier')) return 'vendor-rapier';
  // Post-processing (optional FX pipeline)
  if (id.includes('postprocessing') || id.includes('@react-three/postprocessing')) return 'vendor-fx';
  // Everything else in node_modules: React, Zustand, Radix, Tailwind runtime…
  if (id.includes('/node_modules/')) return 'vendor-misc';
  // App code (src/) lands in the default entry chunk(s)
}

export default defineConfig({
  base: basePath,

  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' && process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then(m =>
            m.cartographer({ root: path.resolve(import.meta.dirname, '..') }),
          ),
          await import('@replit/vite-plugin-dev-banner').then(m => m.devBanner()),
        ]
      : []),
  ],

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(import.meta.dirname, '..', '..', 'attached_assets'),
      // Single shared Three.js instance — prevents "Multiple instances" errors
      // and makes the manualChunks match reliable (one canonical path).
      'three': path.resolve(import.meta.dirname, 'node_modules/three'),
    },
    dedupe: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
  },

  optimizeDeps: {
    // Keep jsm helpers out of the pre-bundle so they resolve through the alias
    // above and share the same Three.js instance as the main bundle.
    exclude: [
      'three/examples/jsm/utils/SkeletonUtils.js',
      'three/examples/jsm/loaders/TGALoader.js',
      'three/examples/jsm/loaders/FBXLoader.js',
    ],
  },

  root: path.resolve(import.meta.dirname),

  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,

    // Target modern browsers — smaller output, no legacy polyfills.
    // Replit deployment runs on V8 >= 11; all major browsers support esnext.
    target: 'esnext',

    // Minify with esbuild (fastest, near-identical output to terser).
    minify: 'esbuild',
    cssMinify: true,

    // Suppress warnings for the large-but-expected vendor chunks (Three.js, Rapier WASM).
    chunkSizeWarningLimit: 5000,

    // Skip reporting compressed size during build — saves ~10-15s.
    // The post-build compress-dist.mjs script reports real brotli/gzip sizes.
    reportCompressedSize: false,

    rollupOptions: {
      output: {
        // Isolate vendor libraries into stable cached chunks.
        manualChunks,

        // Content-hash all output filenames → safe for aggressive long-term caching.
        assetFileNames: 'assets/[hash][extname]',
        chunkFileNames: 'js/[hash].js',
        entryFileNames: 'js/[hash].js',
      },
    },
  },

  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: { strict: true },
  },

  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
