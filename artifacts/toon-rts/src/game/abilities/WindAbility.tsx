import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AbilityTarget, useGameStore } from '../store/gameStore';

export function WindAbility({ cast }: { cast: { id: string, target: AbilityTarget, startTime: number } }) {
  const { removeCast } = useGameStore();
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    const elapsed = (Date.now() - cast.startTime) / 1000;
    if (elapsed > 3.0) {
      removeCast(cast.id);
      return;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 10;
      groupRef.current.position.z -= delta * 5; // move forward slowly
    }
  });

  return (
    <group ref={groupRef} position={cast.target.direction}>
      <mesh position={[0, 5, 0]}>
        <cylinderGeometry args={[3, 1, 10, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
