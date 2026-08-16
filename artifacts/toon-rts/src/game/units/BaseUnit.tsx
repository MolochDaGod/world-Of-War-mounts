import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { UnitData, useGameStore } from '../store/gameStore';

// Team color lookup — stable references
const TEAM_COLORS: Record<number, THREE.Color> = {
  1: new THREE.Color(0.18, 0.42, 0.9),
  2: new THREE.Color(0.9, 0.18, 0.18),
};

// Race body color lookup — stable references, pre-calculated
const RACE_COLORS: Record<string, THREE.Color> = {
  Barbarians:      new THREE.Color('#7a4f2e'),
  Dwarves:         new THREE.Color('#6e5a3a'),
  Elves:           new THREE.Color('#3a6e5a'),
  Orcs:            new THREE.Color('#4a6a22'),
  Undead:          new THREE.Color('#8a8aaa'),
  WesternKingdoms: new THREE.Color('#9e8a60'),
};

// Unit shape config by type — stable, pre-calculated
const UNIT_SHAPES: Record<UnitData['type'], { bodyH: number; bodyR: number; scale: number }> = {
  infantry:    { bodyH: 1.0, bodyR: 0.30, scale: 1.0 },
  cavalry:     { bodyH: 1.2, bodyR: 0.40, scale: 1.5 },
  mage:        { bodyH: 1.0, bodyR: 0.28, scale: 0.95 },
  boltThrower: { bodyH: 0.8, bodyR: 0.55, scale: 2.0 },
  catapult:    { bodyH: 0.7, bodyR: 0.65, scale: 2.4 },
};

export function BaseUnit({ unit }: { unit: UnitData }) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef  = useRef<THREE.Mesh>(null);
  const selectedUnitIds = useGameStore(state => state.selectedUnitIds);
  const selectUnits     = useGameStore(state => state.selectUnits);

  const isSelected = selectedUnitIds.includes(unit.id);
  const shape      = UNIT_SHAPES[unit.type];
  const raceColor  = RACE_COLORS[unit.race] ?? new THREE.Color('#888');
  const teamColor  = TEAM_COLORS[unit.teamId] ?? new THREE.Color('#fff');

  // Stable materials per unit instance
  const bodyMaterial = useMemo(() =>
    new THREE.MeshLambertMaterial({ color: raceColor }), [unit.race]);

  const teamMaterial = useMemo(() =>
    new THREE.MeshLambertMaterial({ color: teamColor }), [unit.teamId]);

  const ringMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({ color: '#f5a623', transparent: true, opacity: 0.85, depthWrite: false }), []);

  // Sync position from store every frame — CombatSystem drives unit.position
  useFrame(() => {
    const grp = groupRef.current;
    if (!grp) return;

    // Lerp toward store position smoothly
    const [tx, ty, tz] = unit.position;
    grp.position.x += (tx - grp.position.x) * 0.2;
    grp.position.y += (ty - grp.position.y) * 0.2;
    grp.position.z += (tz - grp.position.z) * 0.2;

    // Face movement direction
    if (unit.targetPosition && unit.state === 'move') {
      const dx = unit.targetPosition[0] - grp.position.x;
      const dz = unit.targetPosition[2] - grp.position.z;
      if (Math.abs(dx) + Math.abs(dz) > 0.05) {
        grp.rotation.y = Math.atan2(dx, dz);
      }
    }

    // Death fade
    if (unit.state === 'dead') {
      grp.rotation.x += 0.04;
      grp.scale.setScalar(Math.max(0, grp.scale.x - 0.02));
    }

    // Attack bob
    if (unit.state === 'attack') {
      grp.position.y = Math.sin(Date.now() * 0.01) * 0.08;
    }
  });

  // Set initial position immediately on mount
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...unit.position);
    }
  }, []); // eslint-disable-line

  const hpPct = unit.health / unit.maxHealth;

  return (
    <group
      ref={groupRef}
      scale={shape.scale}
      onClick={(e) => { e.stopPropagation(); selectUnits([unit.id]); }}
    >
      {/* Body */}
      <mesh ref={bodyRef} position={[0, shape.bodyH / 2, 0]} castShadow receiveShadow material={bodyMaterial}>
        <capsuleGeometry args={[shape.bodyR, shape.bodyH, 4, 8]} />
      </mesh>

      {/* Helmet / team color indicator */}
      <mesh position={[0, shape.bodyH + shape.bodyR * 0.6, 0]} castShadow material={teamMaterial}>
        <sphereGeometry args={[shape.bodyR * 0.6, 8, 6]} />
      </mesh>

      {/* Weapon stub */}
      {unit.type !== 'catapult' && unit.type !== 'boltThrower' && (
        <mesh position={[shape.bodyR * 1.2, shape.bodyH * 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 1.2, 4]} />
          <meshLambertMaterial color="#888" />
        </mesh>
      )}

      {/* Siege machine frame */}
      {(unit.type === 'catapult' || unit.type === 'boltThrower') && (
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[1.2, 0.3, 0.8]} />
          <meshLambertMaterial color="#6b4c1e" />
        </mesh>
      )}

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[shape.bodyR * 1.6, shape.bodyR * 2.1, 32]} />
          <primitive object={ringMaterial} />
        </mesh>
      )}

      {/* HP bar */}
      <Html position={[0, shape.bodyH * 2 + 0.4, 0]} center distanceFactor={15}>
        <div className="w-14 h-2 bg-black/60 rounded-full overflow-hidden border border-white/10 pointer-events-none">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${hpPct * 100}%`,
              background: hpPct > 0.6
                ? '#22c55e'
                : hpPct > 0.3
                  ? '#eab308'
                  : '#ef4444',
            }}
          />
        </div>
      </Html>
    </group>
  );
}
