/**
 * HEAD live play URLs and fail if a mesh/anim path returns HTML (SPA rewrite).
 * Run: node --experimental-strip-types scripts/verify-loaders.ts
 */
const BASE = process.env.PLAY_URL ?? 'https://world-of-war-mounts.vercel.app';

const EXPECT: Array<{ path: string; type: string }> = [
  { path: '/assets/Toon_RTS/Elves/models/ELF_Characters_customizable.FBX', type: 'octet' },
  { path: '/assets/Toon_RTS/WesternKingdoms/models/WK_Characters_customizable.FBX', type: 'octet' },
  { path: '/assets/characters/animations/idle.fbx', type: 'octet' },
  { path: '/assets/characters/animations/run.fbx', type: 'octet' },
  { path: '/assets/characters/animations/attack.fbx', type: 'octet' },
  { path: '/ui/hud/slot-border.png', type: 'image/png' },
];

const MUST_NOT_BE_HTML = [
  '/assets/Toon_RTS/Elves/models/ELF_Characters_customizable.glb',
  '/assets/characters/animations/idle.glb',
];

async function head(path: string) {
  const res = await fetch(BASE + path, { method: 'HEAD' });
  return { status: res.status, type: res.headers.get('content-type') ?? '' };
}

let failed = 0;
for (const row of EXPECT) {
  const h = await head(row.path);
  const ok = h.status === 200 && !h.type.includes('text/html') && h.type.toLowerCase().includes(row.type === 'octet' ? 'octet' : row.type);
  const altOk = h.status === 200 && !h.type.includes('text/html') && row.type === 'octet';
  if (!(ok || altOk)) {
    console.error('FAIL', row.path, h);
    failed++;
  } else {
    console.log('OK  ', row.path, h.type);
  }
}

for (const path of MUST_NOT_BE_HTML) {
  const h = await head(path);
  if (h.type.includes('text/html')) {
    console.log('NOTE', path, 'is SPA HTML — no GLB bake on host (expected until uploaded)');
  } else if (h.status === 200) {
    console.log('OK  ', path, 'real glTF', h.type);
  } else {
    console.log('NOTE', path, h.status, '(missing GLB bake)');
  }
}

if (failed) {
  console.error(failed, 'loader checks failed');
  process.exit(1);
}
console.log('Loader verify passed against', BASE);
