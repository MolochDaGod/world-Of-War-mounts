/**
 * StandGroundEffect VFX — blue shield ring drawn around a formation that has
 * Stand Ground active.  Rendered per-regiment position.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  position: [number, number, number];
  radius?: number;
}

export function StandGroundEffect({ position, radius = 4 }: Props) {
  const ringRef  = useRef<THREE.Mesh>(null!);
  const glowRef  = useRef<THREE.Mesh>(null!);
  const shieldRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 0.88 + Math.sin(t * 2.5) * 0.12;

    if (ringRef.current) {
      ringRef.current.scale.setScalar(pulse);
      (ringRef.current.material as THREE.MeshStandardMaterial).opacity =
        0.55 + Math.sin(t * 2.5) * 0.25;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(0.9 + Math.sin(t * 1.8 + 1) * 0.1);
      (glowRef.current.material as THREE.MeshStandardMaterial).opacity =
        0.15 + Math.sin(t * 1.8) * 0.08;
    }
    if (shieldRef.current) {
      shieldRef.current.rotation.y = t * 0.8;
      (shieldRef.current.material as THREE.MeshStandardMaterial).opacity =
        0.25 + Math.sin(t * 3) * 0.12;
    }
  });

  return (
    <group position={position}>
      {/* Ground glow fill */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[radius, 32]} />
        <meshStandardMaterial color="#4488ff" transparent opacity={0.15}
          emissive="#4488ff" emissiveIntensity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* Pulsing ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[radius - 0.3, radius, 48]} />
        <meshStandardMaterial color="#66aaff" transparent opacity={0.6}
          emissive="#66aaff" emissiveIntensity={2} side={THREE.DoubleSide} />
      </mesh>

      {/* Spinning hex shield */}
      <mesh ref={shieldRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[radius * 0.5, radius * 0.55, 6]} />
        <meshStandardMaterial color="#aaccff" transparent opacity={0.25}
          emissive="#aaccff" emissiveIntensity={1.5} side={THREE.DoubleSide} />
      </mesh>

      <pointLight color="#4488ff" intensity={1.2} distance={radius * 1.8} decay={2} />
    </group>
  );
}
