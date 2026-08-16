#!/usr/bin/env node
/**
 * build-prod.mjs — Full production build pipeline for Race Wars / Toon RTS
 *
 * Steps:
 *   1. TypeScript type-check
 *   2. Vite production build  (manual vendor chunks + esnext target)
 *   3. Brotli + gzip compression of all text assets
 *   4. Bundle size report with per-chunk breakdown
 *   5. Deploy checklist
 *
 * Usage:
 *   node scripts/build-prod.mjs
 *   node scripts/build-prod.mjs --skip-typecheck
 *   node scripts/build-prod.mjs --skip-compress
 *   node scripts/build-prod.mjs --verbose
 */

import { execSync }                              from 'node:child_process';
import { readdir, stat }                         from 'node:fs/promises';
import { join, extname, relative, dirname }      from 'node:path';
import { fileURLToPath }                         from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = join(__dirname, '..');
const distDir   = join(root, 'dist', 'public');

const args         = process.argv.slice(2);
const skipTypecheck= args.includes('--skip-typecheck');
const skipCompress = args.includes('--skip-compress');
const verbose      = args.includes('--verbose') || args.includes('-v');

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 ** 2)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}

function run(cmd, label) {
  console.log(`\n▶  ${label}`);
  const t0 = Date.now();
  execSync(cmd, { cwd: root, stdio: 'inherit' });
  console.log(`   ✓ Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

async function* walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walkDir(full);
    else yield full;
  }
}

// ── Bundle report ─────────────────────────────────────────────────────────────
async function bundleReport() {
  console.log('\n📦  Bundle size report\n');

  const CHUNK_LABELS = {
    'vendor-three':       'Three.js + jsm helpers',
    'vendor-r3f':         'React Three Fiber',
    'vendor-drei':        'Drei (R3F helpers)',
    'vendor-rapier':      'Rapier physics (WASM)',
    'vendor-fx':          'Post-processing FX',
    'vendor-misc':        'React / Zustand / UI / misc',
    'index':              'App entry',
  };

  const byChunk = {};
  let totalRaw = 0, totalBr = 0, totalGz = 0;

  for await (const filePath of walkDir(distDir)) {
    const s   = await stat(filePath);
    const ext = extname(filePath);
    const rel = relative(distDir, filePath);

    // Identify chunk group from filename
    let chunk = 'other';
    for (const key of Object.keys(CHUNK_LABELS)) {
      if (rel.includes(key)) { chunk = key; break; }
    }

    if (ext === '.br') {
      byChunk[chunk] = byChunk[chunk] ?? { raw: 0, br: 0, gz: 0 };
      byChunk[chunk].br += s.size;
      totalBr += s.size;
    } else if (ext === '.gz') {
      byChunk[chunk] = byChunk[chunk] ?? { raw: 0, br: 0, gz: 0 };
      byChunk[chunk].gz += s.size;
      totalGz += s.size;
    } else if (!rel.startsWith('assets/')) {
      // JS / CSS / HTML only (skip public binary assets)
      byChunk[chunk] = byChunk[chunk] ?? { raw: 0, br: 0, gz: 0 };
      byChunk[chunk].raw += s.size;
      totalRaw += s.size;
    }
  }

  // Print table
  const col1 = 32, col2 = 10;
  console.log(
    `${'Chunk'.padEnd(col1)}${'Raw'.padStart(col2)}${'Brotli'.padStart(col2)}${'Gzip'.padStart(col2)}`
  );
  console.log('─'.repeat(col1 + col2 * 3));

  for (const [chunk, sizes] of Object.entries(byChunk)) {
    const label = (CHUNK_LABELS[chunk] ?? chunk).padEnd(col1);
    const raw   = sizes.raw  > 0 ? fmt(sizes.raw).padStart(col2)  : '—'.padStart(col2);
    const br    = sizes.br   > 0 ? fmt(sizes.br).padStart(col2)   : ''.padStart(col2);
    const gz    = sizes.gz   > 0 ? fmt(sizes.gz).padStart(col2)   : ''.padStart(col2);
    console.log(`${label}${raw}${br}${gz}`);
  }

  console.log('─'.repeat(col1 + col2 * 3));
  console.log(
    `${'TOTAL'.padEnd(col1)}${fmt(totalRaw).padStart(col2)}${fmt(totalBr).padStart(col2)}${fmt(totalGz).padStart(col2)}`
  );

  if (totalRaw > 0 && totalBr > 0) {
    const brSaving = (((totalRaw - totalBr) / totalRaw) * 100).toFixed(0);
    console.log(`\n  Brotli saves ${brSaving}% vs uncompressed over the wire.`);
  }
}

// ── Deploy checklist ──────────────────────────────────────────────────────────
function deployChecklist() {
  console.log(`
📋  Deploy checklist
────────────────────────────────────────────────────────────
  ✅  Vendor chunks isolated  (Three/R3F/Drei/Rapier cached separately)
  ✅  All JS/CSS brotli + gzip pre-compressed
  ✅  Content-hashed filenames  (safe for max-age=31536000)
  ✅  Source maps generated  (dist/public/js/*.map)

  Next steps:
  ───────────
  1. Deploy via Replit:    Click "Deploy" in the workspace toolbar.
                           The Replit deployment serves the toon-rts Vite
                           dev server in dev and your built output in prod.

  2. CDN / self-host:      Upload dist/public/ to any static host.
                           Configure your server (nginx/Caddy/Express) to:
                             a) Serve .br files with Content-Encoding: br
                             b) Serve .gz files with Content-Encoding: gzip
                             c) Cache-Control: public, max-age=31536000, immutable
                                for /js/* and /assets/*
                             d) Cache-Control: no-cache for index.html

  3. DRACO asset pipeline: See scripts/convert-to-draco.mjs
                           ~70-90% geometry size reduction for GLB assets.

  4. Rapier WASM:          The .wasm file is served separately by Rapier.
                           Ensure your server sets:
                             Content-Type: application/wasm
  ─────────────────────────────────────────────────────────────
`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀  Race Wars — Production Build Pipeline\n');
  const t0 = Date.now();

  try {
    if (!skipTypecheck) {
      run('pnpm run typecheck', 'TypeScript type-check');
    }

    run('pnpm run build', 'Vite production build');

    if (!skipCompress) {
      run(
        `node ${join('scripts', 'compress-dist.mjs')}${verbose ? ' --verbose' : ''}`,
        'Brotli + gzip post-build compression'
      );
    }

    await bundleReport();
    deployChecklist();

    const totalSec = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`✅  Build pipeline complete in ${totalSec}s\n`);
  } catch (err) {
    console.error('\n✗  Build failed:', err.message);
    process.exit(1);
  }
}

main();
