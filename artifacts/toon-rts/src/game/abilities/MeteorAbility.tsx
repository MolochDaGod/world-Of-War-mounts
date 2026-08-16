import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AbilityTarget, useGameStore } from '../store/gameStore';

export function MeteorAbility({ cast }: { cast: { id: string, target: AbilityTarget, startTime: number } }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { removeCast } = useGameStore();
  
  const startPos = useMemo(() => new THREE.Vector3(cast.target.direction[0], 50, cast.target.direction[2] - 30), [cast]);
  const endPos = useMemo(() => new THREE.Vector3(...cast.target.direction), [cast]);
  
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff4400' }), []);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const elapsed = (Date.now() - cast.startTime) / 1000;
    const duration = 1.0; // 1 second flight
    
    if (elapsed > duration) {
      // Impact logic here
      removeCast(cast.id);
      return;
    }
    
    const t = elapsed / duration;
    meshRef.current.position.lerpVectors(startPos, endPos, t);
    meshRef.current.scale.setScalar(1 + t * 2);
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 16, 16]} />
        <meshBasicMaterial color="#ff4400" />
      </mesh>
    </group>
  );
}