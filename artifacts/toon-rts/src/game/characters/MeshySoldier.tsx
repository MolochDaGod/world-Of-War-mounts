/**
 * MeshySoldier — a single Meshy AI character with all 10 baked-animation GLBs
 * merged onto one skeleton at runtime.
 *
 * Each animation GLB carries the same skinned mesh + a single AnimationClip.
 * We clone the base character scene once per soldier and build a combined clip
 * array so useAnimations can drive them all from one AnimationMixer.
 *
 * Time scale is capped at 0.75 for a more cinematic, weighty feel.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { UnitState } from '@/game/store/gameStore';

// ── Asset paths ───────────────────────────────────────────────────────────────
const BASE = '/assets/characters/meshy';
export const MESHY_PATHS = {
  char:    `${BASE}/character.glb`,
  idle:    `${BASE}/anim_idle.glb`,
  run:     `${BASE}/anim_run.glb`,
  walk:    `${BASE}/anim_walk.glb`,
  punch:   `${BASE}/anim_punch.glb`,
  slash:   `${BASE}/anim_slash.glb`,
  kick:    `${BASE}/anim_kick.glb`,
  counter: `${BASE}/anim_counter.glb`,
  block:   `${BASE}/anim_block.glb`,
  turn:    `${BASE}/anim_turn.glb`,
  hook:    `${BASE}/anim_hook.glb`,
} as const;

// State → merged clip name
const STATE_TO_CLIP: Record<UnitState, string> = {
  idle:   'idle',
  move:   'run',
  attack: 'punch',
  dead:   'kick',
};

/** Clone a THREE.AnimationClip and give it a short key name. */
function namedClip(clip: THREE.AnimationClip, name: string) {
  const c = clip.clone();
  c.name = name;
  return c;
}

// Cinematic time scale — all Meshy animations play slower
const ANIM_TS = 0.72;

export interface MeshySoldierProps {
  position: [number, number, number];
  facing: number;
  unitState: UnitState;
  scale?: number;
  teamId: 1 | 2;
  isCommander?: boolean;
}

export function MeshySoldier({
  position, facing, unitState,
  scale = 0.013, teamId, isCommander = false,
}: MeshySoldierProps) {
  // ── Load all GLBs (cached after first load) ──────────────────────────────
  const { scene }    = useGLTF(MESHY_PATHS.char);
  const idleG        = useGLTF(MESHY_PATHS.idle);
  const runG         = useGLTF(MESHY_PATHS.run);
  const walkG        = useGLTF(MESHY_PATHS.walk);
  const punchG       = useGLTF(MESHY_PATHS.punch);
  const slashG       = useGLTF(MESHY_PATHS.slash);
  const kickG        = useGLTF(MESHY_PATHS.kick);
  const counterG     = useGLTF(MESHY_PATHS.counter);
  const blockG       = useGLTF(MESHY_PATHS.block);
  const turnG        = useGLTF(MESHY_PATHS.turn);
  const hookG        = useGLTF(MESHY_PATHS.hook);

  // ── Clone scene once — independent skeleton per soldier ─────────────────
  const cloned = useMemo(() => {
    const c = SkeletonUtils.clone(scene) as THREE.Group;
    c.scale.setScalar(isCommander ? scale * 1.5 : scale);

    const teamTint   = new THREE.Color(teamId === 1 ? '#6ab4ff' : '#dd77dd');
    const cmdTint    = new THREE.Color('#ffd700');
    const baseTint   = isCommander ? cmdTint : teamTint;

    c.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as THREE.MeshStandardMaterial;
      const mat = src.clone();
      // Blend baked texture colour with faction tint (80% original, 20% tint)
      mat.color.lerp(baseTint, 0.22);
      if (isCommander) {
        mat.emissive = new THREE.Color('#aa6600');
        mat.emissiveIntensity = 0.18;
      }
      mesh.material = mat;
      mesh.castShadow    = true;
      mesh.receiveShadow = false;
    });
    return c;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, scale, teamId, isCommander]);

  // ── Merge all named clips ────────────────────────────────────────────────
  const allClips = useMemo(() => [
    namedClip(idleG.animations[0],    'idle'),
    namedClip(runG.animations[0],     'run'),
    namedClip(walkG.animations[0],    'walk'),
    namedClip(punchG.animations[0],   'punch'),
    namedClip(slashG.animations[0],   'slash'),
    namedClip(kickG.animations[0],    'kick'),
    namedClip(counterG.animations[0], 'counter'),
    namedClip(blockG.animations[0],   'block'),
    namedClip(turnG.animations[0],    'turn'),
    namedClip(hookG.animations[0],    'hook'),
  ].filter(Boolean), [
    idleG, runG, walkG, punchG, slashG, kickG, counterG, blockG, turnG, hookG,
  ]);

  const { actions } = useAnimations(allClips, cloned);
  const currentAnim = useRef<string | null>(null);

  // ── Drive animation from unitState ───────────────────────────────────────
  useEffect(() => {
    const target = STATE_TO_CLIP[unitState] ?? 'idle';
    if (currentAnim.current === target) return;

    const next = actions[target];
    if (!next) return;

    const old = currentAnim.current ? actions[currentAnim.current] : null;
    old?.fadeOut(0.3);

    next.reset()
      .setLoop(unitState === 'dead' ? THREE.LoopOnce : THREE.LoopRepeat, Infinity)
      .setEffectiveTimeScale(ANIM_TS)
      .setEffectiveWeight(1)
      .fadeIn(0.3)
      .play();
    next.clampWhenFinished = unitState === 'dead';
    currentAnim.current = target;
  }, [unitState, actions]);

  // ── Sync position & rotation every frame ─────────────────────────────────
  const groupRef = useRef<THREE.Group>(null);
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

// Preload everything so the first battle doesn't stutter
Object.values(MESHY_PATHS).forEach(p => useGLTF.preload(p));
