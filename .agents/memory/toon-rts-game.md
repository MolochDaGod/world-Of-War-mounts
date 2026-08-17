---
name: Toon RTS game setup
description: Open-world RTS/survival in artifacts/toon-rts; asset paths, scene structure, critical rules, Total War regiment system.
---

# Race Wars — Toon RTS

## Asset Root
`/assets/Toon_RTS/` — 6 races: Orcs, Elves, WesternKingdoms, Dwarves, Barbarians, Undead.
Each has: `models/` (FBX characters + cavalry + siege), `animation/<RoleType>/` FBX clips.
Scale: **0.01** for all models (Unity cm → Three.js meters).

## Manifest
`src/game/assets/ToonRTSManifest.ts` — `getSoldierAssets(race, category)` returns all 6 FBX paths + scale.
Universal infantry animations: **Dwarves Worker** clips (idle, run, attack, death).

## Regiment System (Total War)
- One `UnitData` = one regiment (NOT one soldier).
- Alive soldiers = `ceil(health/maxHealth × maxSoldiers)` — no redundant state.
- Regiment HP range: 1000–3000 (see `REGIMENT_DEFS` in gameStore.ts).
- `ToonRTSRegiment` in `src/game/characters/ToonRTSRegiment.tsx` renders N soldiers in formation grid.
- `BattleArmy` (same file) renders all units from store.

## UnitType union (11 values)
`infantry | swordsmen | spearmen | shieldwall | archers | skirmishers | cavalry | heavyCavalry | mage | boltThrower | catapult`
Note: **no `berserkers`** in the union — removed after TS errors.

## Army Builder Flow
`menu` → RaceSelector sets races → `setup` (ArmyBuilder.tsx) → player picks regiments → `spawnArmies()` → `battle` → CombatSystem → victory triggers `setPhase('victory')`.

## Key Scene Files
- `src/game/GameScene.tsx` — AnimeWater removed; BattleArmy + ProjectileSystem added.
- `src/game/effects/ProjectileSystem.tsx` — module-level queue, `emitProjectile(from, to, kind)`.
- `src/game/physics/CombatSystem.tsx` — 30Hz tick; emits projectiles for ranged units; detects victory.
- `src/hud/ArmyBuilder.tsx` — Total War UI (10 unit cards, gold budget 2000, 8 slots).
- `src/hud/RegimentBar.tsx` — bottom strip showing player regiments with HP bars.

## Critical Rules
- **No PNG textures** in Toon_RTS — FBX materials are embedded. Traverse and replace with MeshToonMaterial.
- **AnimeWater must NOT be in GameScene** — wave displacement puts plane above y=0, covering units.
- **useShallow** on all array selectors; single `batchCombatTick` per combat tick.
- **Actions as individual selectors**: `useGameStore(s => s.setPhase)` not `useGameStore(useShallow(s => ({setPhase: s.setPhase})))` — the latter caused "Invalid hook call" errors via HMR state corruption.
- Animation retargeting across races silently fails when bone names differ — soldiers stay T-pose, no crash.

## Deployment positions
Infantry z=±20, ranged z=±34, siege z=±48 (well within flat-center radius 40 of OpenWorld terrain).
