import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SkillBurst } from '../store/gameStore';
import { ElementalParticleBurst } from '../effects/ElementalParticles';

export function SkillBurstVFX({ burst }: { burst: SkillBurst }) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const fillMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: burst.color,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  }), [burst.color]);
  useEffect(() => () => fillMat.dispose(), [fillMat]);

  useFrame(() => {
    const progress = Math.min(1, (Date.now() - burst.createdAt) / burst.duration);
    const fade = Math.max(0, 1 - progress);
    if (groupRef.current) groupRef.current.scale.setScalar(0.3 + progress * 0.7);
    fillMat.opacity = fade * (burst.kind === 'nature' ? 0.12 : 0.2);
    if (ringRef.current) {
      const material = ringRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = fade * 0.9;
      ringRef.current.rotation.z = progress * Math.PI * 1.5;
    }
  });

  return (
    <group ref={groupRef} position={[burst.position[0], 0.09, burst.position[2]]}>
      {(burst.kind === 'flame' || burst.kind === 'impact') && (
        <ElementalParticleBurst
          theme={burst.kind === 'flame' ? 'fire' : 'smoke'}
          startedAt={burst.createdAt}
          duration={burst.duration / 1000}
          intensity={burst.kind === 'flame' ? 1.15 : 0.95}
        />
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={fillMat}>
        <circleGeometry args={[burst.radius, 48]} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.max(0.25, burst.radius - 0.35), burst.radius, 48]} />
        <meshBasicMaterial
          color={burst.color}
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight color={burst.color} intensity={burst.kind === 'impact' ? 5 : 3} distance={burst.radius * 1.4} decay={2} />
    </group>
  );
}

export function TargetingTelegraph({
  position,
  radius,
  color,
}: {
  position: [number, number, number];
  radius: number;
  color: string;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const material = ringRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = 0.45 + Math.sin(clock.elapsedTime * 5) * 0.2;
    const scale = 0.97 + Math.sin(clock.elapsedTime * 4) * 0.035;
    ringRef.current.scale.setScalar(scale);
  });
  return (
    <group position={[position[0], 0.12, position[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.max(0.25, radius - 0.25), radius, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}