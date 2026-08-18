/**
 * NaturesBountyVFX — instant AOE heal burst for Fabled mages.
 * A green shockwave ring and rising leaf particles, fades over 2.2 s.
 * Uses Date.now() timing so it can be triggered from outside the R3F render loop.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface BountyBurst {
  id: string;
  position: [number, number, number];
  radius: number;
  createdAt: number; // Date.now() ms
}

const DURATION = 2200; // ms
const LEAVES   = 30;

interface Props { burst: BountyBurst; }

export function NaturesBountyVFX({ burst }: Props) {
  const waveRef  = useRef<THREE.Mesh>(null!);
  const wave2Ref = useRef<THREE.Mesh>(null!);
  const leafRef  = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const leafData = useMemo(() =>
    Array.from({ length: LEAVES }, (_, i) => ({
      angle:  (i / LEAVES) * Math.PI * 2 + Math.random(),
      radius: 2 + Math.random() * (burst.radius * 0.6),
      speed:  1.5 + Math.random() * 2,
      phase:  Math.random() * Math.PI * 2,
      rot:    Math.random() * Math.PI * 2,
    })),
  [burst.radius]);

  useFrame(() => {
    const elapsed = Date.now() - burst.createdAt;
    const t    = elapsed / 1000;
    const frac = Math.min(1, elapsed / DURATION);
    const alpha = frac < 0.2 ? frac / 0.2 : 1 - (frac - 0.2) / 0.8;

    if (waveRef.current) {
      waveRef.current.scale.setScalar(frac);
      (waveRef.current.material as THREE.MeshStandardMaterial).opacity = alpha * 0.6;
    }
    if (wave2Ref.current) {
      wave2Ref.current.scale.setScalar(frac * 0.6);
      (wave2Ref.current.material as THREE.MeshStandardMaterial).opacity = alpha * 0.3;
    }

    if (leafRef.current) {
      leafData.forEach((ld, i) => {
        const lt  = ((t + ld.phase * 0.3) % (DURATION / 1000));
        const lf  = lt / (DURATION / 1000);
        const y   = lf * 5;
        const r   = ld.radius * (0.4 + lf * 0.6);
        dummy.position.set(
          Math.cos(ld.angle + t * 0.5) * r,
          y,
          Math.sin(ld.angle + t * 0.5) * r,
        );
        dummy.rotation.set(ld.rot + t, ld.rot * 1.3, 0);
        dummy.scale.setScalar(0.06 + alpha * 0.1);
        dummy.updateMatrix();
        leafRef.current.setMatrixAt(i, dummy.matrix);
      });
      leafRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  if (Date.now() - burst.createdAt > DURATION) return null;

  return (
    <group position={burst.position}>
      <mesh ref={waveRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[burst.radius * 0.88, burst.radius, 64]} />
        <meshStandardMaterial color="#44ff88" transparent opacity={0.6}
          emissive="#44ff88" emissiveIntensity={2} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={wave2Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[burst.radius, 48]} />
        <meshStandardMaterial color="#aaffcc" transparent opacity={0.25}
          emissive="#44ff88" emissiveIntensity={0.8} side={THREE.DoubleSide} />
      </mesh>
      <instancedMesh ref={leafRef} args={[undefined, undefined, LEAVES]}>
        <tetrahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#44ff88" transparent opacity={0.85}
          emissive="#88ffaa" emissiveIntensity={1.5} />
      </instancedMesh>
      <pointLight color="#44ff88" intensity={3} distance={burst.radius * 1.5} decay={2} />
    </group>
  );
}
