/**
 * Terrain — procedural battlefield with:
 *   - Flat central area (40×40) for combat
 *   - Gentle rolling hills at the edges via noise-displaced PlaneGeometry
 *   - Instanced trees (cones) scattered on the periphery
 *   - Instanced rocks on the slopes
 *   - Rapier fixed RigidBody for ground collision
 */
import * as THREE from 'three';
import { useMemo, useRef, useEffect } from 'react';
import { RigidBody } from '@react-three/rapier';

// ── Tiny seedable noise (no library needed) ──────────────────────────────────
function hash(x: number, z: number) {
  let h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function smoothNoise(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  return (
    hash(ix,   iz  ) * (1-ux) * (1-uz) +
    hash(ix+1, iz  ) *    ux  * (1-uz) +
    hash(ix,   iz+1) * (1-ux) *    uz  +
    hash(ix+1, iz+1) *    ux  *    uz
  );
}
function fbm(x: number, z: number, octaves = 4) {
  let v = 0, amp = 0.5, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    v += smoothNoise(x * freq, z * freq) * amp;
    max += amp; amp *= 0.5; freq *= 2;
  }
  return v / max;
}

// Height at world position (x, z) — flat in the middle, hills at edges
function getHeight(wx: number, wz: number): number {
  const distFromCenter = Math.sqrt(wx * wx + wz * wz);
  const flatRadius = 28;
  const slopeWidth = 20;
  const edgeFactor = Math.max(0, (distFromCenter - flatRadius) / slopeWidth);
  const noise = fbm(wx * 0.06 + 3.7, wz * 0.06 + 1.2);
  return edgeFactor * edgeFactor * (noise * 12 + 2);
}

// ── Ground geometry with height map ─────────────────────────────────────────
function buildGroundGeometry(size: number, segments: number) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, getHeight(x, z) - 0.5);
  }
  geo.computeVertexNormals();
  return geo;
}

// ── Pre-calc tree positions (periphery only) ─────────────────────────────────
const TREE_COUNT = 160;
const treeData = (() => {
  const arr: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();
  let attempts = 0;
  while (arr.length < TREE_COUNT && attempts < 2000) {
    attempts++;
    const angle  = hash(attempts * 0.1, 0.5) * Math.PI * 2;
    const r      = 35 + hash(attempts * 0.23, 0.71) * 25;
    const x      = Math.cos(angle) * r;
    const z      = Math.sin(angle) * r;
    const y      = getHeight(x, z) - 0.5;
    const scale  = 1.4 + hash(x * 0.1, z * 0.1) * 1.8;
    dummy.position.set(x, y, z);
    dummy.rotation.y = hash(x, z) * Math.PI * 2;
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    arr.push(dummy.matrix.clone());
  }
  return arr;
})();

// ── Pre-calc rock positions ──────────────────────────────────────────────────
const ROCK_COUNT = 60;
const rockData = (() => {
  const arr: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < ROCK_COUNT; i++) {
    const angle = hash(i * 0.37, 0.1) * Math.PI * 2;
    const r     = 20 + hash(i * 0.13, 0.88) * 40;
    const x     = Math.cos(angle) * r;
    const z     = Math.sin(angle) * r;
    const y     = getHeight(x, z) - 0.5;
    const s     = 0.4 + hash(x * 0.2, z * 0.2) * 1.2;
    dummy.position.set(x, y, z);
    dummy.rotation.set(hash(x,z)*0.5, hash(z,x)*Math.PI, 0);
    dummy.scale.set(s, s * (0.5 + hash(x*0.3,z*0.3) * 0.5), s);
    dummy.updateMatrix();
    arr.push(dummy.matrix.clone());
  }
  return arr;
})();

// ── Terrain materials ────────────────────────────────────────────────────────
const GROUND_MAT  = new THREE.MeshLambertMaterial({ color: '#3d6b22', side: THREE.FrontSide });
const TREE_TRUNK  = new THREE.MeshLambertMaterial({ color: '#5c3d1e' });
const TREE_LEAVES = new THREE.MeshLambertMaterial({ color: '#2e6b1a' });
const ROCK_MAT    = new THREE.MeshLambertMaterial({ color: '#6b6560', flatShading: true });
const FLAT_MAT    = new THREE.MeshLambertMaterial({ color: '#4a7a28' });

export function Terrain() {
  const groundGeo  = useMemo(() => buildGroundGeometry(160, 80), []);
  const treeRef    = useRef<THREE.InstancedMesh>(null);
  const trunkRef   = useRef<THREE.InstancedMesh>(null);
  const rockRef    = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (treeRef.current) {
      for (let i = 0; i < TREE_COUNT; i++) treeRef.current.setMatrixAt(i, treeData[i]);
      treeRef.current.instanceMatrix.needsUpdate = true;
    }
    if (trunkRef.current) {
      const dummy = new THREE.Object3D();
      for (let i = 0; i < TREE_COUNT; i++) {
        // Extract position from leaf matrix and put trunk below
        dummy.matrix.copy(treeData[i]);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
        dummy.position.y -= dummy.scale.y * 0.8;
        dummy.scale.x = 0.2; dummy.scale.z = 0.2;
        dummy.updateMatrix();
        trunkRef.current.setMatrixAt(i, dummy.matrix);
      }
      trunkRef.current.instanceMatrix.needsUpdate = true;
    }
    if (rockRef.current) {
      for (let i = 0; i < ROCK_COUNT; i++) rockRef.current.setMatrixAt(i, rockData[i]);
      rockRef.current.instanceMatrix.needsUpdate = true;
    }
  }, []);

  return (
    <group>
      {/* Physics ground — flat box under the centre so units don't fall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -1, 0]} receiveShadow visible={false}>
          <boxGeometry args={[160, 2, 160]} />
          <meshBasicMaterial />
        </mesh>
      </RigidBody>

      {/* Visible ground mesh with height-map */}
      <mesh geometry={groundGeo} receiveShadow castShadow material={GROUND_MAT} />

      {/* Flat bright centre for the battle zone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]} receiveShadow>
        <circleGeometry args={[28, 64]} />
        <primitive object={FLAT_MAT} />
      </mesh>

      {/* Instanced tree crowns (cones) */}
      <instancedMesh ref={treeRef} args={[undefined, undefined, TREE_COUNT]} castShadow receiveShadow>
        <coneGeometry args={[1.8, 4.5, 6]} />
        <primitive object={TREE_LEAVES} />
      </instancedMesh>

      {/* Instanced tree trunks */}
      <instancedMesh ref={trunkRef} args={[undefined, undefined, TREE_COUNT]} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.35, 3, 5]} />
        <primitive object={TREE_TRUNK} />
      </instancedMesh>

      {/* Instanced rocks */}
      <instancedMesh ref={rockRef} args={[undefined, undefined, ROCK_COUNT]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <primitive object={ROCK_MAT} />
      </instancedMesh>
    </group>
  );
}
