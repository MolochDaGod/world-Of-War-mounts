import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AbilityTarget, useGameStore } from '../store/gameStore';

export function IceAbility({ cast }: { cast: { id: string, target: AbilityTarget, startTime: number } }) {
  const groupRef = useRef<THREE.Group>(null);
  const { removeCast } = useGameStore();
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const elapsed = (Date.now() - cast.startTime) / 1000;
    
    if (elapsed > 2.0) {
      removeCast(cast.id);
      return;
    }
    
    // Scale up rapidly, then fade
    const scale = Math.min(elapsed * 5, 1);
    groupRef.current.scale.setScalar(scale);
    groupRef.current.children.forEach(c => {
      if ((c as THREE.Mesh).material instanceof THREE.Material) {
         ((c as THREE.Mesh).material as THREE.Material).opacity = 1 - Math.max(0, elapsed - 1);
      }
    });
  });

  return (
    <group ref={groupRef} position={cast.target.direction}>
      {Array.from({ length: 15 }).map((_, i) => (
        <mesh 
          key={i} 
          position={[(Math.random()-0.5)*10, 0, (Math.random()-0.5)*10]}
          rotation={[Math.random()*0.2, Math.random()*Math.PI, Math.random()*0.2]}
        >
          <coneGeometry args={[0.5, 4 + Math.random()*4, 4]} />
          <meshPhysicalMaterial 
            color="#88ccff" 
            transparent 
            opacity={0.8}
            roughness={0.1}
            transmission={0.9}
            thickness={2}
          />
        </mesh>
      ))}
    </group>
  );
}
