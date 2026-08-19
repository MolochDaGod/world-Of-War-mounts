/**
 * ArenaWarzone — loads the arena_warzone.glb environment.
 *
 * The GLB contains baked mesh+texture for the full arena (ground, walls, towers).
 * A flat invisible Rapier plane provides physics ground for ragdolls.
 * The arena is rotated to align FBX-style Y-up exports.
 */
import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useMemo } from 'react';

const ARENA_GLB = '/assets/environments/arena_warzone.glb';

// Tweak scale / position after seeing it in-game (FBX-origin models vary)
const ARENA_SCALE = 0.18;   // most Sketchfab FBX exports are in cm — this brings to metres
const ARENA_Y     = -0.5;

export function ArenaWarzone() {
  const { scene } = useGLTF(ARENA_GLB);

  const arenaScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow    = true;
      mesh.receiveShadow = true;
    });
    return clone;
  }, [scene]);

  return (
    <group>
      {/* Physics ground */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -1, 0]} visible={false}>
          <boxGeometry args={[200, 2, 200]} />
          <meshBasicMaterial />
        </mesh>
      </RigidBody>

      {/* Arena GLB — positioned and scaled to fit the battlefield */}
      <primitive
        object={arenaScene}
        scale={[ARENA_SCALE, ARENA_SCALE, ARENA_SCALE]}
        position={[0, ARENA_Y, 0]}
        rotation={[0, 0, 0]}
      />
    </group>
  );
}
