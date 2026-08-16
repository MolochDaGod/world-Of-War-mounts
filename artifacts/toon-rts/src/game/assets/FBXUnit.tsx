/**
 * FBXUnit — loads a race's character or cavalry FBX with its TGA texture,
 * clones the scene graph for each unit instance, and applies:
 *   - TGA texture map
 *   - Team colour tint via a secondary Lambert material on helmet/shield meshes
 *   - AnimationMixer bound to idle / walk / attack clips from the FBX
 *   - castShadow / receiveShadow on every mesh
 *
 * Accepts `unitId` (not the full UnitData) so UnitManager can subscribe to a
 * stable ID list and avoid 30Hz re-renders of the entire Canvas unit tree.
 * Dynamic data (position, targetPosition) is read from getState() inside useFrame.
 * Only `unitState` and `health` are subscribed reactively — they only change on
 * meaningful game events (state transitions, taking damage), not every position tick.
 */
import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { useFBX } from '@react-three/drei';
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader.js';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

interface FBXUnitProps {
  unitId: string;
  fbxPath: string;
  texturePath: string;
  teamColor: THREE.Color;
  onSelect: () => void;
}

// Material cache — reuse across instances sharing the same texture
const matCache = new Map<string, THREE.MeshLambertMaterial>();

function getMaterial(texturePath: string, texture: THREE.Texture) {
  if (!matCache.has(texturePath)) {
    const mat = new THREE.MeshLambertMaterial({ map: texture });
    mat.map!.colorSpace = THREE.SRGBColorSpace;
    matCache.set(texturePath, mat);
  }
  return matCache.get(texturePath)!;
}

export function FBXUnit({ unitId, fbxPath, texturePath, teamColor, onSelect }: FBXUnitProps) {
  const groupRef  = useRef<THREE.Group>(null);
  const mixerRef  = useRef<THREE.AnimationMixer | null>(null);

  // ── Reactive subscriptions (primitive selectors — only fire on real game events) ──
  // Unit position is NOT subscribed here; it is read from getState() inside useFrame.
  const unitState = useGameStore(s => s.units.find(u => u.id === unitId)?.state ?? 'idle');
  const health    = useGameStore(s => s.units.find(u => u.id === unitId)?.health ?? 0);
  const maxHealth = useGameStore(s => s.units.find(u => u.id === unitId)?.maxHealth ?? 100);
  const isSelected = useGameStore(s => s.selectedUnitIds.includes(unitId));

  // Load FBX — cached globally by drei (only parsed once per path)
  const fbxSource = useFBX(fbxPath);

  // Load TGA texture — cached by R3F useLoader
  const texture = useLoader(TGALoader, texturePath);

  const baseMat  = useMemo(() => getMaterial(texturePath, texture), [texturePath, texture]);
  const teamMat  = useMemo(() => new THREE.MeshLambertMaterial({ color: teamColor }), [teamColor]);
  const ringMat  = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#f5a623', transparent: true, opacity: 0.85, depthWrite: false,
  }), []);

  // Clone the FBX scene once per unit — full deep clone including SkinnedMesh + Skeleton
  const cloned = useMemo(() => {
    const c = fbxSource.clone(true);

    const boneMap = new Map<string, THREE.Bone>();
    c.traverse((n) => {
      if (n instanceof THREE.Bone) boneMap.set(n.name, n);
    });
    c.traverse((n) => {
      if (n instanceof THREE.SkinnedMesh) {
        n.castShadow     = true;
        n.receiveShadow  = true;
        n.material       = baseMat.clone();
        if (n.skeleton) {
          const newBones = n.skeleton.bones.map(b => boneMap.get(b.name) ?? b);
          n.skeleton      = new THREE.Skeleton(newBones, n.skeleton.boneInverses);
          n.bind(n.skeleton, n.bindMatrix);
        }
      } else if (n instanceof THREE.Mesh) {
        n.castShadow    = true;
        n.receiveShadow = true;
        n.material      = baseMat.clone();
      }
    });

    // Scale down from artist units (FBX typically in cm → metres)
    c.scale.setScalar(0.012);

    return c;
  }, [fbxSource, baseMat]);

  // Animation mixer — bind once cloned scene is ready
  useEffect(() => {
    const clips = fbxSource.animations;
    if (!clips || clips.length === 0) return;

    const mixer = new THREE.AnimationMixer(cloned);
    mixerRef.current = mixer;

    const play = (nameHint: string, fallbackIdx = 0) => {
      const clip = clips.find(c =>
        c.name.toLowerCase().includes(nameHint),
      ) ?? clips[fallbackIdx];
      if (clip) {
        const action = mixer.clipAction(clip);
        action.reset().play();
        return action;
      }
      return null;
    };

    play('idle', 0);

    return () => { mixer.stopAllAction(); mixerRef.current = null; };
  }, [cloned, fbxSource.animations]);

  // Switch animations when unit state changes — fires only on state transitions, not per-frame
  const prevState = useRef<string>('');
  useEffect(() => {
    const mixer = mixerRef.current;
    const clips = fbxSource.animations;
    if (!mixer || !clips?.length) return;
    if (prevState.current === unitState) return;
    prevState.current = unitState;

    mixer.stopAllAction();
    const hint = unitState === 'move'   ? 'run'
               : unitState === 'attack' ? 'attack'
               : unitState === 'dead'   ? 'death'
               : 'idle';
    const clip = clips.find(c => c.name.toLowerCase().includes(hint)) ?? clips[0];
    if (clip) {
      const action = mixer.clipAction(clip);
      action.reset();
      if (unitState === 'dead') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      action.play();
    }
  }, [unitState, fbxSource.animations]);

  // Per-frame: lerp position, face target, advance mixer.
  // Position is read from getState() — NO React subscription, no cascade.
  useFrame((_, delta) => {
    const grp = groupRef.current;
    if (!grp) return;

    const unit = useGameStore.getState().units.find(u => u.id === unitId);
    if (!unit) return;

    const [tx, , tz] = unit.position;
    grp.position.x += (tx - grp.position.x) * 0.18;
    grp.position.z += (tz - grp.position.z) * 0.18;

    if (unit.state === 'move' && unit.targetPosition) {
      const dx = unit.targetPosition[0] - grp.position.x;
      const dz = unit.targetPosition[2] - grp.position.z;
      if (Math.abs(dx) + Math.abs(dz) > 0.05) {
        const angle = Math.atan2(dx, dz);
        grp.rotation.y += (angle - grp.rotation.y) * 0.2;
      }
    }

    if (unit.state === 'dead') {
      grp.rotation.x += 0.025;
      grp.scale.y = Math.max(0.001, grp.scale.y - 0.015);
    }

    mixerRef.current?.update(delta);
  });

  // Set initial position once on mount
  useEffect(() => {
    const unit = useGameStore.getState().units.find(u => u.id === unitId);
    if (groupRef.current && unit) {
      groupRef.current.position.set(unit.position[0], 0, unit.position[2]);
    }
  }, []); // eslint-disable-line

  const hpPct   = maxHealth > 0 ? health / maxHealth : 0;
  const hpColor = hpPct > 0.6 ? '#22c55e' : hpPct > 0.3 ? '#eab308' : '#ef4444';

  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {/* Actual FBX model */}
      <primitive object={cloned} />

      {/* Team colour flag above unit */}
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[0.18, 0.5, 0.08]} />
        <meshLambertMaterial color={teamColor} emissive={teamColor} emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 2.62, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.2, 4]} />
        <meshLambertMaterial color="#8b6914" />
      </mesh>

      {/* Selection ring on ground */}
      {isSelected && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.95, 32]} />
          <primitive object={ringMat} />
        </mesh>
      )}

      {/* HP bar (plane geometry — no HTML overhead) */}
      {unitState !== 'dead' && (
        <mesh position={[0, 2.8, 0]}>
          <planeGeometry args={[0.8, 0.09]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.5} depthTest={false} />
        </mesh>
      )}
      {unitState !== 'dead' && (
        <mesh position={[-0.4 + (hpPct * 0.4), 2.8, 0.01]}>
          <planeGeometry args={[0.8 * hpPct, 0.07]} />
          <meshBasicMaterial color={hpColor} depthTest={false} />
        </mesh>
      )}
    </group>
  );
}
