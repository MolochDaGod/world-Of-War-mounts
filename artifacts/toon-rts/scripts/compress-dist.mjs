#!/usr/bin/env node
/**
 * compress-dist.mjs — Post-build brotli + gzip compression
 *
 * Walks dist/public/ and creates .br and .gz siblings for every text asset.
 * The API server (compressed-static middleware) serves the pre-compressed
 * variant when the client advertises support, falling back to the raw file.
 *
 * Compression levels:
 *   brotli  quality 11  (max; ~15% smaller than gzip at equal quality)
 *   gzip    level   9   (max)
 *
 * Skips: binary files that don't benefit (images, WASM, audio/video, fonts
 * that are already compressed).
 *
 * Usage:
 *   node scripts/compress-dist.mjs
 *   node scripts/compress-dist.mjs --dir dist/public --verbose
 */

import { createReadStream, createWriteStream, statSync } from 'node:fs';
import { readdir, stat, mkdir } from 'node:fs/promises';
import { createBrotliCompress, createGzip, constants as zlibConstants } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { join, extname, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const distDir = args[args.indexOf('--dir') + 1]
  ?? join(__dirname, '..', 'dist', 'public');
const verbose = args.includes('--verbose') || args.includes('-v');

// ── Compressible extensions ───────────────────────────────────────────────────
const COMPRESSIBLE = new Set([
  '.js', '.mjs', '.cjs',
  '.css',
  '.html', '.htm',
  '.json', '.jsonld',
  '.svg',
  '.xml',
  '.txt', '.md',
  '.map',                 // source maps (large, compress well)
  '.glsl', '.frag', '.vert',
]);

// Minimum size to bother compressing (bytes)
const MIN_BYTES = 1024;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(bytes) {
  if (bytes < 1024)          return `${bytes} B`;
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function pctSaved(original, compressed) {
  return (((original - compressed) / original) * 100).toFixed(1);
}

async function* walkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

async function compress(inputPath, stats) {
  const ext = extname(inputPath).toLowerCase();
  if (!COMPRESSIBLE.has(ext))                 return null;
  if (stats.size < MIN_BYTES)                 return null;
  // Skip already-compressed siblings
  if (ext === '.br' || ext === '.gz')         return null;

  const results = [];

  // ── Brotli ──
  const brPath = inputPath + '.br';
  await pipeline(
    createReadStream(inputPath),
    createBrotliCompress({
      params: {
        [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
        [zlibConstants.BROTLI_PARAM_SIZE_HINT]: stats.size,
      },
    }),
    createWriteStream(brPath),
  );
  const brSize = statSync(brPath).size;
  results.push({ type: 'br', path: brPath, size: brSize });

  // ── Gzip ──
  const gzPath = inputPath + '.gz';
  await pipeline(
    createReadStream(inputPath),
    createGzip({ level: 9 }),
    createWriteStream(gzPath),
  );
  const gzSize = statSync(gzPath).size;
  results.push({ type: 'gz', path: gzPath, size: gzSize });

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n🗜  Compressing assets in ${relative(process.cwd(), distDir)}\n`);

  let totalOriginal = 0;
  let totalBr       = 0;
  let totalGz       = 0;
  let fileCount     = 0;
  let skippedCount  = 0;
  const errors      = [];

  for await (const filePath of walkDir(distDir)) {
    const stats = await stat(filePath).catch(() => null);
    if (!stats) continue;

    try {
      const result = await compress(filePath, stats);
      if (!result) { skippedCount++; continue; }

      fileCount++;
      totalOriginal += stats.size;
      for (const r of result) {
        if (r.type === 'br') totalBr += r.size;
        if (r.type === 'gz') totalGz += r.size;
      }

      if (verbose) {
        const [br, gz] = result;
        const rel = relative(distDir, filePath).padEnd(60);
        console.log(
          `  ${rel}  ${fmt(stats.size).padStart(9)}` +
          `  →  br ${fmt(br.size).padStart(8)} (-${pctSaved(stats.size, br.size)}%)` +
          `  gz ${fmt(gz.size).padStart(8)} (-${pctSaved(stats.size, gz.size)}%)`
        );
      }
    } catch (err) {
      errors.push({ file: filePath, err });
      console.error(`  ✗ ${relative(distDir, filePath)}: ${err.message}`);
    }
  }

  // ── Summary ──
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  Files compressed : ${fileCount}`);
  console.log(`  Files skipped    : ${skippedCount}  (binary / too small)`);
  if (errors.length) console.log(`  ⚠  Errors        : ${errors.length}`);
  if (fileCount > 0) {
    console.log(`\n  Original size    : ${fmt(totalOriginal)}`);
    console.log(`  Brotli total     : ${fmt(totalBr)}  (-${pctSaved(totalOriginal, totalBr)}%)`);
    console.log(`  Gzip total       : ${fmt(totalGz)}  (-${pctSaved(totalOriginal, totalGz)}%)`);
  }
  console.log();

  if (errors.length) process.exit(1);
}

run().catch(err => { console.error(err); process.exit(1); });
