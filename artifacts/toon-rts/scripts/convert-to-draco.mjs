#!/usr/bin/env node
/**
 * convert-to-draco.mjs — GLB → DRACO-compressed GLB pipeline
 *
 * Uses gltf-pipeline (CesiumGS) to apply Google's DRACO mesh compression to
 * any GLB/GLTF file.  DRACO typically reduces geometry by 70-90% with
 * negligible quality loss at the default quantisation settings.
 *
 * ── Prerequisites ────────────────────────────────────────────────────────────
 *   pnpm add -D gltf-pipeline --filter @workspace/toon-rts
 *
 * ── FBX → GLB pre-step (one-time, offline) ───────────────────────────────────
 *   The game currently loads FBX files at runtime via Three.js FBXLoader.
 *   To use DRACO-compressed GLBs instead (5-10× smaller, faster decode):
 *
 *   Option A — Blender (recommended, free):
 *     1. File → Import → FBX  →  select your FBX
 *     2. File → Export → glTF 2.0  →  Format: GLB, ✓ Compress (DRACO)
 *
 *   Option B — fbx2gltf CLI (CesiumGS, Linux/macOS/Windows):
 *     npm install -g fbx2gltf   (or download the binary)
 *     fbx2gltf -i model.fbx -o model.glb --binary
 *     Then run THIS script to apply DRACO on top.
 *
 *   Option C — Sketchfab / model-viewer editor (browser-based)
 *
 * ── Switching the loader ──────────────────────────────────────────────────────
 *   Replace useFBX from drei with useGLTF + DRACOLoader:
 *
 *   import { useGLTF }     from '@react-three/drei';
 *   import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
 *   import { GLTFLoader }  from 'three/examples/jsm/loaders/GLTFLoader.js';
 *
 *   // In main.tsx, configure the DRACO decoder path:
 *   useGLTF.setDecoderPath('/draco/');   // copy three/examples/jsm/libs/draco/ → public/draco/
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *   # Single file:
 *   node scripts/convert-to-draco.mjs model.glb output.glb
 *
 *   # Batch — all GLBs in a directory:
 *   node scripts/convert-to-draco.mjs --batch public/assets/ public/assets-draco/
 *
 *   # With quantisation tuning (lower = smaller file, slightly less precision):
 *   node scripts/convert-to-draco.mjs model.glb out.glb --pos-bits 14 --norm-bits 10
 */

import { readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises';
import { join, extname, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Dynamic import so the script fails gracefully if gltf-pipeline isn't installed
let processGltf;
try {
  const mod = await import('gltf-pipeline');
  processGltf = mod.processGltf ?? mod.default?.processGltf;
} catch {
  console.error(
    '\n  ✗ gltf-pipeline is not installed.\n' +
    '    Run: pnpm add -D gltf-pipeline --filter @workspace/toon-rts\n'
  );
  process.exit(1);
}

// ── Default DRACO options ────────────────────────────────────────────────────
const DEFAULT_OPTS = {
  dracoOptions: {
    compressionLevel:              10,   // 0=fastest  10=smallest
    quantizePositionBits:          14,   // 14 is visually lossless for game assets
    quantizeNormalBits:            10,
    quantizeTexcoordBits:          12,
    quantizeColorBits:             8,
    quantizeGenericBits:           12,
    unifiedQuantization:           false,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 ** 2)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}

async function convertFile(inputPath, outputPath, opts) {
  const inputBuffer = await readFile(inputPath);
  const isGlb       = extname(inputPath).toLowerCase() === '.glb';

  const result = await processGltf(
    isGlb
      ? { glb: inputBuffer }
      : { gltf: JSON.parse(inputBuffer.toString()) },
    { ...DEFAULT_OPTS, ...opts, separate: false }
  );

  const outBuf = result.glb ?? Buffer.from(JSON.stringify(result.gltf));
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, outBuf);

  const inSize  = inputBuffer.length;
  const outSize = outBuf.length;
  const saved   = (((inSize - outSize) / inSize) * 100).toFixed(1);
  console.log(`  ✓  ${basename(outputPath).padEnd(50)} ${fmt(inSize).padStart(9)} → ${fmt(outSize).padStart(9)}  (-${saved}%)`);
  return { inSize, outSize };
}

async function* glbsInDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* glbsInDir(full);
    else if (/\.(glb|gltf)$/i.test(e.name)) yield full;
  }
}

// ── Arg parsing ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const batch   = args.includes('--batch');
const posBits = args[args.indexOf('--pos-bits')  + 1];
const normBits= args[args.indexOf('--norm-bits') + 1];

const extraOpts = {};
if (posBits)  extraOpts.dracoOptions = { ...DEFAULT_OPTS.dracoOptions, quantizePositionBits:  Number(posBits) };
if (normBits) extraOpts.dracoOptions = { ...DEFAULT_OPTS.dracoOptions, quantizeNormalBits:    Number(normBits) };

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  if (batch) {
    // batch mode: node convert-to-draco.mjs --batch <inDir> <outDir>
    const idx     = args.indexOf('--batch');
    const inDir   = args[idx + 1];
    const outDir  = args[idx + 2];
    if (!inDir || !outDir) {
      console.error('Usage: --batch <inputDir> <outputDir>');
      process.exit(1);
    }

    console.log(`\n⚙  DRACO-compressing all GLBs: ${inDir} → ${outDir}\n`);
    let totalIn = 0, totalOut = 0, count = 0;

    for await (const filePath of glbsInDir(inDir)) {
      const rel     = filePath.slice(inDir.length);
      const outPath = join(outDir, rel.replace(/\.gltf$/i, '.glb'));
      const r = await convertFile(filePath, outPath, extraOpts);
      totalIn  += r.inSize;
      totalOut += r.outSize;
      count++;
    }

    const saved = (((totalIn - totalOut) / totalIn) * 100).toFixed(1);
    console.log(`\n  ${'─'.repeat(60)}`);
    console.log(`  ${count} file(s)  ${fmt(totalIn)} → ${fmt(totalOut)}  total saving: -${saved}%\n`);
  } else {
    // single file mode: node convert-to-draco.mjs <input.glb> <output.glb>
    const [inputPath, outputPath] = args.filter(a => !a.startsWith('--'));
    if (!inputPath || !outputPath) {
      console.error('Usage: node convert-to-draco.mjs <input.glb> <output.glb>');
      console.error('       node convert-to-draco.mjs --batch <inDir> <outDir>');
      process.exit(1);
    }
    console.log(`\n⚙  DRACO-compressing: ${basename(inputPath)}\n`);
    await convertFile(inputPath, outputPath, extraOpts);
    console.log();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
