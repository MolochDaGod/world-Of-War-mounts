/**
 * GLBSoldierMesh — renders a single GLB character with GLTF animations.
 *
 * Each instance clones the shared scene so skeletons are independent.
 * Animation is driven by unitState (idle/move/attack/dead).
 */
import { useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useFrame } from '@react-three/fiber';
import type { UnitState } from '@/game/store/gameStore';

export interface GLBSoldierProps {
  glbPath: string;
  /** Map of unitState → animation clip name (or substring to fuzzy-match). */
  animMap: Partial<Record<UnitState, string>>;
  position: [number, number, number];
  facing: number;
  scale?: number;
  opacity?: number;
  color?: string;
  emissive?: string;
  unitState: UnitState;
}

/**
 * Find an AnimationAction by exact name or by substring (for Kenney-style
 * long names like "CharacterArmature|...|Idle|...").
 */
function findAction(
  actions: Record<string, THREE.AnimationAction | null>,
  nameOrSubstr: string,
) {
  if (actions[nameOrSubstr]) return actions[nameOrSubstr];
  const key = Object.keys(actions).find(
    k => k.includes(`|${nameOrSubstr}|`) || k.endsWith(`|${nameOrSubstr}`),
  );
  return key ? actions[key] : null;
}

export function GLBSoldierMesh({
  glbPath,
  animMap,
  position,
  facing,
  scale = 1,
  opacity = 1,
  color,
  emissive,
  unitState,
}: GLBSoldierProps) {
  const { scene, animations } = useGLTF(glbPath);

  // One cloned scene per mount so each soldier has its own skeleton
  const cloned = useMemo(() => {
    const c = SkeletonUtils.clone(scene) as THREE.Group;
    c.scale.setScalar(scale);
    // Apply custom material if requested
    if (color !== undefined || opacity < 1) {
      c.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        if (color)     mat.color.set(color);
        if (emissive)  mat.emissive?.set(emissive);
        if (opacity < 1) {
          mat.transparent = true;
          mat.opacity = opacity;
          mat.depthWrite = false;
        }
        mesh.material = mat;
        mesh.castShadow = true;
      });
    } else {
      c.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) mesh.castShadow = true;
      });
    }
    return c;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, scale, color, emissive, opacity]);

  const groupRef = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, cloned);

  // Track which animation is playing to avoid restarting
  const currentAnim = useRef<string | null>(null);

  useEffect(() => {
    const target = animMap[unitState] ?? animMap['idle'] ?? null;
    if (!target) return;
    if (currentAnim.current === target) return;
    const next = findAction(actions, target);
    if (!next) return;
    // Cross-fade from whatever is running
    const old = currentAnim.current ? findAction(actions, currentAnim.current) : null;
    old?.fadeOut(0.25);
    next.reset()
      .setLoop(unitState === 'dead' ? THREE.LoopOnce : THREE.LoopRepeat, Infinity)
      .setEffectiveTimeScale(0.72)   // cinematic slow-down
      .setEffectiveWeight(1);
    next.clampWhenFinished = unitState === 'dead';
    next.fadeIn(0.25).play();
    currentAnim.current = target;
  }, [unitState, animMap, actions]);

  // Sync group position & facing each frame (unit.position can change)
  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(position[0], position[1], position[2]);
    groupRef.current.rotation.y = facing;
  });

  return (
    <group ref={groupRef}>
      <primitive object={cloned} />
    </group>
  );
}
