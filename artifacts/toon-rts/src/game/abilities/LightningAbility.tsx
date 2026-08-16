import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AbilityTarget, useGameStore } from '../store/gameStore';

export function LightningAbility({ cast }: { cast: { id: string, target: AbilityTarget, startTime: number } }) {
  const groupRef = useRef<THREE.Group>(null);
  const { removeCast } = useGameStore();
  
  useFrame(() => {
    const elapsed = (Date.now() - cast.startTime) / 1000;
    if (elapsed > 0.5) {
      removeCast(cast.id);
      return;
    }
    if (groupRef.current) {
      groupRef.current.visible = Math.random() > 0.3; // Flicker
    }
  });

  return (
    <group ref={groupRef} position={cast.target.direction}>
      <mesh position={[0, 20, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 40, 6]} />
        <meshBasicMaterial color="#aaffff" />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0, 10, 32]} />
        <meshBasicMaterial color="#aaffff" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
