---
name: Toon RTS Game — Race Wars
description: Six-race toon RTS browser game built with R3F, Rapier, Zustand; FBX assets extracted from zip into public/assets/Toon_RTS/
---

## What was built
Full Toon RTS game "Race Wars" at artifacts/toon-rts (preview path /). Frontend-only — no backend or DB needed.

## Stack
- React Three Fiber (@react-three/fiber, @react-three/drei)
- Rapier physics (@react-three/rapier)
- Post-processing (@react-three/postprocessing)
- Zustand for game state
- Three.js for all 3D (FBXLoader, TGALoader, ShaderMaterial)
- No OpenAPI/backend — pure client game

## Assets
- Extracted from attached_assets/Toon_RTS_1786857985130.zip to artifacts/toon-rts/public/assets/Toon_RTS/
- 6 races: Barbarians, Dwarves, Elves, Orcs, Undead, WesternKingdoms
- FBX models: characters, cavalry, bolt thrower (Elves), catapult (Orcs, WK)
- TGA textures per race
- Animation FBXs: idle, run, attack, death, charge, cast

## Key source files
- src/game/store/gameStore.ts — Zustand store (units, phase, abilities, scores)
- src/game/shaders/ToonMaterial.ts — custom cel-shader ShaderMaterial
- src/game/world/World.tsx + AnimeWater.tsx + GrassField.tsx — stylized world
- src/game/units/BaseUnit.tsx + UnitManager.tsx — unit rendering + management
- src/game/abilities/AbilityManager.tsx — ability casting system (fire/ice/lightning/meteor/wind)
- src/game/camera/RTSCamera.tsx — overhead pan/zoom/rotate camera
- src/game/physics/CombatSystem.tsx — autonomous AI combat loop
- src/hud/GameHUD.tsx + RaceSelector.tsx — HTML overlay HUD

## Why WebGL errors appear in screenshots
The Replit agent screenshot tool runs headless without GPU — any WebGL app shows this error. In a real browser with GPU, it works fine.

## FBX loading
Currently uses procedural fallback geometry. Task #1 proposes wiring actual FBXLoader + TGALoader. Use THREE.FBXLoader from 'three/examples/jsm/loaders/FBXLoader', THREE.TGALoader from 'three/examples/jsm/loaders/TGALoader'. Clone models with model.clone(), retarget anims with AnimationMixer.

**Why:** FBX async loading in R3F requires careful Suspense setup; the fallback was chosen for initial build speed.
**How to apply:** Wrap each useLoader(FBXLoader, path) in <Suspense>, apply ToonMaterial after load traversal.
