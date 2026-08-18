/**
 * HealTotem VFX — a glowing golden pillar placed by Crusade mages.
 * Renders a pillar of light, rotating ring, and rising sparkles.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TotemData } from '../data/AbilityDefs';

interface Props { totem: TotemData; now: number; }

export function HealTotem({ totem, now }: Props) {
  const groupRef = useRef<THREE.Group>(null!);
  const ringRef  = useRef<THREE.Mesh>(null!);
  const outerRef = useRef<THREE.Mesh>(null!);
  const sparkRef = useRef<THREE.InstancedMesh>(null!);

  const remaining = totem.expiresAt - now;
  const alpha = Math.min(1, remaining / 1.5);

  // 20 sparkle instances
  const SPARKS = 20;
  const sparkOffsets = useMemo(() => {
    return Array.from({ length: SPARKS }, (_, i) => ({
      angle: (i / SPARKS) * Math.PI * 2 + Math.random() * 0.5,
      radius: 1.5 + Math.random() * 3,
      speed: 0.4 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.6;
    }
    if (ringRef.current) {
      const pulse = 0.92 + Math.sin(t * 3) * 0.08;
      ringRef.current.scale.setScalar(pulse);
      (ringRef.current.material as THREE.MeshStandardMaterial).opacity =
        alpha * (0.6 + Math.sin(t * 3) * 0.3);
    }
    if (outerRef.current) {
      const pulse2 = 0.85 + Math.sin(t * 2 + 1) * 0.15;
      outerRef.current.scale.setScalar(pulse2);
      (outerRef.current.material as THREE.MeshStandardMaterial).opacity =
        alpha * (0.3 + Math.sin(t * 2) * 0.2);
    }
    if (sparkRef.current) {
      sparkOffsets.forEach((s, i) => {
        const yFrac = ((t * s.speed + s.phase) % 1);
        const y = yFrac * 6;
        const a = s.angle + t * 0.4;
        const r = s.radius * (1 - yFrac * 0.3);
        dummy.position.set(
          Math.cos(a) * r,
          y,
          Math.sin(a) * r,
        );
        const sc = 0.08 + (1 - yFrac) * 0.12;
        dummy.scale.setScalar(sc);
        dummy.updateMatrix();
        sparkRef.current.setMatrixAt(i, dummy.matrix);
      });
      sparkRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group position={totem.position}>
      {/* Ground cross */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[totem.radius - 0.3, totem.radius, 64]} />
        <meshStandardMaterial color="#ffd700" transparent opacity={alpha * 0.35}
          emissive="#ffd700" emissiveIntensity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* Inner heal radius fill */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[totem.radius, 48]} />
        <meshStandardMaterial color="#ffd700" transparent opacity={alpha * 0.06}
          emissive="#ffd700" emissiveIntensity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Pillar of light */}
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.18, 0.35, 6, 12, 1, true]} />
        <meshStandardMaterial color="#ffffa0" transparent opacity={alpha * 0.55}
          emissive="#ffd700" emissiveIntensity={2} side={THREE.DoubleSide} />
      </mesh>

      {/* Spinning ring */}
      <group ref={groupRef}>
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.8, 0]}>
          <ringGeometry args={[1.8, 2.2, 32]} />
          <meshStandardMaterial color="#ffd700" transparent opacity={alpha * 0.7}
            emissive="#ffd700" emissiveIntensity={1.5} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={outerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
          <ringGeometry args={[3.5, 4.2, 32]} />
          <meshStandardMaterial color="#ffee88" transparent opacity={alpha * 0.4}
            emissive="#ffee88" emissiveIntensity={1} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Crystal top */}
      <mesh position={[0, 6.5, 0]}>
        <octahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color="#ffd700" transparent opacity={alpha}
          emissive="#ffd700" emissiveIntensity={3} />
      </mesh>

      {/* Rising sparkles */}
      <instancedMesh ref={sparkRef} args={[undefined, undefined, SPARKS]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#ffffaa" transparent opacity={alpha * 0.9}
          emissive="#ffd700" emissiveIntensity={2} />
      </instancedMesh>

      {/* Point light */}
      <pointLight color="#ffd700" intensity={alpha * 3} distance={totem.radius * 1.4} decay={2} />
    </group>
  );
}
