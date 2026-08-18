/**
 * LifeDrainAura VFX — rotating dark orbs and tendrils around Legion Necromancers
 * while their Life Drain toggle is active.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  position: [number, number, number];
}

const ORBS = 6;

export function LifeDrainAura({ position }: Props) {
  const orbs = useRef<THREE.Mesh[]>([]);
  const glowRef = useRef<THREE.Mesh>(null!);

  const orbAngles = useMemo(() =>
    Array.from({ length: ORBS }, (_, i) => (i / ORBS) * Math.PI * 2),
  []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (glowRef.current) {
      const p = 0.5 + Math.sin(t * 2) * 0.3;
      (glowRef.current.material as THREE.MeshStandardMaterial).opacity = p * 0.25;
      const s = 1 + Math.sin(t * 1.5) * 0.08;
      glowRef.current.scale.setScalar(s);
    }

    orbs.current.forEach((orb, i) => {
      if (!orb) return;
      const a = orbAngles[i] + t * 1.2;
      const r = 2.2 + Math.sin(t * 2 + i) * 0.4;
      const y = 1.5 + Math.sin(t * 1.8 + i * 1.1) * 0.6;
      orb.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      (orb.material as THREE.MeshStandardMaterial).emissiveIntensity =
        1.5 + Math.sin(t * 3 + i) * 0.8;
    });
  });

  return (
    <group position={position}>
      {/* Ground glow disk */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[4, 32]} />
        <meshStandardMaterial color="#cc44ff" transparent opacity={0.2}
          emissive="#cc44ff" emissiveIntensity={1} side={THREE.DoubleSide} />
      </mesh>

      {/* Dark orbs */}
      {orbAngles.map((_, i) => (
        <mesh
          key={i}
          ref={el => { if (el) orbs.current[i] = el; }}
        >
          <sphereGeometry args={[0.22, 12, 8]} />
          <meshStandardMaterial color="#330033" emissive="#cc44ff" emissiveIntensity={2}
            transparent opacity={0.9} />
        </mesh>
      ))}

      {/* Core glow */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.5, 12, 8]} />
        <meshStandardMaterial color="#220022" emissive="#cc44ff" emissiveIntensity={3}
          transparent opacity={0.6} />
      </mesh>

      <pointLight color="#cc44ff" intensity={2.5} distance={8} decay={2} />
    </group>
  );
}
