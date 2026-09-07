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
import { useFBX, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useGameStore, UnitData } from '@/game/store/gameStore';
import { useShallow } from 'zustand/react/shallow';
import { ROSTER_MAP, ModelCategory } from '@/game/data/UnitRoster';
import { getSoldierAssets, getMageAssets, SoldierAssets } from '@/game/assets/ToonRTSManifest';
import { getVariantSet, getShowSet, getEquipmentList, EQUIPMENT_GLB } from '@/game/data/UnitMeshConfig';
import { SelectionRing, BaseFallback } from './CharacterBase';
import { RegimentLabel } from './RegimentLabel';
import { COMMANDER_BY_ID } from '@/game/data/CommanderDefs';
import { GrieeGleeRegiment }      from './GrieeGleeRegiment';
import { SkeletonWarriorRegiment } from './SkeletonWarriorRegiment';
import { HeroCommanderMesh }       from './HeroCommanderMesh';
import { CaptainJohnWayneMesh }    from './CaptainJohnWayneMesh';
import { PirateKingMesh }          from './PirateKingMesh';
import { ScourgeFaithBearerMesh }  from './ScourgeFaithBearerMesh';
import { reportModelDiagnostic } from '@/game/diagnostics/modelDiagnostics';

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

function captainPreviewClip(clip?: string): 'idle' | 'run' | 'attack' | 'charge' | 'dead' | undefined {
  if (clip === 'attack1' || clip === 'attack2') return 'attack';
  if (clip === 'idle' || clip === 'run' || clip === 'attack' || clip === 'charge' || clip === 'dead') return clip;
  if (clip === 'die') return 'dead';
  return undefined;
}

function scourgePreviewClip(clip?: string): 'idle' | 'run' | 'attack' | 'slam' | 'dead' | undefined {
  if (clip === 'attack1' || clip === 'attack2') return 'attack';
  if (clip === 'idle' || clip === 'run' || clip === 'attack' || clip === 'slam' || clip === 'dead') return clip;
  if (clip === 'die') return 'dead';
  return undefined;
}

// ── Team toon colours ─────────────────────────────────────────────────────────
const TEAM_COLOR: Record<1 | 2, string> = {
  1: '#4488ff',
  2: '#ff4444',
};

// ── Equipment GLB helpers ─────────────────────────────────────────────────────

/**
 * Bones a rigid equipment mesh may hang from. Only meshes whose immediate
 * GLB parent is one of these containers are classified as attachable
 * equipment — body/arms/head/legs variants stay FBX-side skinned meshes.
 */
const EQUIPMENT_CONTAINERS = new Set([
  'R_hand_container', 'L_hand_container', 'L_shield_container',
  'Quiver_container', 'Bone_wood', 'Bone_bag',
]);

const EQUIP_BONE_ALIASES: Record<string, string[]> = {
  R_hand_container: ['R_hand_container', 'Bone_R_weapon', 'Bip001 R Hand', 'Bip001_R_Hand'],
  L_hand_container: ['L_hand_container', 'Bone_L_weapon', 'Bip001 L Hand', 'Bip001_L_Hand'],
  L_shield_container: ['L_shield_container', 'Bone_L_shield', 'Bip001 L Hand', 'Bip001_L_Hand'],
  Quiver_container: ['Quiver_container', 'Bip001 Spine2', 'Bip001_Spine2'],
  Bone_wood: ['Bone_wood', 'Bip001 Spine1'],
  Bone_bag: ['Bone_bag', 'Bip001 Spine'],
};

function findEquipBone(root: THREE.Object3D, containerName: string): THREE.Object3D | null {
  const aliases = EQUIP_BONE_ALIASES[containerName] ?? [containerName];
  for (const name of aliases) {
    const hit = root.getObjectByName(name);
    if (hit) return hit;
  }
  const want = containerName.toLowerCase();
  let found: THREE.Object3D | null = null;
  root.traverse(obj => {
    if (found) return;
    if (obj.name.toLowerCase() === want) found = obj;
  });
  return found;
}

function bindAnimAction(
  mixer: THREE.AnimationMixer,
  target: THREE.Object3D,
  animFbx: THREE.Group,
): THREE.AnimationAction | undefined {
  const src = animFbx.animations[0];
  if (!src) return undefined;
  const bones = new Set<string>();
  target.traverse(obj => {
    if ((obj as THREE.Bone).isBone) bones.add(obj.name);
  });
  let clip = src.clone();
  try {
    clip = SkeletonUtils.retargetClip(target, animFbx, src);
  } catch {
    clip = src.clone();
  }
  clip.tracks = clip.tracks.filter(track => {
    if (/\.position$/.test(track.name)) return false;
    const bone = track.name.split('.')[0];
    return bones.size === 0 || bones.has(bone);
  });
  if (clip.tracks.length === 0) return mixer.clipAction(src);
  return mixer.clipAction(clip);
}

/**
 * Case-insensitive index of named equipment meshes inside an equipment GLB
 * scene. Cached per GLB scene (useGLTF caches by URL, so one map per race).
 */
const _equipIndexCache = new WeakMap<THREE.Object3D, Map<string, THREE.Mesh>>();

function getEquipIndex(glbScene: THREE.Object3D): Map<string, THREE.Mesh> {
  let idx = _equipIndexCache.get(glbScene);
  if (!idx) {
    idx = new Map();
    glbScene.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      // Only rigid (non-skinned) meshes under a known container bone
      if (
        mesh.isMesh &&
        !(mesh as THREE.SkinnedMesh).isSkinnedMesh &&
        mesh.parent && EQUIPMENT_CONTAINERS.has(mesh.parent.name)
      ) {
        idx!.set(mesh.name.toLowerCase(), mesh);
      }
    });
    _equipIndexCache.set(glbScene, idx);
  }
  return idx;
}

/**
 * GLB equipment is authored in metres; the character FBX rigs are in inches
 * (verified: identical body meshes measure 39.37× larger in the FBX than the
 * GLB, and the container bones carry world scale 1). Attached equipment must
 * be converted metres → inches to match the skeleton's space.
 */
const EQUIPMENT_TO_FBX_SCALE = 39.3701;

/**
 * Clones an equipment mesh from the GLB and attaches it to the bone of the
 * soldier skeleton matching the mesh's parent container in the GLB
 * (e.g. R_hand_container, L_shield_container, Quiver_container).
 */
function attachEquipment(
  soldierRoot: THREE.Object3D,
  source: THREE.Mesh,
  material: THREE.Material,
): boolean {
  const containerName = source.parent?.name;
  if (!containerName) return false;
  const bone = findEquipBone(soldierRoot, containerName);
  if (!bone) return false;

  const clone = source.clone();
  clone.position.copy(source.position).multiplyScalar(EQUIPMENT_TO_FBX_SCALE);
  clone.quaternion.copy(source.quaternion);
  clone.scale.copy(source.scale).multiplyScalar(EQUIPMENT_TO_FBX_SCALE);
  clone.material = material;
  clone.castShadow = true;
  clone.receiveShadow = false;
  bone.add(clone);
  return true;
}

/** Plant the kit so bone-box min.y is 0 — not pelvis, not unskinned AABB. */
function groundClonedToFeet(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const wp = new THREE.Vector3();
  let bones = 0;
  root.traverse(obj => {
    if ((obj as THREE.Bone).isBone) {
      obj.getWorldPosition(wp);
      box.expandByPoint(wp);
      bones++;
    }
  });
  if (bones < 2) box.setFromObject(root);
  if (!Number.isFinite(box.min.y)) return;
  root.position.y -= box.min.y;
}

// ── Single animated soldier (suspends while loading) ─────────────────────────

// ── Commander gold colours ─────────────────────────────────────────────────────
const COMMANDER_COLOR = '#ffd700';
const COMMANDER_EMISSIVE = '#cc8800';

interface SoldierProps {
  assets: SoldierAssets;
  unitState: UnitData['state'];
  /** Director-mode clip override; battle remains driven by UnitState. */
  previewClip?: 'idle' | 'run' | 'attack1' | 'attack2' | 'die';
  /** Play a single take and retain its final pose. */
  previewOneShot?: boolean;
  /** Keep a death take visible rather than fading the actor out. */
  preserveOnDeath?: boolean;
  position: [number, number, number];
  facing: number;
  teamId: 1 | 2;
  race: UnitData['race'];
  unitType: UnitData['type'];
  isCommander?: boolean;
  commanderArchetype?: string;
}

function ToonRTSSoldierInner({
  assets, unitState, previewClip, previewOneShot, preserveOnDeath,
  position, facing, teamId, race, unitType, isCommander, commanderArchetype,
}: SoldierProps) {
  // All 6 useFBX calls — cached by URL, so N soldiers only load each path once.
  const modelFBX = useFBX(assets.modelPath);
  const idleFBX  = useFBX(assets.idlePath);
  const runFBX   = useFBX(assets.runPath);
  const atk1FBX  = useFBX(assets.attack1Path);
  const atk2FBX  = useFBX(assets.attack2Path);
  const dieFBX   = useFBX(assets.deathPath);

  // Race-specific equipment GLB — cached by URL, shared across all soldiers
  const equipGLTF = useGLTF(EQUIPMENT_GLB[race]);

  // Clone per instance so each soldier has its own independent skeleton
  const scene = useMemo(() => {
    const cloned = SkeletonUtils.clone(modelFBX) as THREE.Group;
    // Commander is 1.5× the normal scale
    cloned.scale.setScalar(isCommander ? assets.scale * 1.5 : assets.scale);

    // Mesh customisation: show only the variant meshes for this unit type
    const variantSet = getVariantSet(race);
    // Commander uses its own curated mesh set; others use UnitMeshConfig
    const cmdDef = isCommander && commanderArchetype ? COMMANDER_BY_ID[commanderArchetype] : null;

    // Split requested meshes: names present in the equipment GLB get
    // bone-attached; the rest are skinned body parts shown on the FBX.
    const equipIndex = getEquipIndex(equipGLTF.scene);
    const requested: readonly string[] = cmdDef ? cmdDef.meshShow : [];
    const equipNames: string[] = cmdDef
      ? requested.filter(n => equipIndex.has(n.toLowerCase()))
      : [...getEquipmentList(race, unitType)];
    const showSet = cmdDef
      ? new Set(requested.filter(n => !equipIndex.has(n.toLowerCase())))
      : getShowSet(race, unitType);

    const color = isCommander
      ? new THREE.Color(COMMANDER_COLOR)
      : new THREE.Color(TEAM_COLOR[teamId]);
    const emissive = isCommander
      ? new THREE.Color(COMMANDER_EMISSIVE)
      : color;

    cloned.traverse(child => {
      const mesh = child as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;

      // Hide variant meshes that are not selected for this unit type
      if (variantSet.has(mesh.name)) {
        mesh.visible = showSet.has(mesh.name);
      }

      // Keep authored TGA/atlas maps; only tint when the mesh has no bake.
      if (mesh.visible) {
        const prev = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
        const src = Array.isArray(prev) ? prev[0] : prev;
        const map = src && 'map' in src ? src.map : null;
        if (map) {
          map.colorSpace = THREE.SRGBColorSpace;
          map.needsUpdate = true;
        }
        mesh.material = new THREE.MeshToonMaterial({
          map: map ?? undefined,
          color: map ? '#ffffff' : color,
          emissive,
          emissiveIntensity: isCommander ? 0.18 : 0.05,
        });
        mesh.castShadow = true;
        mesh.receiveShadow = false;
      }
    });

    // Attach GLB equipment (weapons/shields/quivers) to skeleton bones
    for (const name of equipNames) {
      const source = equipIndex.get(name.toLowerCase());
      if (!source) continue;
      const srcMat = source.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
      const srcOne = Array.isArray(srcMat) ? srcMat[0] : srcMat;
      const equipMap = srcOne && 'map' in srcOne ? srcOne.map : null;
      if (equipMap) {
        equipMap.colorSpace = THREE.SRGBColorSpace;
        equipMap.needsUpdate = true;
      }
      attachEquipment(cloned, source, new THREE.MeshToonMaterial({
        map: equipMap ?? undefined,
        color: equipMap ? '#ffffff' : color,
        emissive,
        emissiveIntensity: isCommander ? 0.18 : 0.05,
      }));
    }

    groundClonedToFeet(cloned);
    return cloned;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelFBX, equipGLTF, assets.modelPath, assets.scale, teamId, race, unitType, isCommander, commanderArchetype]);

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
      const action = bindAnimAction(mixer, scene, fbx);
      if (action) actions[name] = action;
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

  // Asset failures should never silently look like a broken soldier. These
  // checks do not interrupt the fallback renderer or animation mixer.
  useEffect(() => {
    let skinnedMeshes = 0;
    const bones = new Set<string>();
    scene.traverse(object => {
      if ((object as THREE.SkinnedMesh).isSkinnedMesh) skinnedMeshes++;
      if ((object as THREE.Bone).isBone) bones.add(object.name);
    });
    const assetKey = `${race}/${unitType}/${assets.modelPath}`;
    if (skinnedMeshes === 0) {
      reportModelDiagnostic(`fbx-skinned:${assetKey}`, `${assetKey} has no skinned mesh; using the visible fallback if needed.`);
    }
    if (bones.size === 0) {
      reportModelDiagnostic(`fbx-bones:${assetKey}`, `${assetKey} has no skeleton bones; FBX animation clips cannot bind.`);
    }

    const clips = [
      ['idle', idleFBX], ['run', runFBX], ['attack1', atk1FBX], ['attack2', atk2FBX], ['death', dieFBX],
    ] as const;
    for (const [name, fbx] of clips) {
      if (!fbx.animations[0]) {
        reportModelDiagnostic(`fbx-clip:${assetKey}:${name}`, `${assetKey} is missing its ${name} animation clip.`);
      }
    }

    const equipment = getEquipIndex(equipGLTF.scene);
    const commander = isCommander && commanderArchetype ? COMMANDER_BY_ID[commanderArchetype] : undefined;
    const requested = commander?.meshShow ?? getEquipmentList(race, unitType);
    for (const meshName of requested) {
      const source = equipment.get(meshName.toLowerCase());
      if (source?.parent?.name && !bones.has(source.parent.name)) {
        reportModelDiagnostic(
          `fbx-equipment:${assetKey}:${meshName}`,
          `${assetKey} cannot attach ${meshName}: skeleton is missing ${source.parent.name}.`,
        );
      }
    }
  }, [
    scene, assets.modelPath, race, unitType, isCommander, commanderArchetype,
    idleFBX, runFBX, atk1FBX, atk2FBX, dieFBX, equipGLTF,
  ]);

  // Drive animations from unitState
  useEffect(() => {
    const mixer = mixerRef.current;
    if (!mixer) return;
    const actions = (mixer as any).__actions as Record<string, THREE.AnimationAction | undefined>;
    if (!actions) return;

    let clipName: string;
    if (previewClip) {
      clipName = previewClip;
    } else if (unitState === 'move') {
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

    const loop = !previewOneShot && unitState !== 'dead';
    next.reset().setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    next.clampWhenFinished = !loop;
    if (curActionRef.current) curActionRef.current.crossFadeTo(next, 0.2, true);
    next.play();
    curActionRef.current = next;
  }, [unitState, previewClip, previewOneShot]);

  useFrame((_state, delta) => {
    mixerRef.current?.update(delta);
    scene.traverse(obj => {
      const skinned = obj as THREE.SkinnedMesh;
      if (skinned.isSkinnedMesh && skinned.skeleton) skinned.skeleton.update();
    });
    if (!groupRef.current) return;

    // Fade-out on death
    if (unitState === 'dead' && !preserveOnDeath) {
      opacityRef.current = Math.max(0, opacityRef.current - delta * 0.6);
      groupRef.current.traverse(child => {
        const mesh = child as THREE.Mesh;
        // Includes both skinned body parts and bone-attached equipment
        if (mesh.isMesh) {
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
          <BaseFallback color={props.isCommander ? COMMANDER_COLOR : TEAM_COLOR[props.teamId]} />
        </group>
      }
    >
      <ToonRTSSoldierInner {...props} />
    </Suspense>
  );
}

// ── Regiment (one UnitData → N soldiers in formation) ────────────────────────

export function ToonRTSRegiment({
  unit,
  isSelected,
  previewClip,
  previewOneShot,
  preserveOnDeath,
  showLabel = true,
  useHeroModel = true,
}: {
  unit: UnitData;
  isSelected: boolean;
  /** May be a dedicated hero clip name; normal soldiers only use the standard names. */
  previewClip?: string;
  previewOneShot?: boolean;
  preserveOnDeath?: boolean;
  showLabel?: boolean;
  useHeroModel?: boolean;
}) {
  const isCommander = !!(unit as any).isCommander;
  const commanderArchetype: string | undefined = (unit as any).commanderArchetype;

  // Compute alive soldiers from health ratio
  const aliveSoldiers = unit.state === 'dead' && !preserveOnDeath
    ? 0
    : isCommander ? 1
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
    [
      unit.position[0],
      unit.position[2],
      unit.formationRows,
      unit.formationCols,
      unit.spacing,
      unit.formationFacing,
      aliveSoldiers,
    ],
  );

  // Selection ring radius scales with formation width
  const ringRadius = ((unit.formationCols - 1) * unit.spacing) / 2 + 1.2;

  // Invisible click hitbox — covers the formation footprint for LMB selection
  const hitW = (unit.formationCols - 1) * unit.spacing + 2;
  const hitD = (unit.formationRows - 1) * unit.spacing + 2;

  return (
    <group name={`regiment-${unit.id}`}>
      {/* Hit volume is visual-only. LMB/RMB selection is RTSInputController. */}
      <mesh
        position={[unit.position[0], 1.5, unit.position[2]]}
        visible={false}
      >
        <boxGeometry args={[hitW, 3, hitD]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {slots.map((pos, i) => {
        // Slot 0 of a commander regiment: render the unique hero model if defined
        if (i === 0 && isCommander && commanderArchetype) {
          const cmdDef = COMMANDER_BY_ID[commanderArchetype];
          // ── Dedicated animated-component heroes ──────────────────────────
          if (cmdDef?.heroComponentId === 'captain_john_wayne') {
            return (
              <Suspense
                key={`hero-${unit.id}`}
                fallback={
                  <group position={pos}>
                    <BaseFallback color={COMMANDER_COLOR} />
                  </group>
                }
              >
                <CaptainJohnWayneMesh
                  position={pos}
                  facing={unit.formationFacing}
                  unitState={unit.state}
                  previewClip={captainPreviewClip(previewClip)}
                />
              </Suspense>
            );
          }
          if (cmdDef?.heroComponentId === 'pirate_king') {
            return (
              <Suspense
                key={`hero-${unit.id}`}
                fallback={
                  <group position={pos}>
                    <BaseFallback color={COMMANDER_COLOR} />
                  </group>
                }
              >
                <PirateKingMesh
                  position={pos}
                  facing={unit.formationFacing}
                  unitState={unit.state}
                  previewClip={previewClip === 'attack1' || previewClip === 'attack2'
                    ? 'combo'
                    : previewClip === 'die' ? 'sit' : previewClip}
                />
              </Suspense>
            );
          }
          if (cmdDef?.heroComponentId === 'scourge_faith_bearer') {
            return (
              <Suspense
                key={`hero-${unit.id}`}
                fallback={
                  <group position={pos}>
                    <BaseFallback color={COMMANDER_COLOR} />
                  </group>
                }
              >
                <ScourgeFaithBearerMesh
                  position={pos}
                  facing={unit.formationFacing}
                  unitState={unit.state}
                  previewClip={scourgePreviewClip(previewClip)}
                />
              </Suspense>
            );
          }
          // ── Generic GLB / FBX hero (heroModelPath) ───────────────────────
          if (cmdDef?.heroModelPath && useHeroModel) {
            return (
              <Suspense
                key={`hero-${unit.id}`}
                fallback={
                  <group position={pos}>
                    <BaseFallback color={COMMANDER_COLOR} />
                  </group>
                }
              >
                <HeroCommanderMesh
                  modelPath={cmdDef.heroModelPath}
                  texturePath={cmdDef.heroTexturePath}
                  modelScale={cmdDef.heroModelScale ?? 0.012}
                  position={pos}
                  facing={unit.formationFacing}
                  teamId={unit.teamId}
                />
              </Suspense>
            );
          }
        }
        return (
          <ToonRTSSoldier
            key={i}
            assets={assets}
            unitState={unit.state}
            previewClip={previewClip === 'idle' || previewClip === 'run' || previewClip === 'attack1' || previewClip === 'attack2' || previewClip === 'die'
              ? previewClip
              : undefined}
            previewOneShot={previewOneShot}
            preserveOnDeath={preserveOnDeath}
            position={pos}
            facing={unit.formationFacing}
            teamId={unit.teamId}
            race={unit.race}
            unitType={unit.type}
            isCommander={isCommander && i === 0}
            commanderArchetype={commanderArchetype}
          />
        );
      })}

      {/* Commander: gold leadership ring always visible */}
      {isCommander && (
        <SelectionRing visible radius={ringRadius + 0.5} />
      )}
      <SelectionRing visible={isSelected} radius={ringRadius} />

      {/* Floating label — shows for all regiments except dead ones */}
      {showLabel && (
        <RegimentLabel
          unit={unit}
          aliveSoldiers={aliveSoldiers}
          labelHeight={isCommander ? 5.5 : 4}
        />
      )}
    </group>
  );
}

// ── BattleArmy — renders all regiments for all teams ─────────────────────────

// GLB-rendered unit types — bypass the FBX pipeline entirely
const GLB_UNIT_TYPES = new Set<string>(['grieeGlee', 'skeletonWarrior']);

export function BattleArmy() {
  const units = useGameStore(
    useShallow(state => state.units.filter(u => u.state !== 'dead' || u.health > 0)),
  );
  const selectedUnitIds = useGameStore(useShallow(s => s.selectedUnitIds));

  return (
    <group name="battle-army">
      {units.map(unit => {
        const sel = selectedUnitIds.includes(unit.id);
        if (unit.type === 'grieeGlee') {
          return <GrieeGleeRegiment key={unit.id} unit={unit} isSelected={sel} />;
        }
        if (unit.type === 'skeletonWarrior') {
          return <SkeletonWarriorRegiment key={unit.id} unit={unit} isSelected={sel} />;
        }
        return (
          <ToonRTSRegiment
            key={unit.id}
            unit={unit.type === 'meshyWarrior' ? { ...unit, type: 'swordsmen' } : unit}
            isSelected={sel}
          />
        );
      })}
    </group>
  );
}
