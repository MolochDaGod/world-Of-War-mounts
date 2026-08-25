/**
 * CombatEffects — bounded, render-only feedback for deterministic combat hits.
 *
 * CombatSystem emits one event exactly when damage is resolved. The renderer
 * mutates effect meshes in useFrame and only syncs its React list at a small
 * cadence, keeping combat feedback independent from simulation state.
 */
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type CombatImpactKind = 'melee' | 'guard' | 'charge';

interface CombatImpact {
  id: number;
  kind: CombatImpactKind;
  from: [number, number, number];
  to: [number, number, number];
  createdAt: number;
  duration: number;
}

const MAX_IMPACTS = 96;
let nextImpactId = 0;
let impacts: CombatImpact[] = [];
let notify: (() => void) | null = null;

/** Emit a short weapon trail plus an impact/clash at a resolved combat hit. */
export function emitCombatImpact(
  from: [number, number, number],
  to: [number, number, number],
  kind: CombatImpactKind = 'melee',
) {
  const duration = kind === 'charge' ? 520 : 360;
  impacts.push({
    id: nextImpactId++,
    kind,
    from: [...from] as [number, number, number],
    to: [...to] as [number, number, number],
    createdAt: Date.now(),
    duration,
  });
  if (impacts.length > MAX_IMPACTS) impacts = impacts.slice(-MAX_IMPACTS);
  notify?.();
}

function ImpactVisual({ impact }: { impact: CombatImpact }) {
  const groupRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const color = impact.kind === 'guard'
    ? '#75bcff'
    : impact.kind === 'charge'
      ? '#ff9d3b'
      : '#ffe070';

  const dx = impact.to[0] - impact.from[0];
  const dz = impact.to[2] - impact.from[2];
  const length = Math.max(0.25, Math.hypot(dx, dz));
  const facing = Math.atan2(dx, dz);

  useFrame(() => {
    const age = Date.now() - impact.createdAt;
    const t = Math.max(0, Math.min(1, age / impact.duration));
    const alpha = (1 - t) * (impact.kind === 'charge' ? 0.95 : 0.82);
    if (groupRef.current) groupRef.current.scale.setScalar(0.75 + t * 1.1);
    const trailMaterial = trailRef.current?.material as THREE.MeshBasicMaterial | undefined;
    const ringMaterial = ringRef.current?.material as THREE.MeshBasicMaterial | undefined;
    if (trailMaterial) trailMaterial.opacity = alpha * (1 - t * 0.45);
    if (ringMaterial) ringMaterial.opacity = alpha;
  });

  return (
    <group ref={groupRef} position={[impact.to[0], 0.16, impact.to[2]]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.26, impact.kind === 'charge' ? 1.5 : 0.95, 18]} />
        <meshBasicMaterial color={color} transparent depthWrite={false} />
      </mesh>
      <mesh
        ref={trailRef}
        position={[-dx / 2, 0.38, -dz / 2]}
        rotation={[Math.PI / 2, 0, -facing]}
      >
        <planeGeometry args={[impact.kind === 'charge' ? 0.46 : 0.24, length]} />
        <meshBasicMaterial color={color} transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function CombatEffects() {
  const [active, setActive] = useState<CombatImpact[]>([]);
  const lastSync = useRef(0);

  useEffect(() => {
    notify = () => setActive([...impacts]);
    return () => { notify = null; };
  }, []);

  useFrame(({ clock }) => {
    const now = Date.now();
    const next = impacts.filter(effect => now - effect.createdAt < effect.duration);
    const changed = next.length !== impacts.length;
    impacts = next;
    if (changed || clock.elapsedTime - lastSync.current > 0.12) {
      lastSync.current = clock.elapsedTime;
      setActive([...impacts]);
    }
  });

  return <group name="combat-effects">{active.map(impact => (
    <ImpactVisual key={impact.id} impact={impact} />
  ))}</group>;
}