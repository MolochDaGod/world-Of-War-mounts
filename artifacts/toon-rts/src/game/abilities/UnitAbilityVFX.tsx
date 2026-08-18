/**
 * UnitAbilityVFX — orchestrator that renders all active ability VFX in the 3D scene.
 * Reads totems, bounty bursts, life-drain aura units, and stand-ground units from store.
 */
import { useGameStore } from '../store/gameStore';
import { HealTotem } from './HealTotem';
import { NaturesBountyVFX } from './NaturesBounty';
import { LifeDrainAura } from './LifeDrainAura';
import { StandGroundEffect } from './StandGroundEffect';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

export function UnitAbilityVFX() {
  const totems       = useGameStore(s => s.totems);
  const bountyBursts = useGameStore(s => s.bountyBursts);
  const units        = useGameStore(s => s.units);
  const elapsed      = useGameStore(s => s.combatElapsed);

  // Units with life drain aura active
  const drainUnits = units.filter(
    u => u.state !== 'dead' && u.lifedrainAura && u.type === 'mage',
  );

  // Units with stand ground
  const standUnits = units.filter(u => u.state !== 'dead' && u.standGround);

  // Clean expired bursts once per second
  const lastClean = useRef(0);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (t - lastClean.current > 1) {
      lastClean.current = t;
      useGameStore.getState().expireBountyBursts(t);
    }
  });

  return (
    <>
      {/* Crusade heal totems */}
      {totems.map(totem => (
        <HealTotem key={totem.id} totem={totem} now={elapsed} />
      ))}

      {/* Fabled nature's bounty bursts */}
      {bountyBursts.map(burst => (
        <NaturesBountyVFX key={burst.id} burst={burst} />
      ))}

      {/* Legion life drain aura */}
      {drainUnits.map(u => (
        <LifeDrainAura key={u.id} position={u.position} />
      ))}

      {/* Stand ground shield rings */}
      {standUnits.map(u => (
        <StandGroundEffect key={u.id} position={u.position} />
      ))}
    </>
  );
}
