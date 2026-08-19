/**
 * RagdollSystem — Rapier physics ragdoll limbs that fly on explosion impact.
 *
 * Flow:
 *  1. ProjectileSystem calls emitRagdoll(position) when a stone/catapult lands.
 *  2. Module-level queue receives the event.
 *  3. RagdollSystem renders 5 Rapier RigidBody parts per event.
 *  4. Each part gets a random outward impulse; they simulate for 2.5 s then despawn.
 */
import { useState, useEffect, useRef } from 'react';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

// ── Module-level queue ────────────────────────────────────────────────────────

interface RagdollEvent {
  id: number;
  position: [number, number, number];
  createdAt: number;  // Date.now()
}

let _events: RagdollEvent[] = [];
let _nextId = 0;
let _notify: (() => void) | null = null;

/** Called by ProjectileSystem when a stone/catapult lands. */
export function emitRagdoll(position: [number, number, number]) {
  _events.push({ id: _nextId++, position, createdAt: Date.now() });
  _notify?.();
}

// ── Per-ragdoll group ─────────────────────────────────────────────────────────

const LIMB_SHAPES: Array<{ shape: 'capsule' | 'sphere'; args: [number, number] | [number] }> = [
  { shape: 'capsule', args: [0.18, 0.45] },  // torso
  { shape: 'capsule', args: [0.12, 0.35] },  // upper arm
  { shape: 'capsule', args: [0.10, 0.30] },  // lower arm
  { shape: 'sphere',  args: [0.15]        },  // head
  { shape: 'capsule', args: [0.13, 0.40] },  // leg
];

const DARK_MAT = new THREE.MeshToonMaterial({ color: '#553322' });
const BONE_MAT = new THREE.MeshToonMaterial({ color: '#ccbb99' });

interface LimbProps {
  position: [number, number, number];
  impulse: [number, number, number];
  shape: 'capsule' | 'sphere';
  args: [number, number] | [number];
  color: 'dark' | 'bone';
}

function RagdollLimb({ position, impulse, shape, args, color }: LimbProps) {
  const rbRef = useRef<any>(null);

  useEffect(() => {
    const rb = rbRef.current;
    if (!rb) return;
    const delay = setTimeout(() => {
      rb.applyImpulse({ x: impulse[0], y: impulse[1], z: impulse[2] }, true);
      rb.applyTorqueImpulse(
        { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 2 },
        true,
      );
    }, 0);
    return () => clearTimeout(delay);
  }, [impulse]);

  return (
    <RigidBody ref={rbRef} position={position} colliders={shape === 'sphere' ? 'ball' : 'hull'}>
      {shape === 'sphere' ? (
        <mesh material={color === 'bone' ? BONE_MAT : DARK_MAT} castShadow>
          <sphereGeometry args={[(args as [number])[0], 6, 6]} />
        </mesh>
      ) : (
        <mesh material={color === 'bone' ? BONE_MAT : DARK_MAT} castShadow>
          <capsuleGeometry args={[(args as [number, number])[0], (args as [number, number])[1], 4, 6]} />
        </mesh>
      )}
    </RigidBody>
  );
}

interface RagdollGroupProps {
  event: RagdollEvent;
  onExpire: (id: number) => void;
}

function RagdollGroup({ event, onExpire }: RagdollGroupProps) {
  const [px, py, pz] = event.position;

  useEffect(() => {
    // Despawn after 2.8 s
    const t = setTimeout(() => onExpire(event.id), 2800);
    return () => clearTimeout(t);
  }, [event.id, onExpire]);

  const limbs = LIMB_SHAPES.map((ls, i) => {
    const angle  = (i / LIMB_SHAPES.length) * Math.PI * 2 + Math.random() * 0.5;
    const spread = 1.5 + Math.random() * 1.5;
    const offX   = Math.cos(angle) * spread;
    const offZ   = Math.sin(angle) * spread;
    const offY   = 0.5 + Math.random() * 1.5;

    const speed  = 4 + Math.random() * 5;
    const impulse: [number, number, number] = [
      Math.cos(angle) * speed,
      4 + Math.random() * 4,
      Math.sin(angle) * speed,
    ];

    return (
      <RagdollLimb
        key={i}
        position={[px + offX, py + offY, pz + offZ]}
        impulse={impulse}
        shape={ls.shape as any}
        args={ls.args as any}
        color={i === 3 ? 'bone' : 'dark'}
      />
    );
  });

  return <>{limbs}</>;
}

// ── System renderer ───────────────────────────────────────────────────────────

export function RagdollSystem() {
  const [events, setEvents] = useState<RagdollEvent[]>([]);

  useEffect(() => {
    _notify = () => setEvents([..._events]);
    return () => { _notify = null; };
  }, []);

  const handleExpire = (id: number) => {
    _events = _events.filter(e => e.id !== id);
    setEvents([..._events]);
  };

  return (
    <>
      {events.map(ev => (
        <RagdollGroup key={ev.id} event={ev} onExpire={handleExpire} />
      ))}
    </>
  );
}
