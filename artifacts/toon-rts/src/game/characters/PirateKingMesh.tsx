/**
 * PirateKingMesh — Pirate King Racalvin hero commander mesh.
 *
 * Loads the Meshy AI King-of-Pirates character GLB and merges all 17 animation
 * clips onto a single AnimationMixer (same pattern as MeshySoldier).
 * Animation state is driven by unitState prop.
 *
 * Cinematic time scale: 0.72.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { UnitState } from '@/game/store/gameStore';

// ── Asset paths ───────────────────────────────────────────────────────────────
const BASE = '/assets/characters/heroes/pirate_king';

export const PIRATE_KING_PATHS = {
  char:       `${BASE}/pk_char.glb`,
  idle:       `${BASE}/pk_idle.glb`,
  run:        `${BASE}/pk_run.glb`,
  walk:       `${BASE}/pk_walk.glb`,
  combo:      `${BASE}/pk_combo.glb`,
  charge:     `${BASE}/pk_charge.glb`,
  jump_punch: `${BASE}/pk_jump_punch.glb`,
  shoot:      `${BASE}/pk_shoot.glb`,
  throw:      `${BASE}/pk_throw.glb`,
  jump_run:   `${BASE}/pk_jump_run.glb`,
  roll:       `${BASE}/pk_roll.glb`,
  dive:       `${BASE}/pk_dive.glb`,
  slide:      `${BASE}/pk_slide.glb`,
  sit:        `${BASE}/pk_sit.glb`,
  step_sit:   `${BASE}/pk_step_sit.glb`,
  swim:       `${BASE}/pk_swim.glb`,
  swim_idle:  `${BASE}/pk_swim_idle.glb`,
  swim_edge:  `${BASE}/pk_swim_edge.glb`,
} as const;

// State → merged clip name
const STATE_TO_CLIP: Record<UnitState, string> = {
  idle:   'idle',
  move:   'run',
  attack: 'combo',
  dead:   'sit',
};

/** Clone a clip and give it a short key name. */
function namedClip(clip: THREE.AnimationClip, name: string) {
  const c = clip.clone();
  c.name = name;
  return c;
}

const ANIM_TS = 0.72;

export interface PirateKingMeshProps {
  position: [number, number, number];
  facing:   number;
  unitState: UnitState;
  scale?:   number;
}

export function PirateKingMesh({
  position, facing, unitState, scale = 0.013,
}: PirateKingMeshProps) {
  // ── Load all GLBs (cached after first load) ──────────────────────────────
  const { scene }  = useGLTF(PIRATE_KING_PATHS.char);
  const idleG      = useGLTF(PIRATE_KING_PATHS.idle);
  const runG       = useGLTF(PIRATE_KING_PATHS.run);
  const walkG      = useGLTF(PIRATE_KING_PATHS.walk);
  const comboG     = useGLTF(PIRATE_KING_PATHS.combo);
  const chargeG    = useGLTF(PIRATE_KING_PATHS.charge);
  const jpunchG    = useGLTF(PIRATE_KING_PATHS.jump_punch);
  const shootG     = useGLTF(PIRATE_KING_PATHS.shoot);
  const throwG     = useGLTF(PIRATE_KING_PATHS.throw);
  const jrunG      = useGLTF(PIRATE_KING_PATHS.jump_run);
  const rollG      = useGLTF(PIRATE_KING_PATHS.roll);
  const diveG      = useGLTF(PIRATE_KING_PATHS.dive);
  const slideG     = useGLTF(PIRATE_KING_PATHS.slide);
  const sitG       = useGLTF(PIRATE_KING_PATHS.sit);
  const stepSitG   = useGLTF(PIRATE_KING_PATHS.step_sit);
  const swimG      = useGLTF(PIRATE_KING_PATHS.swim);
  const swimIdleG  = useGLTF(PIRATE_KING_PATHS.swim_idle);
  const swimEdgeG  = useGLTF(PIRATE_KING_PATHS.swim_edge);

  // ── Clone scene — independent skeleton per hero ──────────────────────────
  const cloned = useMemo(() => {
    const c = SkeletonUtils.clone(scene) as THREE.Group;
    // Commander is always 1.5× scale — Pirate King is already imposing
    c.scale.setScalar(scale * 1.5);

    const gold = new THREE.Color('#ffd700');
    c.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as THREE.MeshStandardMaterial;
      const mat = src.clone();
      // Subtle gold tint — preserve the pirate's own colour palette
      mat.color.lerp(gold, 0.15);
      mat.emissive = new THREE.Color('#995500');
      mat.emissiveIntensity = 0.12;
      mesh.material = mat;
      mesh.castShadow    = true;
      mesh.receiveShadow = false;
    });
    return c;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, scale]);

  // ── Merge all named clips ────────────────────────────────────────────────
  const allClips = useMemo(() => [
    namedClip(idleG.animations[0],     'idle'),
    namedClip(runG.animations[0],      'run'),
    namedClip(walkG.animations[0],     'walk'),
    namedClip(comboG.animations[0],    'combo'),
    namedClip(chargeG.animations[0],   'charge'),
    namedClip(jpunchG.animations[0],   'jump_punch'),
    namedClip(shootG.animations[0],    'shoot'),
    namedClip(throwG.animations[0],    'throw'),
    namedClip(jrunG.animations[0],     'jump_run'),
    namedClip(rollG.animations[0],     'roll'),
    namedClip(diveG.animations[0],     'dive'),
    namedClip(slideG.animations[0],    'slide'),
    namedClip(sitG.animations[0],      'sit'),
    namedClip(stepSitG.animations[0],  'step_sit'),
    namedClip(swimG.animations[0],     'swim'),
    namedClip(swimIdleG.animations[0], 'swim_idle'),
    namedClip(swimEdgeG.animations[0], 'swim_edge'),
  ].filter(c => c.duration > 0), [
    idleG, runG, walkG, comboG, chargeG, jpunchG, shootG, throwG,
    jrunG, rollG, diveG, slideG, sitG, stepSitG, swimG, swimIdleG, swimEdgeG,
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
    <group ref={groupRef} position={position} rotation-y={facing}>
      <primitive object={cloned} />
    </group>
  );
}

// Lazy load — 155 MB of GLBs must not preload at module init.
// They load on first battle when PirateKingMesh is mounted inside a Suspense boundary.
