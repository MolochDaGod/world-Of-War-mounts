---
name: Toon RTS Three.js fixes
description: Bugs fixed during the Three.js r185 / gamestack-js compliance pass; durable rules for future changes.
---

## GrassField instanced mesh setup
`useMemo` runs before React refs are populated — `meshRef.current` is always null.
**Fix:** pre-calculate all instance matrices in a module-level IIFE (outside component), then apply them in `useEffect` (runs after mount).
**Why:** useMemo with ref dependencies is a common trap; refs are not available until after the first render commit.

## Math.random() in JSX / abilities
Calling `Math.random()` inline in JSX (position/rotation props) violates gamestack-js rules and produces different values every re-render.
**Fix:** Pre-calculate all random layouts in a module-level array (outside component), reference by index in JSX.

## CombatSystem per-frame Zustand thrash
Calling `updateUnit` every single frame for every unit creates O(n²) store writes per frame — kills performance at 20+ units.
**Fix:** Rate-limit combat ticks to 30hz using `useRef(lastUpdate)`, use timestamp-based per-unit attack cooldowns (`attackTimers` record outside component), and only call `updateUnit` when state actually changes.

## BaseUnit position sync
Store `unit.position` is the source of truth (CombatSystem writes it). The mesh must read from it every frame via lerp in `useFrame`. Using a RigidBody for kinematic position created a desync.
**Fix:** Removed Rapier RigidBody from BaseUnit; use a plain `<group ref>` whose position is lerped toward `unit.position` each frame.

## PCFSoftShadowMap deprecation (Three.js r185)
`<Canvas shadows>` uses PCFSoftShadowMap by default which is deprecated in r185.
**Fix:** `<Canvas shadows={{ type: THREE.PCFShadowMap }}>` — import THREE and pass the enum.

## THREE.Clock deprecation
R3F `state.clock` is a THREE.Clock — deprecated in r185. No direct fix available since R3F owns it; just use `state.clock.elapsedTime` normally (the warning is non-breaking). Do not try to replace `state.clock` — it's internal to R3F.

## Rapier "deprecated parameters" warning
Comes from `@react-three/rapier` initializing the WASM module internally. Non-breaking; no user fix needed.

## Vite OOM / exit 137 from large GLB preloads
Large GLBs preloaded at module-init level (e.g. 34 MB flame, 155 MB PirateKing set) push Node.js heap over the limit, killing Vite with exit 137.
**Fix:** Remove all `useGLTF.preload()` calls at module level for GLBs ≥ 10 MB; let them load lazily on first mount. Add `NODE_OPTIONS=--max-old-space-size=2048` to the dev script.
**Rule:** Never add `useGLTF.preload()` at module level for large assets.

## WebGL error in agent screenshots
The agent sandbox has no GPU. `THREE.WebGLRenderer: Error creating WebGL context` in screenshots is expected and does NOT indicate a code bug. The app works correctly in real browsers.

## First-frame character transforms
**Rule:** A renderer that also synchronizes a character root through `useFrame` must provide the same position and facing declaratively on its first `<group>` render.

**Why:** Frame-driven synchronization begins after the component commits, allowing a loaded GLB to flash at world origin even when its game-state coordinates are already correct.

**How to apply:** Keep the canonical regiment position in the store, pass it as initial JSX transform props, and retain the frame update only for later movement smoothing/synchronization.
