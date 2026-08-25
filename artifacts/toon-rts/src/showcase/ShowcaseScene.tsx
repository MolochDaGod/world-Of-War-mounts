import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { UnitData, UnitState } from '@/game/store/gameStore';
import { ToonRTSRegiment } from '@/game/characters/ToonRTSRegiment';
import { MeshyWarriorRegiment } from '@/game/characters/MeshyWarriorRegiment';
import { SkeletonWarriorRegiment } from '@/game/characters/SkeletonWarriorRegiment';
import { GrieeGleeRegiment } from '@/game/characters/GrieeGleeRegiment';
import type { ShowcaseShot, ShowcaseSubject } from './showcaseCatalog';

export interface DirectorSettings {
  cameraDistance: number;
  cameraHeight: number;
  keyLight: number;
}

interface ShowcaseSceneProps {
  subject: ShowcaseSubject;
  shot: ShowcaseShot;
  shotKey: number;
  settings: DirectorSettings;
  onCanvasReady: (canvas: HTMLCanvasElement | null) => void;
}

const RACE_COLORS: Record<ShowcaseSubject['race'], string> = {
  WesternKingdoms: '#5ca8ff',
  Barbarians: '#f16b45',
  Elves: '#77d68e',
  Dwarves: '#e0a557',
  Orcs: '#83c95a',
  Undead: '#ca68d8',
};

const COVER_BLOCKS: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  [-7.6, 0.8, -5.2, 2.6, 1.6, 1.2],
  [7.8, 1.1, -3.8, 2.1, 2.2, 1.5],
  [-8.3, 0.55, 5.6, 2.2, 1.1, 1],
  [7.1, 0.65, 5.7, 2.5, 1.3, 1.1],
];

function DirectorCamera({ settings }: { settings: DirectorSettings }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(0, 1.45, 0), []);

  useFrame(() => {
    const distance = Math.max(4, settings.cameraDistance);
    const desired = new THREE.Vector3(distance * 0.62, settings.cameraHeight, distance);
    camera.position.lerp(desired, 0.07);
    camera.lookAt(target);
  });

  return null;
}

function BattleStage({ keyLight }: { keyLight: number }) {
  return (
    <>
      <color attach="background" args={['#080d16']} />
      <fog attach="fog" args={['#080d16', 13, 42]} />
      <hemisphereLight args={['#768bc6', '#100b08', 1.1]} />
      <directionalLight
        castShadow
        position={[7, 11, 5]}
        intensity={keyLight}
        color="#ffd49a"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-5, 3.5, 2]} color="#ff8142" intensity={4.5} distance={14} />
      <pointLight position={[6, 2.5, -4]} color="#6f8dff" intensity={3.2} distance={12} />

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[22, 96]} />
        <meshStandardMaterial color="#2e3a29" roughness={0.97} metalness={0} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]} receiveShadow>
        <ringGeometry args={[9.8, 10.1, 96]} />
        <meshStandardMaterial color="#b88957" roughness={0.96} />
      </mesh>

      {COVER_BLOCKS.map(([x, y, z, width, height, depth], index) => (
        <group key={index} position={[x, y, z]} rotation={[0, index % 2 ? 0.38 : -0.25, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color={index % 2 ? '#494747' : '#5a4f42'} roughness={0.94} />
          </mesh>
          <mesh position={[0, height / 2 + 0.15, 0]} castShadow>
            <cylinderGeometry args={[0.32, 0.44, 0.3, 6]} />
            <meshStandardMaterial color="#746753" roughness={1} />
          </mesh>
        </group>
      ))}

      <group position={[-4.8, 0, -3.4]}>
        <mesh castShadow><cylinderGeometry args={[0.18, 0.24, 3.3, 8]} /><meshStandardMaterial color="#382a1d" roughness={1} /></mesh>
        <mesh position={[0, 1.85, 0]}><sphereGeometry args={[0.3, 16, 12]} /><meshStandardMaterial color="#ffb14a" emissive="#ff4e1d" emissiveIntensity={3.2} /></mesh>
      </group>
      <group position={[5.8, 0, 3.2]}>
        <mesh castShadow><cylinderGeometry args={[0.16, 0.23, 2.8, 8]} /><meshStandardMaterial color="#382a1d" roughness={1} /></mesh>
        <mesh position={[0, 1.55, 0]}><sphereGeometry args={[0.27, 16, 12]} /><meshStandardMaterial color="#ffb14a" emissive="#ff4e1d" emissiveIntensity={3.2} /></mesh>
      </group>
    </>
  );
}

function subjectUnit(subject: ShowcaseSubject, shot: ShowcaseShot): UnitData {
  // Death clips need a live renderable actor; their animation is driven by the
  // explicit director clip below rather than RTS removal state.
  const isSpecialGlbUnit = subject.kind === 'unit'
    && (subject.unitType === 'meshyWarrior' || subject.unitType === 'skeletonWarrior' || subject.unitType === 'grieeGlee');
  const unitState: UnitState = shot.id === 'death' && !isSpecialGlbUnit ? 'idle' : shot.state;
  const commander = subject.commander;

  return {
    id: `showcase-${subject.id}`,
    uuid: `showcase-${subject.id}`,
    race: subject.race,
    type: subject.unitType,
    position: [0, 0, 0],
    health: 1000,
    maxHealth: 1000,
    state: unitState,
    teamId: 1,
    maxSoldiers: 1,
    formationRows: 1,
    formationCols: 1,
    formationFacing: 0,
    spacing: 1.2,
    isCommander: subject.kind === 'hero',
    commanderArchetype: commander?.id,
    commanderName: commander?.name,
  };
}

function SubjectActor({ subject, shot }: { subject: ShowcaseSubject; shot: ShowcaseShot }) {
  const unit = useMemo(() => subjectUnit(subject, shot), [subject, shot]);
  const key = `${subject.id}:${shot.id}`;
  const previewClip = shot.id === 'death'
    ? 'die'
    : shot.id === 'walk' && subject.commander?.heroComponentId !== 'pirate_king'
      ? 'run'
      : shot.id;

  if (subject.kind === 'unit' && subject.unitType === 'meshyWarrior') {
    return <MeshyWarriorRegiment key={key} unit={unit} isSelected={false} preserveOnDeath />;
  }
  if (subject.kind === 'unit' && subject.unitType === 'skeletonWarrior') {
    return <SkeletonWarriorRegiment key={key} unit={unit} isSelected={false} preserveOnDeath />;
  }
  if (subject.kind === 'unit' && subject.unitType === 'grieeGlee') {
    return <GrieeGleeRegiment key={key} unit={unit} isSelected={false} preserveOnDeath />;
  }

  return (
    <ToonRTSRegiment
      key={key}
      unit={unit}
      isSelected={false}
      previewClip={previewClip}
      previewOneShot={previewClip !== 'idle' && previewClip !== 'run'}
      showLabel={false}
      useHeroModel={Boolean(subject.commander?.heroModelPath)}
    />
  );
}

function AccentRing({ color }: { color: string }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ring.current) ring.current.rotation.z += delta * 0.18;
  });

  return (
    <mesh ref={ring} position={[0, 0.045, 0]} rotation-x={-Math.PI / 2}>
      <torusGeometry args={[1.45, 0.035, 8, 64]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} transparent opacity={0.86} />
    </mesh>
  );
}

export function ShowcaseScene({ subject, shot, shotKey, settings, onCanvasReady }: ShowcaseSceneProps) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 1.5]}
      camera={{ position: [7.5, 4.5, 12], fov: 38 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => onCanvasReady(gl.domElement)}
      onPointerMissed={() => undefined}
    >
      <BattleStage keyLight={settings.keyLight} />
      <DirectorCamera settings={settings} />
      <OrbitControls target={[0, 1.45, 0]} enablePan={false} minDistance={4} maxDistance={24} />
      <Suspense fallback={null}>
        <group key={`${subject.id}:${shot.id}:${shotKey}`}>
          <SubjectActor subject={subject} shot={shot} />
        </group>
      </Suspense>
      <AccentRing color={RACE_COLORS[subject.race]} />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={1.2} mipmapBlur intensity={0.75} />
        <Vignette eskil={false} offset={0.25} darkness={0.78} />
      </EffectComposer>
    </Canvas>
  );
}