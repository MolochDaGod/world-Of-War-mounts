/**
 * BattleVFXOverlay — production VFX layer rendered in world space:
 *
 *  1. Commander Aura Rings — pulsing ground disc at each living commander's
 *     aura radius, colour-coded by bonus type (attack/speed/defense).
 *
 *  2. AOE Indicators — flat rings under any active ability AOE zones.
 *
 * All effects are flat (y ≈ 0.08) and use depthWrite:false so they never
 * occlude units.
 */
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/game/store/gameStore';
import { useShallow }   from 'zustand/react/shallow';
import { COMMANDER_BY_ID } from '@/game/data/CommanderDefs';
import { ABILITY_DEFS } from '@/game/data/AbilityDefs';
import { TargetingTelegraph } from '@/game/abilities/SkillBurstVFX';

// ── Aura ring colours ─────────────────────────────────────────────────────────
const AURA_COLOR: Record<string, string> = {
  attack:  '#ff3322',
  speed:   '#22ff88',
  defense: '#2288ff',
};

// ── Single pulsing ring ───────────────────────────────────────────────────────
interface AuraRingProps {
  cx: number;
  cz: number;
  radius: number;
  bonusType: string;
}

function CommanderAuraRing({ cx, cz, radius, bonusType }: AuraRingProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color   = AURA_COLOR[bonusType] ?? '#ffffff';

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    // Slow pulse 0.25–0.55
    mat.opacity = 0.25 + 0.30 * (0.5 + 0.5 * Math.sin(t * 1.8));
    // Very slight scale breathe
    const s = 1 + 0.025 * Math.sin(t * 1.2);
    meshRef.current.scale.setScalar(s);
  });

  return (
    <mesh
      ref={meshRef}
      position={[cx, 0.08, cz]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[radius - 0.5, radius + 0.5, 64]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.4}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Secondary soft fill disc ──────────────────────────────────────────────────
function AuraFillDisc({ cx, cz, radius, bonusType }: AuraRingProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color   = AURA_COLOR[bonusType] ?? '#ffffff';

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.04 + 0.06 * (0.5 + 0.5 * Math.sin(t * 1.1 + 1));
  });

  return (
    <mesh
      ref={meshRef}
      position={[cx, 0.06, cz]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <circleGeometry args={[radius, 64]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.06}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Main overlay component ────────────────────────────────────────────────────
export function BattleVFXOverlay() {
  const phase = useGameStore(s => s.phase);
  const pendingAbility = useGameStore(s => s.pendingAbility);
  const abilityTarget = useGameStore(s => s.abilityTarget);
  const units = useGameStore(
    useShallow(s => s.units.filter(u => (u as any).isCommander && u.state !== 'dead')),
  );

  if (phase !== 'battle') return null;

  return (
    <group name="battle-vfx-overlay">
      {units.map(u => {
        const archId = (u as any).commanderArchetype as string | undefined;
        if (!archId) return null;
        const def = COMMANDER_BY_ID[archId];
        if (!def) return null;
        const { auraRadius, type } = def.leadershipBonus;
        const [cx, , cz] = u.position;
        return (
          <group key={u.id}>
            <CommanderAuraRing cx={cx} cz={cz} radius={auraRadius} bonusType={type} />
            <AuraFillDisc      cx={cx} cz={cz} radius={auraRadius} bonusType={type} />
          </group>
        );
      })}
      {pendingAbility && abilityTarget && (() => {
        const def = ABILITY_DEFS[pendingAbility.abilityId];
        const radius = def.areaEffect?.radius ?? (pendingAbility.abilityId === 'holy_totem' ? 14 : 6);
        return (
          <TargetingTelegraph
            position={abilityTarget.direction}
            radius={radius}
            color={def.color}
          />
        );
      })()}
    </group>
  );
}
