import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const rawPort = process.env.PORT ?? '3000';
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

const basePath = process.env.BASE_PATH ?? '/';

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
  ],

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(import.meta.dirname, '..', '..', 'attached_assets'),
      // Single shared Three.js instance — prevents "Multiple instances" errors
      // and makes the manualChunks match reliable (one canonical path).
      'three': path.resolve(import.meta.dirname, 'node_modules/three'),
      // Drei re-exports its optional Stats helper from its package barrel. The
      // installed ESM stats.js build has no default export, so provide the
      // compatible no-op class used by the unused debug overlay.
      'stats.js': path.resolve(import.meta.dirname, 'src/game/compat/dreiStats.ts'),
    },
    dedupe: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
  },

  optimizeDeps: {
    // Do not discover every dependency through lazy battle chunks at menu
    // startup. Pre-bundling the complete Three/Rapier stack exhausts the dev
    // server before a battle begins; the browser can load those ESM modules
    // only when the battle runtime is requested.
    noDiscovery: true,
    include: [
      'react',
      'react-dom/client',
      '@react-three/fiber > scheduler',
      'zustand',
      'zustand/traditional',
      // Zustand's shallow selector hook is used by lazy battle modules. With
      // noDiscovery enabled, the traditional store's CJS selector shim must
      // be included through its parent entry point too.
      'zustand/react/shallow',
    ],

    // Keep jsm helpers out of the pre-bundle so they resolve through the alias
    // above and share the same Three.js instance as the main bundle.
    exclude: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/rapier',
      '@react-three/postprocessing',
      'postprocessing',
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
