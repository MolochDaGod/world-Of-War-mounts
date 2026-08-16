/**
 * OpenWorld — large 300×300 open-world ground plane with rolling terrain.
 * Uses a pre-computed height map (sin/cos based, NO Math.random) with:
 *  - Flat center zone (radius 40) for the main battle area
 *  - Subtle height variation (max 3 units) further from center
 */
import * as THREE from 'three';
import { useMemo } from 'react';
import { RigidBody } from '@react-three/rapier';

// ── Pre-compute height map at module level ─────────────────────────────────
const WORLD_SIZE = 300;
const SEGMENTS = 80;

function computeHeight(wx: number, wz: number): number {
  const distFromCenter = Math.sqrt(wx * wx + wz * wz);
  const flatRadius = 40;
  const slopeWidth = 30;
  const edgeFactor = Math.max(0, (distFromCenter - flatRadius) / slopeWidth);
  const clamped = Math.min(edgeFactor, 1);
  // Multiple sin/cos octaves for rolling terrain — no Math.random
  const n1 = Math.sin(wx * 0.04 + 1.3) * Math.cos(wz * 0.035 + 0.7);
  const n2 = Math.sin(wx * 0.09 + 2.1) * Math.cos(wz * 0.08  + 1.4) * 0.5;
  const n3 = Math.cos(wx * 0.02 - 0.5) * Math.sin(wz * 0.025 + 2.2) * 0.25;
  const noise = (n1 + n2 + n3) * 0.5 + 0.5; // remap to 0..1
  return clamped * clamped * noise * 3;
}

// Build geometry once at module level
const openWorldGeo = (() => {
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, SEGMENTS, SEGMENTS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, computeHeight(x, z));
  }
  geo.computeVertexNormals();
  return geo;
})();

const openWorldMat = new THREE.MeshLambertMaterial({ color: '#4a7c3f' });

export function OpenWorld() {
  return (
    <group>
      {/* Physics ground — fixed cuboid under the plane */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -1, 0]} receiveShadow visible={false}>
          <boxGeometry args={[WORLD_SIZE, 2, WORLD_SIZE]} />
          <meshBasicMaterial />
        </mesh>
      </RigidBody>

      {/* Visible height-mapped ground */}
      <mesh geometry={openWorldGeo} receiveShadow material={openWorldMat} />
    </group>
  );
}
