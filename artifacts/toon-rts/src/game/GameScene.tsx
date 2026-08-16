import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense } from 'react';
import { RTSCamera } from './camera/RTSCamera';
import { World } from './world/World';
import { UnitManager } from './units/UnitManager';
import { AbilityManager } from './abilities/AbilityManager';
import { AimController } from './abilities/AimController';
import { CombatSystem } from './physics/CombatSystem';

export function GameScene() {
  return (
    <div className="w-full h-screen absolute inset-0 -z-10 bg-[#0d0f14]">
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [0, 35, 35], fov: 45 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={['#1a1f2e']} />
        <fogExp2 attach="fog" args={['#1a1f2e', 0.012]} />

        <ambientLight intensity={0.6} />
        <directionalLight
          position={[50, 80, 50]}
          intensity={2.0}
          castShadow
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={60}
          shadow-camera-bottom={-60}
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.001}
        />
        {/* Fill light from opposite side */}
        <directionalLight position={[-30, 20, -30]} intensity={0.4} color="#7ab8f5" />

        <RTSCamera />
        <Suspense fallback={null}>
          <Physics gravity={[0, -20, 0]}>
            <World />
            <UnitManager />
            <CombatSystem />
          </Physics>
          <AbilityManager />
          <AimController />
        </Suspense>
      </Canvas>
    </div>
  );
}
