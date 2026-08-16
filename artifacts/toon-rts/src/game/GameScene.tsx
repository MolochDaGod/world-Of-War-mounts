import { Canvas, useFrame } from '@react-three/fiber';
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
      <Canvas shadows camera={{ position: [0, 35, 35], fov: 45 }}>
        <color attach="background" args={['#1a1f2e']} />
        <fogExp2 attach="fog" args={['#1a1f2e', 0.015]} />
        
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[50, 100, 50]} 
          intensity={1.5} 
          castShadow 
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
          shadow-mapSize={[2048, 2048]}
        />
        
        <RTSCamera />
        <Suspense fallback={null}>
          <Physics>
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
