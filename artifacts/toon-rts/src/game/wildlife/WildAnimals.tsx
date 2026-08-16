import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore, AnimalEntity as AnimalEntityType, AnimalKind } from '@/game/store/worldStore';
import { AnimalEntity } from './AnimalEntity';
import { useGameStore } from '@/game/store/gameStore';

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
  const animals          = useWorldStore(s => s.animals);
  const setAnimalBehavior = useWorldStore(s => s.setAnimalBehavior);
  const moveAnimal        = useWorldStore(s => s.moveAnimal);
  const gameUnits         = useGameStore(s => s.units);

  // Throttle tick — 10 hz
  const lastTickRef = useRef(0);

  // Track which animal ids have been seen for spawn particles
  const seenIds = useRef(new Set<string>());
  const newIds  = useRef<string[]>([]);

  // Cache living unit positions each frame (avoid recalculating per-animal)
  const unitPositionsRef = useRef<[number, number, number][]>([]);

  // Populate wander origins for newly seen animals
  animals.forEach((a) => {
    if (!WANDER_ORIGINS[a.id]) {
      WANDER_ORIGINS[a.id] = [...a.position] as [number, number, number];
    }
  });

  useFrame(() => {
    const now = Date.now();

    // Update unit positions cache every frame (cheap read)
    unitPositionsRef.current = gameUnits
      .filter(u => u.state !== 'dead')
      .map(u => u.position);

    // ── AI Tick at 10hz ───────────────────────────────────────────────────────
    if (now - lastTickRef.current < 100) return;
    lastTickRef.current = now;

    const unitPositions = unitPositionsRef.current;

    // Read the latest animals snapshot from the store directly
    const currentAnimals = useWorldStore.getState().animals;

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

      // ── Hostile animals: chase if unit is within alertRadius ───────────────
      if (HOSTILE_KINDS.has(animal.kind)) {
        if (nearestPos && nearestDist < animal.alertRadius) {
          if (animal.behavior !== 'chase') {
            setAnimalBehavior(animal.id, 'chase', nearestPos);
          } else {
            // Update target to latest position
            setAnimalBehavior(animal.id, 'chase', nearestPos);
          }
        } else if (animal.behavior === 'chase') {
          // Lost target
          setAnimalBehavior(animal.id, 'wander');
        }
      }

      // ── Passive animals: flee if unit is within alertRadius ────────────────
      if (PASSIVE_KINDS.has(animal.kind)) {
        if (nearestPos && nearestDist < animal.alertRadius) {
          // Flee away from nearest unit
          const dx = ax - nearestPos[0];
          const dz = az - nearestPos[2];
          const len = Math.sqrt(dx * dx + dz * dz) || 1;
          const fleeTarget: [number, number, number] = [
            ax + (dx / len) * 20,
            ay,
            az + (dz / len) * 20,
          ];
          setAnimalBehavior(animal.id, 'flee', fleeTarget);
        } else if (
          animal.behavior === 'flee' &&
          now - animal.lastBehaviorAt > FLEE_DURATION
        ) {
          setAnimalBehavior(animal.id, 'wander');
        }
      }

      // ── Boar: flee initially, then charge (simplified to flee) ─────────────
      if (animal.kind === 'boar') {
        if (nearestPos && nearestDist < animal.alertRadius) {
          if (animal.behavior !== 'chase') {
            setAnimalBehavior(animal.id, 'chase', nearestPos);
          }
        } else if (animal.behavior === 'chase') {
          setAnimalBehavior(animal.id, 'wander');
        }
      }

      // ── Wander tick ────────────────────────────────────────────────────────
      if (animal.behavior === 'wander') {
        // Deterministic wander trigger: fire ~every 5-9s based on id hash
        const interval = 5000 + (animal.id.charCodeAt(Math.min(3, animal.id.length - 1)) % 4000);
        const bucket   = Math.floor(now / interval);
        if (now % interval < 110) {
          const [ox, oz] = deterministicOffset(animal.id, bucket);
          const newTarget: [number, number, number] = [
            origin[0] + ox,
            origin[1],
            origin[2] + oz,
          ];
          setAnimalBehavior(animal.id, 'wander', newTarget);
        }
        // Move toward wander target
        const [tx, , tz] = animal.targetPosition;
        _v.set(tx - ax, 0, tz - az);
        const dist = _v.length();
        if (dist > 0.5) {
          _v.normalize().multiplyScalar(speed * dt);
          moveAnimal(animal.id, [ax + _v.x, ay, az + _v.z]);
        }
      }

      // ── Chase tick ────────────────────────────────────────────────────────
      if (animal.behavior === 'chase' && animal.targetPosition) {
        const [tx, , tz] = animal.targetPosition;
        _v.set(tx - ax, 0, tz - az);
        const dist = _v.length();
        if (dist > 1.0) {
          _v.normalize().multiplyScalar(speed * dt);
          moveAnimal(animal.id, [ax + _v.x, ay, az + _v.z]);
        }
      }

      // ── Flee tick ────────────────────────────────────────────────────────
      if (animal.behavior === 'flee' && animal.targetPosition) {
        const fleeSpeed = speed * 1.35; // flee faster
        const [tx, , tz] = animal.targetPosition;
        _v.set(tx - ax, 0, tz - az);
        const dist = _v.length();
        if (dist > 1.0) {
          _v.normalize().multiplyScalar(fleeSpeed * dt);
          moveAnimal(animal.id, [ax + _v.x, ay, az + _v.z]);
        }
      }
    }
  });

  // Detect newly spawned animals for particles
  const spawnPositions: Array<{ id: string; pos: [number, number, number] }> = [];
  animals.forEach((a) => {
    if (!seenIds.current.has(a.id)) {
      seenIds.current.add(a.id);
      spawnPositions.push({ id: a.id, pos: a.position });
    }
  });

  const livingAnimals = animals.filter(a => a.behavior !== 'dead');

  return (
    <group>
      {/* Spawn puff particles for newly appearing animals */}
      {spawnPositions.map(({ id, pos }) => (
        <AnimalSpawnParticles key={`spawn-${id}`} position={pos} />
      ))}

      {/* Animal entities, each in its own Suspense boundary */}
      {livingAnimals.map((animal) => (
        <Suspense key={animal.id} fallback={null}>
          <AnimalEntity animal={animal} />
        </Suspense>
      ))}
    </group>
  );
}
