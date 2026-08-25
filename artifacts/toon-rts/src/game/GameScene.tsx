/**
 * GameScene — R3F Canvas for Race Wars.
 *
 * Key changes in this revision:
 *  - AnimeWater removed (it covered the battlefield at y=-0.25).
 *  - OrcArmy + ElfArmy replaced by BattleArmy (Toon_RTS FBX regiments in formation).
 *  - ProjectileSystem added for arrow/bolt/stone/magic VFX.
 *  - Map usage expanded: armies now spawn from z=±20 to z=±50 (vs old z=±16-22).
 */
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense, useRef } from 'react';
import {
  AdaptiveDpr,
  AdaptiveEvents,
  PerformanceMonitor,
} from '@react-three/drei';
import { RTSCamera }       from './camera/RTSCamera';
import { OpenWorld }       from './world/OpenWorld';
import { GrassField }      from './world/GrassField';
import { WorldTrees }      from './world/WorldTrees';
import { WorldMountains }  from './world/WorldMountains';
import { ResourceNodes }   from './world/ResourceNodes';
import { WorldItems }      from './world/WorldItems';
import { WildAnimals }     from './wildlife/WildAnimals';
import { BattleArmy }      from './characters/ToonRTSRegiment';
import { MedievalNPCs }    from './characters/MedievalNPCs';
import { AbilityManager }  from './abilities/AbilityManager';
import { AimController }   from './abilities/AimController';
import { UnitAbilityVFX }  from './abilities/UnitAbilityVFX';
import { CombatSystem }    from './physics/CombatSystem';
import { ProjectileSystem } from './effects/ProjectileSystem';
import { MoveMarker }      from './effects/MoveMarker';
import { RTSInputController } from './input/RTSInputController';
import { BuildSystem }       from './building/BuildSystem';
import { PlacedBuildings }   from './building/PlacedBuildings';
import { RagdollSystem }     from './effects/RagdollSystem';
import { BattleVFXOverlay }  from './effects/BattleVFXOverlay';
import { ArenaWarzone }      from './world/ArenaWarzone';
import { WarZoneMap }        from './world/WarZoneMap';
import { useWorldStore }     from './store/worldStore';
import { useGameStore }      from './store/gameStore';
import { useFrame }        from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  Vignette,
  SMAA,
} from '@react-three/postprocessing';

/**
 * Day/night sky colour driven by worldStore timeOfDay.
 * Reads via getState() inside useFrame — no React subscription — to avoid
 * 60fps useSyncExternalStore cascades that cause "Maximum update depth exceeded".
 */
function WorldTick() {
  const tickTime = useWorldStore(s => s.tickTime);
  useFrame((state, delta) => {
    tickTime(delta);
    const timeOfDay = useWorldStore.getState().timeOfDay;
    const t = timeOfDay < 6 || timeOfDay >= 20
      ? 0    // night
      : timeOfDay < 8 || timeOfDay >= 18
        ? 0.5 // dawn/dusk
        : 1;  // day
    const bg = state.scene.background as THREE.Color | null;
    if (bg instanceof THREE.Color) {
      bg.setRGB(
        0.04 + 0.25 * t,
        0.05 + 0.45 * t,
        0.13 + 0.52 * t,
      );
    }
  });
  return null;
}

/**
 * Swaps sky colour, fog, and fill lights for arena mode.
 * Reads mapType via getState() inside useFrame to avoid cascade issues.
 */
function ArenaLighting() {
  useFrame(state => {
    const { mapType } = useGameStore.getState();
    const bg = state.scene.background as THREE.Color | null;
    if (!(bg instanceof THREE.Color)) return;
    if (mapType === 'arena') {
      bg.setRGB(0.06, 0.02, 0.02);   // deep crimson night
    }
    // battlefield colour is handled by WorldTick
  });
  return null;
}

/** Keeps the deployment clock outside the combat loop and avoids 60 Hz HUD writes. */
function PreparationClock() {
  const elapsedSinceTick = useRef(0);

  useFrame((_, delta) => {
    const { phase, preparationAssetsReady, tickPreparation } = useGameStore.getState();
    if (phase !== 'preparation' || !preparationAssetsReady) {
      elapsedSinceTick.current = 0;
      return;
    }
    elapsedSinceTick.current += Math.min(delta, 0.25);
    if (elapsedSinceTick.current >= 0.1) {
      tickPreparation(elapsedSinceTick.current);
      elapsedSinceTick.current = 0;
    }
  });

  return null;
}

/**
 * Conditionally renders the open-world terrain OR the arena GLB.
 * Also suppresses ambient NPCs / wildlife in arena mode.
 */
function MapAmbients() {
  const mapType = useGameStore(s => s.mapType);
  if (mapType === 'arena') return null;
  return (
    <>
      <MedievalNPCs />
      <WildAnimals />
    </>
  );
}

function MapEnvironment() {
  const mapType = useGameStore(s => s.mapType);
  if (mapType === 'arena') {
    return (
      <>
        <ArenaWarzone />
        <WarZoneMap />
      </>
    );
  }
  return (
    <>
      <OpenWorld />
      <GrassField />
      <WorldTrees />
      <WorldMountains />
    </>
  );
}

function MapInteractives() {
  const mapType = useGameStore(s => s.mapType);
  if (mapType === 'arena') return null;
  return (
    <>
      <ResourceNodes />
      <WorldItems />
    </>
  );
}

export function GameScene() {
  return (
    <div className="w-full h-screen absolute inset-0 -z-10">
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [0, 45, 60], fov: 50, near: 0.5, far: 1400 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
          stencil: false,
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
        }}
        dpr={[1, 2]}
        frameloop="always"
        performance={{ min: 0.5 }}
        onPointerMissed={() => {
          // LMB click hit nothing → deselect all regiments
          const { phase, selectUnits } = useGameStore.getState();
          if (phase === 'preparation' || phase === 'battle') selectUnits([]);
        }}
      >
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        <PerformanceMonitor
          onDecline={() => console.debug('[RaceWars] perf ↓')}
          onIncline={() => console.debug('[RaceWars] perf ↑')}
        />

        {/* Sky / atmosphere — colour updated each frame by WorldTick */}
        <color attach="background" args={['#4a7fa5']} />
        <fogExp2 attach="fog" args={['#c8dcea', 0.004]} />

        {/* Three-point lighting */}
        <ambientLight intensity={0.65} color="#d8eaf8" />
        <directionalLight
          position={[80, 120, 60]}
          intensity={2.5}
          castShadow
          shadow-camera-left={-200}
          shadow-camera-right={200}
          shadow-camera-top={200}
          shadow-camera-bottom={-200}
          shadow-mapSize={[4096, 4096]}
          shadow-bias={-0.0003}
        />
        <directionalLight position={[-60, 40, -60]} intensity={0.45} color="#7ba8e0" />
        <hemisphereLight args={['#e0f0d8', '#604020', 0.4]} />

        {/* Sky/fog — battlefield blue; ArenaLighting overrides in arena mode */}
        <WorldTick />
        <ArenaLighting />
        <PreparationClock />
        <RTSCamera />

        <Suspense fallback={null}>
          <Physics gravity={[0, -25, 0]}>
            {/* ── Ground & terrain (map-conditional) ── */}
            <MapEnvironment />

            {/* ── Interactive world objects (battlefield only) ── */}
            <MapInteractives />

            {/* ── Armies (Toon_RTS FBX regiments in formation) ── */}
            <BattleArmy />

            {/* ── Ambient NPCs & wildlife (battlefield only) ── */}
            <MapAmbients />

            {/* ── Combat ── */}
            <CombatSystem />

            {/* ── Buildings ── */}
            <PlacedBuildings />
            <BuildSystem />

            {/* ── Ragdoll physics (spawned on catapult impact) ── */}
            <RagdollSystem />
          </Physics>

          {/* Projectiles live outside Physics — they are purely visual */}
          <ProjectileSystem />
          <BattleVFXOverlay />

          {/* Move-order VFX and RTS mouse input (ground plane + LMB/RMB handlers) */}
          <MoveMarker />
          <RTSInputController />

          <UnitAbilityVFX />
          <AbilityManager />
          <AimController />

          {/* ── Post-processing ── */}
          <EffectComposer multisampling={0}>
            <SMAA />
            <Bloom
              intensity={0.45}
              luminanceThreshold={0.75}
              luminanceSmoothing={0.85}
              mipmapBlur
            />
            <Vignette eskil={false} offset={0.12} darkness={0.65} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
