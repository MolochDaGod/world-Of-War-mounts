import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense } from 'react';
import {
  AdaptiveDpr,
  AdaptiveEvents,
  Preload,
  PerformanceMonitor,
} from '@react-three/drei';
import { RTSCamera }      from './camera/RTSCamera';
import { OpenWorld }      from './world/OpenWorld';
import { GrassField }     from './world/GrassField';
import { AnimeWater }     from './world/AnimeWater';
import { WorldTrees }     from './world/WorldTrees';
import { WorldMountains } from './world/WorldMountains';
import { ResourceNodes }  from './world/ResourceNodes';
import { WorldItems }     from './world/WorldItems';
import { WildAnimals }    from './wildlife/WildAnimals';
import { OrcArmy }        from './characters/OrcArmy';
import { ElfArmy }        from './characters/ElfArmy';
import { MedievalNPCs }   from './characters/MedievalNPCs';
import { AbilityManager } from './abilities/AbilityManager';
import { AimController }  from './abilities/AimController';
import { CombatSystem }   from './physics/CombatSystem';
import { useWorldStore }  from './store/worldStore';
import { useFrame }       from '@react-three/fiber';

/**
 * Ticks the world time-of-day and day/night cycle inside the R3F render loop.
 * Reads timeOfDay from getState() inside useFrame to avoid subscribing to
 * a value that changes every frame — which would trigger 60fps React re-renders
 * and cause "Maximum update depth exceeded" via useSyncExternalStore cascades.
 */
function WorldTick() {
  const tickTime = useWorldStore(s => s.tickTime);
  useFrame((state, delta) => {
    tickTime(delta);
    // Read latest timeOfDay directly from store (no React subscription needed)
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
 * GameScene — R3F Canvas configured for open-world RTS/survival deployment.
 *
 * Canvas choices:
 *  shadows PCFShadowMap    — not deprecated (PCFSoftShadowMap is deprecated in r185)
 *  gl.antialias            — hardware MSAA
 *  gl.powerPreference      — discrete GPU
 *  gl.stencil false        — not needed; saves memory bandwidth
 *  dpr [1,2]               — HiDPI; AdaptiveDpr scales down under GPU pressure
 *  performance.min 0.5     — permits dropping DPR before fps tanks
 *  far: 1200               — large open world (300×300) needs extended far plane
 */
export function GameScene() {
  return (
    <div className="w-full h-screen absolute inset-0 -z-10">
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [0, 40, 50], fov: 50, near: 0.5, far: 1200 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
          alpha: false,
          stencil: false,
        }}
        dpr={[1, 2]}
        frameloop="always"
        performance={{ min: 0.5 }}
      >
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        <PerformanceMonitor
          onDecline={() => console.debug('[RaceWars] perf ↓')}
          onIncline={() => console.debug('[RaceWars] perf ↑')}
        />

        {/* Sky / atmosphere */}
        <color attach="background" args={['#4a7fa5']} />
        <fogExp2 attach="fog" args={['#c8dcea', 0.005]} />

        {/* Three-point lighting rig — large world needs wider shadow frustum */}
        <ambientLight intensity={0.6} color="#d8eaf8" />
        <directionalLight
          position={[80, 120, 60]}
          intensity={2.5}
          castShadow
          shadow-camera-left={-180}
          shadow-camera-right={180}
          shadow-camera-top={180}
          shadow-camera-bottom={-180}
          shadow-mapSize={[4096, 4096]}
          shadow-bias={-0.0003}
        />
        <directionalLight position={[-60, 40, -60]} intensity={0.45} color="#7ba8e0" />
        <hemisphereLight args={['#e0f0d8', '#604020', 0.4]} />

        <WorldTick />
        <RTSCamera />

        <Suspense fallback={null}>
          <Physics gravity={[0, -25, 0]}>
            {/* ── Ground & terrain ── */}
            <OpenWorld />
            <GrassField />
            <AnimeWater />

            {/* ── Environment (FBX loaded in these) ── */}
            <WorldTrees />
            <WorldMountains />

            {/* ── Interactive world objects ── */}
            <ResourceNodes />
            <WorldItems />

            {/* ── Characters ── */}
            <OrcArmy />
            <ElfArmy />
            <MedievalNPCs />

            {/* ── Wildlife ── */}
            <WildAnimals />

            {/* ── Combat & abilities ── */}
            <CombatSystem />
          </Physics>

          <AbilityManager />
          <AimController />
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  );
}
