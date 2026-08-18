---
name: Toon RTS Ability System
description: Per-unit active abilities, passives, charges, stand ground, VFX, and combat timer added in the ability-system session.
---

## Architecture

**AbilityDefs.ts** (`src/game/data/AbilityDefs.ts`):
- Central registry of all 9 AbilityIds, ABILITY_DEFS map, UNIT_ABILITIES (keyed `${race}_${unitType}`)
- TotemData interface lives here
- getUnitAbilities(race, unitType) → AbilityId[]

**GameStore additions** (UnitData):
- `standGround`, `phaseShift`, `phaseShiftUntil`, `bleed`, `speedBoostUntil`, `chargeBoost`, `pendingBleed`, `lifedrainAura`, `shieldBashing`, `multiShotReady`, `abilityCharges`

**GameState additions**:
- `totems: TotemData[]`, `bountyBursts`, `combatElapsed: number`, `pendingAbility`

**Key actions**: `triggerAbility`, `toggleStandGround`, `placeTotem`, `expireTotems`, `expireBountyBursts`, `tickCombatElapsed`, `setPendingAbility`

## Faction Heal Abilities
| Faction | Unit | Ability | Mechanic |
|---|---|---|---|
| Crusade (WesternKingdoms) | mage | holy_totem | Ground click → place TotemData; heals 35HP/s, radius 14, 12s duration |
| Fabled (Elves) | mage | natures_bounty | Instant AOE +350HP to all allies within radius 22 of caster |
| Legion (Undead) | mage | life_drain | Toggle; each attack also heals nearby allies (radius 12) for 45% damage |

## Ability Charge System
- Charges stored in `unit.abilityCharges: Partial<Record<string, {charges, nextChargeAt}>>` (nextChargeAt = combatElapsed seconds)
- Regen ticked in CombatSystem every 1s: if charges < max && elapsed >= nextChargeAt → regen 1
- `triggerAbility(unitIds, abilityId)` checks charges, applies effect, calls consumeCharge internally
- Toggles (life_drain) skip charge checks
- Ground-targeting abilities set `pendingAbility` state; next ground click in RTSInputController triggers placement

## Combat Timer
- 8-minute (480s) limit tracked via `localElapsed` module var in CombatSystem, synced to store every 1s
- CombatTimer.tsx polls store at 1Hz, shows countdown (urgent red < 60s, warn orange < 120s)
- Timer expiry → setPhase('victory') immediately

## Stand Ground
- S key → `toggleStandGround(selectedUnitIds)` — first selected unit determines toggle direction
- When on: no movement, +25% damage reduction (drMult *= 0.75 on incoming hits)
- CommandBar shows [S] HOLD button that glows when any selected unit has standGround
- VFX: blue pulsing shield ring via StandGroundEffect.tsx

## Slower Combat Values
All damage ×0.55, all cooldowns ×1.3 vs. original values. Battles now ~1.8× longer.

## VFX Files
- HealTotem.tsx — gold pillar, spinning ring, rising sparkles, point light
- NaturesBounty.tsx — green shockwave ring + leaf particles, uses Date.now() timing (not R3F clock)
- LifeDrainAura.tsx — purple orbiting dark orbs around mage
- StandGroundEffect.tsx — blue pulsing ring + hex shield
- UnitAbilityVFX.tsx — orchestrator mounted in GameScene; reads totems/bountyBursts/drainUnits/standUnits

## UI
- UnitAbilityBar.tsx — appears above RegimentBar during battle when units with abilities selected; charge pips, cooldown overlay, shortcut badges, pending indicator
- CombatTimer.tsx — top-centre countdown, only shows during battle

## Critical Patterns
- **NaturesBounty timing**: uses `Date.now()` ms, NOT R3F clock.getElapsedTime(). `createdAt: number` in BountyBurst.
- **combatElapsed synced to store every 1s** (not every 30Hz tick) to avoid 30 Zustand writes/sec
- **Phase shift**: unit is skipped when searching for targets (`patches.get(other.id)?.phaseShift || other.phaseShift`)
- **Shield bash**: one-tick `shieldBashing` flag, processed in CombatSystem before normal combat, then cleared
