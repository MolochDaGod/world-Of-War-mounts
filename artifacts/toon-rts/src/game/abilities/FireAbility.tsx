import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AbilityTarget, useGameStore } from '../store/gameStore';

export function FireAbility({ cast }: { cast: { id: string, target: AbilityTarget, startTime: number } }) {
  const { removeCast } = useGameStore();
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    const elapsed = (Date.now() - cast.startTime) / 1000;
    if (elapsed > 1.5) {
      removeCast(cast.id);
      return;
    }
    if (groupRef.current) {
      groupRef.current.scale.setScalar(1 + elapsed * 5);
    }
  });

  return (
    <group ref={groupRef} position={cast.target.direction}>
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ff2200" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}
