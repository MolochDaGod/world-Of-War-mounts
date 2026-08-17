/**
 * ToonRTSRegiment — renders a formation of soldiers from the Toon_RTS asset pack.
 *
 * Architecture:
 *  - One UnitData in the store = one regiment (not one soldier).
 *  - Regiment renders N = maxSoldiers soldiers at formation grid positions.
 *  - As health drops, alive soldier count = ceil(health/maxHealth × maxSoldiers).
 *  - Each ToonRTSSoldierInner loads 6 FBX files (model + 5 anim FBXs) via useFBX
 *    which caches by URL — all soldiers of the same race/type share one load.
 *  - SkeletonUtils.clone() gives each soldier its own independent skeleton.
 *  - Animation retargeting is automatic: AnimationMixer matches bone names.
 */
import { Suspense, useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useGameStore, UnitData } from '@/game/store/gameStore';
import { useShallow } from 'zustand/react/shallow';
import { ROSTER_MAP, ModelCategory } from '@/game/data/UnitRoster';
import { getSoldierAssets, getMageAssets, SoldierAssets } from '@/game/assets/ToonRTSManifest';
import { SelectionRing, BaseFallback } from './CharacterBase';

// ── Formation helpers ─────────────────────────────────────────────────────────

/** Returns world-space [x,y,z] for each slot in a formation grid. */
function formationSlots(
  cx: number, cz: number,
  rows: number, cols: number,
  spacing: number,
  facing: number,   // Y rotation in radians
): [number, number, number][] {
  const out: [number, number, number][] = [];
  const cosF = Math.cos(facing);
  const sinF = Math.sin(facing);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lx = (c - (cols - 1) / 2) * spacing;
      const lz = (r - (rows - 1) / 2) * spacing;
      // Rotate local offset by facing
      const wx = cx + cosF * lx - sinF * lz;
      const wz = cz + sinF * lx + cosF * lz;
      out.push([wx, 0, wz]);
    }
  }
  return out;
}

/** Map UnitType → ModelCategory (for asset lookup). */
function modelCat(type: UnitData['type']): ModelCategory {
  if (type === 'cavalry' || type === 'heavyCavalry') return 'cavalry';
  if (type === 'catapult') return 'catapult';
  if (type === 'boltThrower') return 'boltThrower';
  return 'infantry';
}

/** Stable getter for soldier assets — called at component top, not in hooks. */
function getAssets(unit: UnitData): SoldierAssets {
  if (unit.type === 'mage') return getMageAssets(unit.race);
  return getSoldierAssets(unit.race, modelCat(unit.type));
}

// ── Team toon colours ─────────────────────────────────────────────────────────
const TEAM_COLOR: Record<1 | 2, string> = {
  1: '#4488ff',
  2: '#ff4444',
};

// ── Single animated soldier (suspends while loading) ─────────────────────────

interface SoldierProps {
  assets: SoldierAssets;
  unitState: UnitData['state'];
  position: [number, number, number];
  facing: number;
  teamId: 1 | 2;
}

function ToonRTSSoldierInner({ assets, unitState, position, facing, teamId }: SoldierProps) {
  // All 6 useFBX calls — cached by URL, so N soldiers only load each path once.
  const modelFBX = useFBX(assets.modelPath);
  const idleFBX  = useFBX(assets.idlePath);
  const runFBX   = useFBX(assets.runPath);
  const atk1FBX  = useFBX(assets.attack1Path);
  const atk2FBX  = useFBX(assets.attack2Path);
  const dieFBX   = useFBX(assets.deathPath);

  // Clone per instance so each soldier has its own independent skeleton
  const scene = useMemo(() => {
    const cloned = SkeletonUtils.clone(modelFBX) as THREE.Group;
    cloned.scale.setScalar(assets.scale);
    const color = new THREE.Color(TEAM_COLOR[teamId]);
    cloned.traverse(child => {
      const mesh = child as THREE.SkinnedMesh;
      if (mesh.isSkinnedMesh) {
        mesh.material = new THREE.MeshToonMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.05,
        });
        mesh.castShadow = true;
        mesh.receiveShadow = false;
      }
    });
    return cloned;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelFBX, assets.modelPath, assets.scale, teamId]);

  // Mixer lives for the lifetime of this component
  const mixerRef      = useRef<THREE.AnimationMixer | null>(null);
  const curActionRef  = useRef<THREE.AnimationAction | null>(null);
  const atkPhaseRef   = useRef(0); // alternates 0/1 for two attack anims
  const opacityRef    = useRef(1);
  const groupRef      = useRef<THREE.Group>(null);

  // Build mixer + action map once when scene/clips are ready
  useEffect(() => {
    const mixer = new THREE.AnimationMixer(scene);
    mixerRef.current = mixer;

    const actions: Record<string, THREE.AnimationAction | undefined> = {};
    const addClip = (name: string, fbx: THREE.Group) => {
      const clip = fbx.animations[0];
      if (clip) actions[name] = mixer.clipAction(clip);
    };
    addClip('idle',    idleFBX);
    addClip('run',     runFBX);
    addClip('attack1', atk1FBX);
    addClip('attack2', atk2FBX);
    addClip('die',     dieFBX);

    // Start idle
    const idleA = actions['idle'] ?? Object.values(actions).find(Boolean);
    if (idleA) {
      idleA.setLoop(THREE.LoopRepeat, Infinity).play();
      curActionRef.current = idleA;
    }

    // Store actions on mixer for state changes
    (mixer as any).__actions = actions;

    return () => { mixer.stopAllAction(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  // Drive animations from unitState
  useEffect(() => {
    const mixer = mixerRef.current;
    if (!mixer) return;
    const actions = (mixer as any).__actions as Record<string, THREE.AnimationAction | undefined>;
    if (!actions) return;

    let clipName: string;
    if (unitState === 'move') {
      clipName = 'run';
    } else if (unitState === 'attack') {
      atkPhaseRef.current = 1 - atkPhaseRef.current;
      clipName = atkPhaseRef.current === 0 ? 'attack1' : 'attack2';
    } else if (unitState === 'dead') {
      clipName = 'die';
    } else {
      clipName = 'idle';
    }

    const next = actions[clipName] ?? actions['idle'] ?? Object.values(actions).find(Boolean);
    if (!next || next === curActionRef.current) return;

    next.reset().setLoop(
      unitState === 'dead' ? THREE.LoopOnce : THREE.LoopRepeat,
      unitState === 'dead' ? 1 : Infinity,
    );
    if (curActionRef.current) curActionRef.current.crossFadeTo(next, 0.2, true);
    next.play();
    curActionRef.current = next;
  }, [unitState]);

  useFrame((_state, delta) => {
    mixerRef.current?.update(delta);
    if (!groupRef.current) return;

    // Fade-out on death
    if (unitState === 'dead') {
      opacityRef.current = Math.max(0, opacityRef.current - delta * 0.6);
      groupRef.current.traverse(child => {
        const mesh = child as THREE.SkinnedMesh;
        if (mesh.isSkinnedMesh) {
          const mat = mesh.material as THREE.MeshToonMaterial;
          mat.transparent = true;
          mat.opacity = opacityRef.current;
        }
      });
      if (opacityRef.current <= 0) groupRef.current.visible = false;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, facing, 0]}>
      <primitive object={scene} />
    </group>
  );
}

// ── Per-soldier wrapper with Suspense ─────────────────────────────────────────

function ToonRTSSoldier(props: SoldierProps) {
  return (
    <Suspense
      fallback={
        <group position={props.position}>
          <BaseFallback color={TEAM_COLOR[props.teamId]} />
        </group>
      }
    >
      <ToonRTSSoldierInner {...props} />
    </Suspense>
  );
}

// ── Regiment (one UnitData → N soldiers in formation) ────────────────────────

export function ToonRTSRegiment({ unit, isSelected }: { unit: UnitData; isSelected: boolean }) {
  // Compute alive soldiers from health ratio
  const aliveSoldiers = unit.state === 'dead'
    ? 0
    : Math.max(1, Math.ceil((unit.health / unit.maxHealth) * unit.maxSoldiers));

  const assets   = useMemo(() => getAssets(unit), [unit.race, unit.type]); // eslint-disable-line react-hooks/exhaustive-deps
  const rosterDef = ROSTER_MAP[unit.type];

  // All formation slots (stable across renders if position/facing unchanged)
  const slots = useMemo(
    () =>
      formationSlots(
        unit.position[0], unit.position[2],
        unit.formationRows, unit.formationCols,
        unit.spacing,
        unit.formationFacing,
      ).slice(0, aliveSoldiers),
    // Recompute when regiment center moves or soldier count changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unit.position[0], unit.position[2], unit.formationFacing, aliveSoldiers],
  );

  // Selection ring radius scales with formation width
  const ringRadius = ((unit.formationCols - 1) * unit.spacing) / 2 + 1.2;

  return (
    <group name={`regiment-${unit.id}`}>
      {slots.map((pos, i) => (
        <ToonRTSSoldier
          key={i}
          assets={assets}
          unitState={unit.state}
          position={pos}
          facing={unit.formationFacing}
          teamId={unit.teamId}
        />
      ))}
      <SelectionRing
        visible={isSelected}
        radius={ringRadius}
      />
    </group>
  );
}

// ── BattleArmy — renders all regiments for all teams ─────────────────────────

export function BattleArmy() {
  const units = useGameStore(
    useShallow(state => state.units.filter(u => u.state !== 'dead' || u.health > 0)),
  );
  const selectedUnitIds = useGameStore(useShallow(s => s.selectedUnitIds));

  return (
    <group name="battle-army">
      {units.map(unit => (
        <ToonRTSRegiment
          key={unit.id}
          unit={unit}
          isSelected={selectedUnitIds.includes(unit.id)}
        />
      ))}
    </group>
  );
}
