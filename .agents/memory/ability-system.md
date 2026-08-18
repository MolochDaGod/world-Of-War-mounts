---
name: Toon RTS Ability System + Commander System
description: Per-unit abilities, charges, stand ground, VFX, combat timer; faction heal archetypes; NaturesBounty uses Date.now(); commander heroes; postprocessing; ragdoll.
---

## Ability Architecture

**AbilityDefs.ts** (`src/game/data/AbilityDefs.ts`):
- Central registry of 9 AbilityIds, ABILITY_DEFS map, UNIT_ABILITIES (`${race}_${unitType}` keyed), TotemData interface.

**GameStore UnitData fields added**: `standGround`, `phaseShift/Until`, `bleed`, `speedBoostUntil`, `chargeBoost`, `pendingBleed`, `lifedrainAura`, `shieldBashing`, `multiShotReady`, `abilityCharges`, `isCommander`, `commanderArchetype`, `commanderName`.

**GameState additions**: `totems`, `bountyBursts`, `combatElapsed`, `pendingAbility`, `playerCommander`.

## Faction Heal Abilities
| Faction | Unit | Ability | Mechanic |
|---|---|---|---|
| Crusade (WK) | mage | holy_totem | Ground click → place TotemData; heals 35HP/s, radius 14, 12s |
| Fabled (Elves) | mage | natures_bounty | Instant +350HP to all allies within radius 22 |
| Legion (Undead) | mage | life_drain | Toggle aura; each attack heals nearby allies 45% damage |

## Commander System (CommanderDefs.ts)
- 3 archetypes per race × 6 races = 18 commanders: Champion, Warlord, Archmage
- `COMMANDER_DEFS`, `COMMANDER_BY_ID`, `getCommandersForRace(race)`
- Store: `playerCommander: string | null`, `setPlayerCommander(id)`
- spawnArmies reads playerCommander → spawns commander UnitData (maxSoldiers:1, isCommander:true, hp from def)
- ToonRTSRegiment: isCommander → 1.5× scale, gold toon material (#ffd700), gold ring always visible
- CombatSystem: `commanderAttackMult(unit)` applies aura mult to rawDmg when attacker is within auraRadius
- CommanderSelectPanel: shown inside ArmyBuilder at bottom; 3 cards per race, pick one before battle

## Postprocessing (GameScene.tsx)
- `EffectComposer` (multisampling:0) + `SMAA` + `Bloom` (intensity:0.45, threshold:0.75) + `Vignette`
- Added after UnitAbilityVFX/AbilityManager, inside Suspense, outside Physics
- @react-three/postprocessing already installed; may show "Multiple instances of Three.js" warning → fix with vite resolve.alias `three`

## Ragdoll System (RagdollSystem.tsx)
- Module-level event queue; `emitRagdoll(position)` exported
- ProjectileSystem imports emitRagdoll lazily (dynamic import) and calls it on stone/catapult impact
- Spawns 5 Rapier RigidBody limbs per event, random outward impulses, despawn after 2.8s
- Lives inside Physics in GameScene

## Floating Unit Labels (RegimentLabel.tsx)
- Html from drei, `distanceFactor={60}`, team-colored border/bg
- Shows: commander crown (♛), unit type name, soldier count (alive/max), HP bar
- Commander labels float at y=5.5, regular at y=4

## Animation Path Update (ToonRTSManifest.ts)
- INF_ANIM now points to `/assets/characters/animations/` (uploaded FBX files)
- Paths: idle.fbx, run.fbx, attack.fbx, attack_heavy.fbx, death.fbx
- Character model FBX files copied to `/assets/characters/models/` (BRB, DWF, ORC, UD, WK)
- Equipment GLBs copied to `/assets/characters/equipment/` (barbarian, dwarf, high_elf, human, orc, undead)

## Critical Patterns
- **NaturesBounty timing**: Date.now() ms, NOT R3F clock
- **combatElapsed synced to store every 1s** (not every 30Hz tick)
- **Commander unit spawned at [0,0,18]** (front-center of player army), facing Math.PI
- **commanderAttackMult only applies to 'attack' bonus type** — speed/defense bonuses not yet wired to movement/DR
- **Postprocessing "multiple Three.js" warning**: alias `three` in vite.config.ts to fix
