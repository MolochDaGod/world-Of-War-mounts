---
name: Toon RTS game setup
description: Open-world RTS/survival game in artifacts/toon-rts; all asset paths, key architecture, and critical do/don't rules.
---

## Location
`artifacts/toon-rts` — React + Vite + R3F (v9.7) + drei (v10.7) + Rapier + Zustand

## Asset Packs (in public/assets/craftpix/)
All craftpix FBX packs are extracted there. Manifest at `src/game/assets/CraftpixManifest.ts`:
- `OrcModels` — orc warriors/peasants/king/queen + texture
- `ElfModels` — elf commoners/nobles/king/queen + texture
- `MedievalModels` — medieval people + texture (path: `fbx/people_unity/...`)
- `AnimalModels` — bear/wolf/boar/deer/fox/rabbit/owl + texture
- `TreeModels` — 10 tree variants (.FBX uppercase ext) + texture
- `MountainModels` — mountains/hills/plateaus + texture
- `VolcanoModels` — volcanoes/boulders + texture
- `MineModels` — gold/crystal/coal/mine buildings + texture
- `ChestModels` — 5 trunk variants + texture
- `SwordModels`, `HammerModels`, `CaneModels` — weapons + textures
- `GameUI` — craftpix fantasy UI PNG sprites used as CSS background-image

## Store Architecture
- `src/game/store/gameStore.ts` — units (teamId 1=elf/human, 2=orc), phase, difficulty, abilities
- `src/game/store/worldStore.ts` — resources (wood/gold/crystal/coal/food), animals, resourceNodes, worldItems, buildings, timeOfDay

## Game Scene Structure (GameScene.tsx)
Canvas: PCFShadowMap, far=1200, ACESFilmicToneMapping
Inside Physics:
  OpenWorld (300x300 heightmap) → GrassField → AnimeWater
  → WorldTrees → WorldMountains → ResourceNodes → WorldItems
  → OrcArmy / ElfArmy / MedievalNPCs → WildAnimals → CombatSystem
Outside Physics: AbilityManager, AimController, Preload

## App Flow
menu → RaceSelector → setup → DifficultySelect → battle → OpenWorldHUD

## Critical Rules (never break these)
- NO Math.random() in JSX/component render — all random values MUST be pre-computed at MODULE LEVEL (IIFE or const)
- FBX scale: ~0.012 (assets in centimetres)
- useFBX from drei + SkeletonUtils.clone for skinned meshes
- Apply texture manually: traverse mesh, MeshLambertMaterial({map, skinning: true}), set SRGBColorSpace
- TGALoader registered on THREE.DefaultLoadingManager in main.tsx
- THREE.DefaultLoadingManager.addHandler(/\.tga$/i, new TGALoader()) in main.tsx
- No @react-three/postprocessing — incompatible with R3F 9.x; use emissive + PointLights for glow

## Vite Config (critical)
- alias: 'three' → single workspace copy (prevents multiple instances warning)
- dedupe: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei']
- optimizeDeps.exclude: SkeletonUtils.js, TGALoader.js, FBXLoader.js (so alias works for them)

## WebGL Error in Screenshots
Expected — headless sandbox has no GPU. Real browser renders correctly.
