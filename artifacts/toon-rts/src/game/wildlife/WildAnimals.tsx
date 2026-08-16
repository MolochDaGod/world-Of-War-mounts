import { Suspense, useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore, AnimalKind, AnimalTickUpdate } from '@/game/store/worldStore';
import { useGameStore } from '@/game/store/gameStore';
import { AnimalEntityById } from './AnimalEntity';

// ── Animal speeds (units/second) ──────────────────────────────────────────────
const ANIMAL_SPEED: Record<AnimalKind, number> = {
  bear:   4,
  wolf:   7,
  boar:   5,
  deer:   8,
  deer2:  8,
  fox:    6,
  rabbit: 9,
  owl:    3,
};

// ── Hostile / passive sets ────────────────────────────────────────────────────
const HOSTILE_KINDS  = new Set<AnimalKind>(['bear', 'wolf']);
const PASSIVE_KINDS  = new Set<AnimalKind>(['deer', 'deer2', 'fox', 'rabbit']);

// ── Wander radius ─────────────────────────────────────────────────────────────
const WANDER_RADIUS = 30;

// ── Flee duration (ms) ────────────────────────────────────────────────────────
const FLEE_DURATION = 5000;

// ── Reusable vectors ──────────────────────────────────────────────────────────
const _v = new THREE.Vector3();

// ── Deterministic wander target from animal id + time bucket ─────────────────
// We derive a pseudo-random offset purely from the animal id chars so it never
// calls Math.random() in the render path.
function deterministicOffset(id: string, bucket: number): [number, number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  h = (h ^ (bucket * 2654435761)) | 0;
  const angle = ((h & 0xffff) / 0xffff) * Math.PI * 2;
  const r     = 5 + ((h >>> 16) / 0xffff) * WANDER_RADIUS;
  return [Math.cos(angle) * r, Math.sin(angle) * r];
}

// Pre-calc wander starting positions from the initial animal list — filled once
// on module load, never mutated, safe to read in render.
const WANDER_ORIGINS: Record<string, [number, number, number]> = {};

// ── Spawn particle component ──────────────────────────────────────────────────
// Simple expanding ring of 3 spheres that fades out after ~1.5s.
function AnimalSpawnParticles({ position }: { position: [number, number, number] }) {
  const ref0 = useRef<THREE.Mesh>(null);
  const ref1 = useRef<THREE.Mesh>(null);
  const ref2 = useRef<THREE.Mesh>(null);
  const born = useRef(Date.now());

  useFrame(() => {
    const age = (Date.now() - born.current) / 1000;
    if (age > 1.5) return;
    const t       = age / 1.5;
    const r       = t * 3;
    const opacity = Math.max(0, 1 - t);
    const meshRefs = [ref0, ref1, ref2];
    meshRefs.forEach((ref, i) => {
      if (!ref.current) return;
      const angle = (i / 3) * Math.PI * 2;
      ref.current.position.set(
        position[0] + Math.cos(angle) * r,
        position[1] + 0.5 + t * 1.5,
        position[2] + Math.sin(angle) * r,
      );
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity;
    });
  });

  if (Date.now() - born.current > 1500) return null;

  return (
    <group>
      <mesh ref={ref0}>
        <sphereGeometry args={[0.15, 6, 6]} />
        <meshBasicMaterial color="#a0f0c0" transparent opacity={1} depthWrite={false} />
      </mesh>
      <mesh ref={ref1}>
        <sphereGeometry args={[0.15, 6, 6]} />
        <meshBasicMaterial color="#a0f0c0" transparent opacity={1} depthWrite={false} />
      </mesh>
      <mesh ref={ref2}>
        <sphereGeometry args={[0.15, 6, 6]} />
        <meshBasicMaterial color="#a0f0c0" transparent opacity={1} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function WildAnimals() {
  // Subscribe to a STABLE selector — only re-renders when animals are
  // added, removed, or die. Position updates (10hz) are read inside useFrame
  // via getState() and do NOT trigger React re-renders.
  // Use a joined string so Zustand's default === comparison is stable.
  const liveAnimalIdsStr = useWorldStore(
    s => s.animals.filter(a => a.behavior !== 'dead').map(a => a.id).join(','),
  );
  const liveAnimalIds = liveAnimalIdsStr ? liveAnimalIdsStr.split(',') : [];

  // Throttle tick — 10 hz
  const lastTickRef = useRef(0);

  // Cache living unit positions each frame (avoid recalculating per-animal)
  const unitPositionsRef = useRef<[number, number, number][]>([]);

  // Track which animal ids have been seen for spawn particles.
  // Populated in useEffect (never in render) to avoid side-effects in render body.
  const seenIds       = useRef(new Set<string>());
  const spawnQueueRef = useRef<Array<{ id: string; pos: [number, number, number] }>>([]);
  const [spawnTick, setSpawnTick] = useState(0);

  // Populate WANDER_ORIGINS and detect new animals — safe side-effect location
  useEffect(() => {
    const animals = useWorldStore.getState().animals;
    let hasNew = false;
    animals.forEach(a => {
      if (!WANDER_ORIGINS[a.id]) {
        WANDER_ORIGINS[a.id] = [...a.position] as [number, number, number];
      }
      if (!seenIds.current.has(a.id)) {
        seenIds.current.add(a.id);
        spawnQueueRef.current.push({ id: a.id, pos: [...a.position] as [number, number, number] });
        hasNew = true;
      }
    });
    if (hasNew) setSpawnTick(n => n + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveAnimalIds.length]);

  useFrame(() => {
    const now = Date.now();

    // Read unit positions from store directly — no React subscription needed
    unitPositionsRef.current = useGameStore.getState().units
      .filter(u => u.state !== 'dead')
      .map(u => u.position);

    // ── AI Tick at 10hz ───────────────────────────────────────────────────────
    if (now - lastTickRef.current < 100) return;
    lastTickRef.current = now;

    const unitPositions = unitPositionsRef.current;

    // Read the latest animals snapshot from the store directly
    const currentAnimals = useWorldStore.getState().animals;

    // Collect ALL per-animal mutations here — flushed in ONE batchUpdateAnimals()
    // call to avoid N sequential Zustand set() calls which each fire a synchronous
    // useSyncExternalStore notification and cascade into "Maximum update depth exceeded".
    const tickUpdates: AnimalTickUpdate[] = [];

    for (const animal of currentAnimals) {
      if (animal.behavior === 'dead') continue;

      const [ax, ay, az] = animal.position;
      const origin = WANDER_ORIGINS[animal.id] ?? animal.position;
      const speed  = ANIMAL_SPEED[animal.kind] ?? 5;
      const dt     = 0.1; // 10hz tick → 100ms step in world units

      // Find nearest unit and distance
      let nearestDist = Infinity;
      let nearestPos: [number, number, number] | null = null;
      for (const up of unitPositions) {
        const dx = up[0] - ax;
        const dz = up[2] - az;
        const d  = Math.sqrt(dx * dx + dz * dz);
        if (d < nearestDist) {
          nearestDist = d;
          nearestPos  = up;
        }
      }

      // Build an update record for this animal (merged at end)
      const upd: AnimalTickUpdate = { id: animal.id };

      // ── Hostile animals: chase if unit is within alertRadius ───────────────
      if (HOSTILE_KINDS.has(animal.kind)) {
        if (nearestPos && nearestDist < animal.alertRadius) {
          upd.behavior       = 'chase';
          upd.targetPosition = nearestPos;
          upd.lastBehaviorAt = now;
        } else if (animal.behavior === 'chase') {
          upd.behavior       = 'wander';
          upd.lastBehaviorAt = now;
        }
      }

      // ── Passive animals: flee if unit is within alertRadius ────────────────
      if (PASSIVE_KINDS.has(animal.kind)) {
        if (nearestPos && nearestDist < animal.alertRadius) {
          const dx = ax - nearestPos[0];
          const dz = az - nearestPos[2];
          const len = Math.sqrt(dx * dx + dz * dz) || 1;
          upd.behavior       = 'flee';
          upd.targetPosition = [ax + (dx / len) * 20, ay, az + (dz / len) * 20];
          upd.lastBehaviorAt = now;
        } else if (
          animal.behavior === 'flee' &&
          now - animal.lastBehaviorAt > FLEE_DURATION
        ) {
          upd.behavior       = 'wander';
          upd.lastBehaviorAt = now;
        }
      }

      // ── Boar: charge ──────────────────────────────────────────────────────
      if (animal.kind === 'boar') {
        if (nearestPos && nearestDist < animal.alertRadius) {
          if (animal.behavior !== 'chase') {
            upd.behavior       = 'chase';
            upd.targetPosition = nearestPos;
            upd.lastBehaviorAt = now;
          }
        } else if (animal.behavior === 'chase') {
          upd.behavior       = 'wander';
          upd.lastBehaviorAt = now;
        }
      }

      // Resolve effective behavior for movement (may be overridden above)
      const effectiveBehavior  = upd.behavior       ?? animal.behavior;
      const effectiveTargetPos = upd.targetPosition ?? animal.targetPosition;

      // ── Wander tick ────────────────────────────────────────────────────────
      if (effectiveBehavior === 'wander') {
        const interval = 5000 + (animal.id.charCodeAt(Math.min(3, animal.id.length - 1)) % 4000);
        const bucket   = Math.floor(now / interval);
        if (now % interval < 110) {
          const [ox, oz] = deterministicOffset(animal.id, bucket);
          upd.behavior       = 'wander';
          upd.targetPosition = [origin[0] + ox, origin[1], origin[2] + oz];
          upd.lastBehaviorAt = now;
        }
        const [tx, , tz] = upd.targetPosition ?? effectiveTargetPos;
        _v.set(tx - ax, 0, tz - az);
        if (_v.length() > 0.5) {
          _v.normalize().multiplyScalar(speed * dt);
          upd.position = [ax + _v.x, ay, az + _v.z];
        }
      }

      // ── Chase tick ────────────────────────────────────────────────────────
      if (effectiveBehavior === 'chase') {
        const [tx, , tz] = effectiveTargetPos;
        _v.set(tx - ax, 0, tz - az);
        if (_v.length() > 1.0) {
          _v.normalize().multiplyScalar(speed * dt);
          upd.position = [ax + _v.x, ay, az + _v.z];
        }
      }

      // ── Flee tick ─────────────────────────────────────────────────────────
      if (effectiveBehavior === 'flee') {
        const [tx, , tz] = effectiveTargetPos;
        _v.set(tx - ax, 0, tz - az);
        if (_v.length() > 1.0) {
          _v.normalize().multiplyScalar(speed * 1.35 * dt);
          upd.position = [ax + _v.x, ay, az + _v.z];
        }
      }

      // Only enqueue if something actually changed
      if (
        upd.position       !== undefined ||
        upd.behavior       !== undefined ||
        upd.targetPosition !== undefined
      ) {
        tickUpdates.push(upd);
      }
    }

    // Single store write for the entire tick — one useSyncExternalStore notification
    if (tickUpdates.length > 0) {
      useWorldStore.getState().batchUpdateAnimals(tickUpdates);
    }
  });

  return (
    <group>
      {/* Spawn puff particles — drained from queue on each spawnTick */}
      {spawnQueueRef.current.map(({ id, pos }) => (
        <AnimalSpawnParticles key={`spawn-${id}`} position={pos} />
      ))}

      {/* Animal entities — each subscribes to its own slice of the store */}
      {liveAnimalIds.map((id) => (
        <Suspense key={id} fallback={null}>
          <AnimalEntityById animalId={id} />
        </Suspense>
      ))}
    </group>
  );
}
