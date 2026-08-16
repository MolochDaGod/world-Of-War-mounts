/**
 * CharacterBase — shared hooks and helpers for FBX character rendering.
 */
import { useRef, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { TextureLoader, SRGBColorSpace } from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// ─── useFBXCharacter ──────────────────────────────────────────────────────────
/**
 * Loads an FBX and its texture, applies the texture to all SkinnedMesh nodes,
 * and returns a SkeletonUtils-cloned scene so each instance is independent.
 */
export function useFBXCharacter(fbxPath: string, texturePath: string) {
  const fbx = useFBX(fbxPath);
  const texture = useLoader(TextureLoader, texturePath);

  // Clone so each unit has its own skeleton
  const scene = useRef<THREE.Group | null>(null);
  if (!scene.current) {
    scene.current = SkeletonUtils.clone(fbx) as THREE.Group;
    scene.current.scale.setScalar(0.012);

    // Apply texture
    texture.colorSpace = SRGBColorSpace;
    scene.current.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = child as THREE.SkinnedMesh;
        mesh.material = new THREE.MeshLambertMaterial({
          map: texture,
        });
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }

  return {
    scene: scene.current,
    animations: fbx.animations as THREE.AnimationClip[],
  };
}

// ─── useAnimMixer ─────────────────────────────────────────────────────────────
/**
 * Creates an AnimationMixer for the scene, auto-plays 'idle' if present.
 * Returns the mixer ref and a playClip(name) function.
 */
export function useAnimMixer(
  scene: THREE.Group | null,
  animations: THREE.AnimationClip[],
) {
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    if (!scene) return;
    const mixer = new THREE.AnimationMixer(scene);
    mixerRef.current = mixer;

    // Auto-play idle
    const idleClip = THREE.AnimationClip.findByName(animations, 'idle')
      ?? animations[0];
    if (idleClip) {
      const action = mixer.clipAction(idleClip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.play();
      currentActionRef.current = action;
    }

    return () => {
      mixer.stopAllAction();
    };
  }, [scene]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_state, delta) => {
    mixerRef.current?.update(delta);
  });

  const playClip = useCallback(
    (name: string) => {
      const mixer = mixerRef.current;
      if (!mixer || !animations.length) return;

      const clip =
        THREE.AnimationClip.findByName(animations, name) ??
        animations[0];
      if (!clip) return;

      const newAction = mixer.clipAction(clip);
      if (currentActionRef.current === newAction) return;

      newAction.setLoop(THREE.LoopRepeat, Infinity);
      newAction.reset();

      if (currentActionRef.current) {
        currentActionRef.current.crossFadeTo(newAction, 0.25, true);
      }
      newAction.play();
      currentActionRef.current = newAction;
    },
    [animations],
  );

  return { mixerRef, playClip };
}

// ─── BaseFallback ─────────────────────────────────────────────────────────────
/** Simple capsule shown while FBX is loading. */
export function BaseFallback({ color = '#888888' }: { color?: string }) {
  return (
    <mesh position={[0, 0.9, 0]} castShadow>
      <capsuleGeometry args={[0.3, 1.2, 4, 8]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

// ─── SelectionRing ────────────────────────────────────────────────────────────
/** Glowing amber torus under a unit. Rotates slowly. */
export function SelectionRing({
  visible,
  radius = 0.8,
}: {
  visible: boolean;
  radius?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += delta * 1.2;
    }
  });

  if (!visible) return null;

  return (
    <mesh
      ref={meshRef}
      position={[0, 0.05, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <torusGeometry args={[radius, 0.05, 8, 48]} />
      <meshStandardMaterial
        color="#f5a623"
        emissive="#f5a623"
        emissiveIntensity={1.4}
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </mesh>
  );
}
