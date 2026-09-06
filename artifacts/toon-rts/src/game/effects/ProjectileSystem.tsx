/**
 * ProjectileSystem — module-level projectile queue + React renderer.
 *
 * Flow:
 *  1. CombatSystem calls emitProjectile(from, to, kind) when a ranged unit attacks.
 *  2. Module-level _projectiles[] receives a new entry.
 *  3. ProjectileSystem renders the list at ~10fps state updates.
 *  4. Each ProjectileMesh moves its own mesh imperatively in useFrame (smooth).
 *  5. On arrival, a brief ImpactFlash burst is spawned.
 */
import { useState, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type ProjectileKind = 'arrow' | 'bolt' | 'stone' | 'magic';

// Ragdoll emitter — imported lazily to avoid circular deps
let _emitRagdoll: ((pos: [number,number,number]) => void) | null = null;
import('./RagdollSystem').then(m => { _emitRagdoll = m.emitRagdoll; });

interface ActiveProjectile {
  id: number;
  kind: ProjectileKind;
  from: THREE.Vector3;
  to: THREE.Vector3;
  dist: number;
  speed: number;   // world-units per second
  arc: number;     // max Y height above straight line
  progress: number; // 0 → 1
}

// ── Module-level store ────────────────────────────────────────────────────────
let _projectiles: ActiveProjectile[] = [];
let _nextId = 0;

const SPEED: Record<ProjectileKind, number> = {
  arrow: 28, bolt: 35, stone: 12, magic: 20,
};
const ARC: Record<ProjectileKind, number> = {
  arrow: 2, bolt: 0.5, stone: 14, magic: 3,
};

/** Called by CombatSystem to spawn a projectile. */
export function emitProjectile(
  from: [number, number, number],
  to:   [number, number, number],
  kind: ProjectileKind,
) {
  const f = new THREE.Vector3(...from).add(new THREE.Vector3(0, 1.5, 0));
  const t = new THREE.Vector3(...to).add(new THREE.Vector3(0, 0.8, 0));
  _projectiles.push({
    id: _nextId++,
    kind,
    from: f,
    to: t,
    dist: f.distanceTo(t),
    speed: SPEED[kind],
    arc: ARC[kind],
    progress: 0,
  });
}

// ── Position helper ───────────────────────────────────────────────────────────
function projectilePos(p: ActiveProjectile, out: THREE.Vector3) {
  out.lerpVectors(p.from, p.to, p.progress);
  // Parabolic arc: y += arc * 4t(1-t)
  out.y += p.arc * 4 * p.progress * (1 - p.progress);
  return out;
}

// ── Impact flash ─────────────────────────────────────────────────────────────
interface Flash { id: number; pos: THREE.Vector3; life: number; kind: ProjectileKind }
let _flashes: Flash[] = [];
let _flashId = 0;

function FlashMesh({ flash }: { flash: Flash }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    flash.life -= dt;
    if (ref.current) {
      const s = Math.max(0, flash.life / 0.35);
      ref.current.scale.setScalar(s);
    }
  });

  const color = flash.kind === 'magic' ? '#cc44ff'
    : flash.kind === 'stone'  ? '#aa7744'
    : '#ffcc44';

  return (
    <group ref={ref} position={flash.pos}>
      <mesh>
        <sphereGeometry args={[0.5, 6, 4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
          transparent
          opacity={0.8}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.65, 0]}>
        <ringGeometry args={[0.55, 0.78, 20]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ── Single projectile mesh (updates its own position in useFrame) ─────────────
const _tmpVec = new THREE.Vector3();

function ProjectileMesh({ proj }: { proj: ActiveProjectile }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    // Update progress directly on the shared object
    proj.progress = Math.min(1, proj.progress + (dt * proj.speed) / Math.max(proj.dist, 0.5));
    if (ref.current) {
      projectilePos(proj, _tmpVec);
      ref.current.position.copy(_tmpVec);
      // Orient arrow/bolt along velocity
      if (proj.kind === 'arrow' || proj.kind === 'bolt') {
        // Approximate forward from progress difference
        const t0 = Math.max(0, proj.progress - 0.02);
        const t1 = Math.min(1, proj.progress + 0.02);
        const a = projectilePos({ ...proj, progress: t0 }, new THREE.Vector3());
        const b = projectilePos({ ...proj, progress: t1 }, new THREE.Vector3());
        const dir = b.sub(a).normalize();
        if (dir.lengthSq() > 0) {
          ref.current.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 0, 1), dir,
          );
        }
      }
    }
  });

  const initialPos = projectilePos(proj, new THREE.Vector3()).toArray() as [number,number,number];

  // Visual shape per type
  if (proj.kind === 'stone') {
    return (
      <mesh ref={ref} position={initialPos}>
        <sphereGeometry args={[0.22, 6, 4]} />
        <meshStandardMaterial color="#888888" roughness={0.9} />
      </mesh>
    );
  }
  if (proj.kind === 'magic') {
    return (
      <mesh ref={ref} position={initialPos}>
        <sphereGeometry args={[0.18, 6, 4]} />
        <meshStandardMaterial
          color="#cc44ff"
          emissive="#cc44ff"
          emissiveIntensity={2}
          transparent
          opacity={0.9}
        />
      </mesh>
    );
  }
  // arrow / bolt — cylinder is Y-up; rotate so +Z matches setFromUnitVectors(0,0,1)
  return (
    <mesh ref={ref} position={initialPos} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.04, 0.04, 0.8, 5]} />
      <meshStandardMaterial
        color={proj.kind === 'bolt' ? '#88ccff' : '#cc8844'}
        emissive={proj.kind === 'bolt' ? '#4488cc' : '#000000'}
        emissiveIntensity={proj.kind === 'bolt' ? 1.5 : 0}
      />
    </mesh>
  );
}

// ── Main exported system component ────────────────────────────────────────────
export function ProjectileSystem() {
  const [projs, setProjs] = useState<ActiveProjectile[]>([]);
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const lastSyncRef = useRef(0);

  useFrame((state) => {
    // Remove arrived projectiles, spawn impacts
    let changed = false;
    const remaining: ActiveProjectile[] = [];
    for (const p of _projectiles) {
      if (p.progress >= 1) {
        // Spawn impact flash
        _flashes.push({
          id: _flashId++,
          pos: p.to.clone(),
          life: 0.35,
          kind: p.kind,
        });
        // Spawn physics ragdoll on catapult/stone impact
        if (p.kind === 'stone') {
          _emitRagdoll?.([p.to.x, 0, p.to.z]);
        }
        changed = true;
      } else {
        remaining.push(p);
      }
    }
    _projectiles = remaining;

    // Remove expired flashes
    _flashes = _flashes.filter(f => f.life > 0);

    // Sync React state at ~10fps to avoid per-frame setState
    const now = state.clock.elapsedTime;
    if (changed || now - lastSyncRef.current > 0.1) {
      lastSyncRef.current = now;
      setProjs([..._projectiles]);
      setFlashes([..._flashes]);
    }
  });

  return (
    <group name="projectile-system">
      {projs.map(p  => <ProjectileMesh  key={p.id}  proj={p}   />)}
      {flashes.map(f => <FlashMesh      key={f.id}  flash={f}  />)}
    </group>
  );
}
