import { OrbitControls, Sparkles } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { UnitData, UnitState } from '@/game/store/gameStore';
import { ToonRTSRegiment } from '@/game/characters/ToonRTSRegiment';
import { MeshyWarriorRegiment } from '@/game/characters/MeshyWarriorRegiment';
import { SkeletonWarriorRegiment } from '@/game/characters/SkeletonWarriorRegiment';
import { GrieeGleeRegiment } from '@/game/characters/GrieeGleeRegiment';
import {
  SHOWCASE_RACE_COLORS,
  type ShowcaseProfile,
  type ShowcaseShot,
  type ShowcaseSubject,
} from './showcaseCatalog';

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

function DirectorCamera({ settings, profile }: { settings: DirectorSettings; profile: ShowcaseProfile }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const distance = Math.max(4.5, settings.cameraDistance);
    target.set(0, profile.targetHeight, 0);
    desired.set(distance * 0.56, settings.cameraHeight, distance);
    camera.position.lerp(desired, 0.07);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = profile.plinthRadius >= 4.5 ? 42 : 38;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(target);
  });

  return null;
}

function WarRoomStage({
  keyLight,
  accent,
  profile,
}: {
  keyLight: number;
  accent: string;
  profile: ShowcaseProfile;
}) {
  const aura = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!aura.current) return;
    const breathe = 1 + Math.sin(clock.elapsedTime * 0.65) * 0.025;
    aura.current.scale.setScalar(breathe);
    aura.current.rotation.z = clock.elapsedTime * 0.035;
  });

  return (
    <>
      <color attach="background" args={['#05070d']} />
      <fog attach="fog" args={['#05070d', 12, 38]} />
      <hemisphereLight args={['#627089', '#08070c', 1.15]} />
      <directionalLight
        castShadow
        position={[6, 12, 6]}
        intensity={keyLight}
        color="#f5e5cd"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <spotLight
        position={[-5.5, 6.5, 3.5]}
        color={accent}
        intensity={4.2}
        angle={0.48}
        penumbra={0.8}
        distance={18}
      />
      <pointLight position={[5.5, 3.8, -4.5]} color="#b8caff" intensity={2.7} distance={15} />

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[26, 128]} />
        <meshStandardMaterial color="#0a0e15" roughness={0.88} metalness={0.22} />
      </mesh>

      <mesh position={[0, 0.14, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[profile.plinthRadius, profile.plinthRadius * 1.08, 0.28, 96]} />
        <meshPhysicalMaterial color="#111827" metalness={0.78} roughness={0.24} clearcoat={0.85} />
      </mesh>
      <mesh ref={aura} position={[0, 0.292, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[profile.plinthRadius * 0.73, profile.plinthRadius * 0.76, 96]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.5} transparent opacity={0.92} />
      </mesh>
      <mesh position={[0, 0.298, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[profile.plinthRadius * 0.3, profile.plinthRadius * 0.31, 64]} />
        <meshStandardMaterial color="#e6d3ab" emissive="#e6d3ab" emissiveIntensity={1.2} transparent opacity={0.46} />
      </mesh>

      {([-1, 1] as const).map(side => (
        <group key={side} position={[side * 8.5, 0, -5.5]} rotation={[0, side * -0.32, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.4, 5.5, 1.4]} />
            <meshStandardMaterial color="#151b29" roughness={0.5} metalness={0.64} />
          </mesh>
          <mesh position={[0, 1.65, 0.72]}>
            <boxGeometry args={[0.12, 2.2, 0.04]} />
            <meshBasicMaterial color={accent} transparent opacity={0.58} />
          </mesh>
        </group>
      ))}
      <Sparkles count={76} scale={[18, 5.2, 13]} size={1.7} speed={0.12} opacity={0.3} color={accent} />
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
    const meshyClip = shot.id === 'walk' || shot.id === 'run' || shot.id === 'slash'
      || shot.id === 'counter' || shot.id === 'block' || shot.id === 'hook' || shot.id === 'idle'
      ? shot.id
      : 'idle';
    return (
      <MeshyWarriorRegiment
        key={key}
        unit={unit}
        isSelected={false}
        preserveOnDeath
        previewClip={meshyClip}
        previewOneShot={meshyClip !== 'idle' && meshyClip !== 'walk' && meshyClip !== 'run'}
        showLabel={false}
      />
    );
  }
  if (subject.kind === 'unit' && subject.unitType === 'skeletonWarrior') {
    return <SkeletonWarriorRegiment key={key} unit={unit} isSelected={false} preserveOnDeath showLabel={false} />;
  }
  if (subject.kind === 'unit' && subject.unitType === 'grieeGlee') {
    return <GrieeGleeRegiment key={key} unit={unit} isSelected={false} preserveOnDeath showLabel={false} />;
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

export function ShowcaseScene({ subject, shot, shotKey, settings, onCanvasReady }: ShowcaseSceneProps) {
  const accent = SHOWCASE_RACE_COLORS[subject.race];

  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 1.5]}
      camera={{ position: [7.5, 4.5, 12], fov: 38 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => onCanvasReady(gl.domElement)}
      onPointerMissed={() => undefined}
    >
      <WarRoomStage keyLight={settings.keyLight} accent={accent} profile={subject.profile} />
      <DirectorCamera settings={settings} profile={subject.profile} />
      <OrbitControls
        target={[0, subject.profile.targetHeight, 0]}
        enablePan={false}
        minDistance={Math.max(4.5, subject.profile.cameraDistance * 0.56)}
        maxDistance={subject.profile.cameraDistance + 16}
      />
      <Suspense fallback={null}>
        <group key={`${subject.id}:${shot.id}:${shotKey}`}>
          <SubjectActor subject={subject} shot={shot} />
        </group>
      </Suspense>
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={1.08} mipmapBlur intensity={0.66} />
        <Vignette eskil={false} offset={0.28} darkness={0.58} />
      </EffectComposer>
    </Canvas>
  );
}