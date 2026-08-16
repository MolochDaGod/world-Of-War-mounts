---
name: Kenney building system
description: Modular building/placement system using Kenney asset packs in toon-rts; scale factors, texture override pattern, ghost preview, key architectural decisions.
---

## Asset locations
Public directory: `artifacts/toon-rts/public/assets/kenney/{building,prototype,survival,nature,textures,ui}/`
- **building/**: 79 GLBs — wall, wall-corner, wall-doorway-*, wall-window-*, floor, roof-flat-*, stairs-*, column, border-high*, barricade-*
- **prototype/**: 145 GLBs — cleaner versions of walls/floors/doors
- **survival/**: 80 GLBs — fence, tent, workbench, campfire-pit, chest, barrel, structure*
- **nature/**: 81 GLBs — campfire_stones/logs/planks, bridge_stone/wood, tree_*
- **textures/**: 12 PNGs — wall_stone, wall_timber, floor_stone, floor_wood_planks, roof_clay_red, etc.
- **ui/**: 14 PNGs — panel_brown/beige/blue, buttonSquare_*, iconCheck, cursorSword

## Scale factors (Kenney tiles are 2m per unit)
- building-kit pieces: `scale={3}` → 6 game units per 2m tile
- survival-kit pieces: `scale={2}` → 4 game units
- nature-kit pieces: `scale={2}` → 4 game units

## Grid snap
All pieces snap to 2-unit grid (SNAP = 2 in BuildSystem.tsx).

## Texture override pattern
Must avoid conditional `useLoader` calls. Use TWO separate components:
- `TexturedPiece` — calls `useGLTF(path)` + `useLoader(TextureLoader, texturePath)`, clones scene, replaces all mesh materials
- `NativePiece` — calls `useGLTF(path)`, clones scene, only enables castShadow/receiveShadow

Parent `PlacedPiece` picks which to render based on `piece.texture` being defined.

## Ghost preview
`GhostPiece`: clone GLB scene, apply shared `GHOST_MAT` (blue, transparent, no depthWrite) to all meshes. Position updated via `ghostRef.current.position.set(...)` directly (no React state) so it moves at pointer speed without re-renders.

## Placement raycasting
Invisible ground plane mesh (`<mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]}>`) with `onPointerMove` + `onClick`. RTSCamera uses custom keyboard/edge-scroll (no OrbitControls), so no conflict.

**Why:** R3F raycasting against a ground plane mesh is simpler than manual THREE.Raycaster + camera projection, and avoids conflicts with OrbitControls (which doesn't exist in this project anyway).

## Store separation
- `worldStore` — persistent game state; `buildings` array; `Building.kind` is now `string` (not union), with optional `pieceId` and `rotation`
- `buildStore` — transient build-mode UI state (active, selectedId, rotation, activeTab)

**Why:** Transient placement state (ghost position, rotation, selected piece) must NOT live in worldStore — it would cause unnecessary re-renders on every frame and pollute saved game state.

## File layout
- `src/game/building/KenneyManifest.ts` — typed path registry
- `src/game/building/BuildCatalog.ts` — BuildPiece[] catalog (40+ pieces, 4 tabs)
- `src/game/building/PlacedBuildings.tsx` — renders worldStore.buildings
- `src/game/building/BuildSystem.tsx` — ghost + placement
- `src/game/store/buildStore.ts` — Zustand build-mode store
- `src/hud/BuildPanel.tsx` — HUD panel using Kenney UI sprites

## Known good file names (survival kit)
`fence.glb`, `fence-fortified.glb`, `fence-doorway.glb`, `tent.glb`, `tent-canvas.glb`, `structure.glb`, `structure-canvas.glb`, `workbench.glb`, `workbench-anvil.glb`, `campfire-pit.glb`, `campfire-stand.glb`, `chest.glb`, `barrel.glb`

## Known good file names (nature kit — underscores)
`campfire_stones.glb`, `campfire_logs.glb`, `campfire_planks.glb`, `bridge_stone.glb`, `bridge_wood.glb`, tree variants use underscores (tree_oak.glb, tree_pine*.glb, etc.)
