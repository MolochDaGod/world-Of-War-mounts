import { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AbilityTarget, useGameStore } from '../store/gameStore';

// Pre-calculate spike layout — never in JSX/render
const SPIKE_COUNT = 18;
const spikes = Array.from({ length: SPIKE_COUNT }, (_, i) => {
  const angle = (i / SPIKE_COUNT) * Math.PI * 2 + Math.random() * 0.4;
  const r     = 1.5 + Math.random() * 4.5;
  return {
    x:  Math.cos(angle) * r,
    z:  Math.sin(angle) * r,
    ry: Math.random() * Math.PI,
    rx: (Math.random() - 0.5) * 0.3,
    h:  3.0 + Math.random() * 5.0,
    s:  0.4 + Math.random() * 0.3,
  };
});

export function IceAbility({ cast }: { cast: { id: string; target: AbilityTarget; startTime: number } }) {
  const groupRef = useRef<THREE.Group>(null);
  const rimRef   = useRef<THREE.Mesh>(null);
  const removeCast = useGameStore(s => s.removeCast);

  const crystalMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#88ccff',
    transparent: true,
    opacity: 0.85,
    roughness: 0.05,
    transmission: 0.7,
    thickness: 2.5,
    ior: 1.5,
    emissive: new THREE.Color('#2255aa'),
    emissiveIntensity: 0.2,
  }), []);

  const rimMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#aaddff',
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  const frostMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#cceeff',
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  useEffect(() => () => {
    crystalMat.dispose();
    rimMat.dispose();
    frostMat.dispose();
  }, [crystalMat, rimMat, frostMat]);

  useFrame(() => {
    const elapsed = (Date.now() - cast.startTime) / 1000;
    if (elapsed > 2.5) { removeCast(cast.id); return; }

    if (!groupRef.current) return;

    // Phase 1 (0–0.3s): eruption scale-up
    const eruptScale = Math.min(elapsed / 0.3, 1.0);
    // Phase 2 (1.5–2.5s): fade
    const fadeAlpha  = elapsed > 1.5 ? 1.0 - (elapsed - 1.5) / 1.0 : 1.0;

    groupRef.current.scale.setScalar(eruptScale);
    crystalMat.opacity = 0.85 * fadeAlpha;
    rimMat.opacity     = 0.6  * fadeAlpha;
    frostMat.opacity   = 0.3  * fadeAlpha;

    if (rimRef.current) rimRef.current.scale.setScalar(1.0 + elapsed * 0.5);
  });

  const [cx, , cz] = cast.target.direction;

  return (
    <group ref={groupRef} position={[cx, 0, cz]}>
      {/* Ground frost disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} material={frostMat}>
        <circleGeometry args={[8, 48]} />
      </mesh>

      {/* Expanding rim ring */}
      <mesh ref={rimRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} material={rimMat}>
        <ringGeometry args={[5.5, 6.5, 48]} />
      </mesh>

      {/* Ice spikes */}
      {spikes.map((sp, i) => (
        <mesh
          key={i}
          position={[sp.x, sp.h / 2, sp.z]}
          rotation={[sp.rx, sp.ry, 0]}
          material={crystalMat}
          castShadow
        >
          <coneGeometry args={[sp.s, sp.h, 4]} />
        </mesh>
      ))}

      {/* Central tall spike */}
      <mesh position={[0, 3.5, 0]} material={crystalMat} castShadow>
        <coneGeometry args={[0.6, 7, 4]} />
      </mesh>

      {/* Point light glow */}
      <pointLight color="#88ccff" intensity={8} distance={12} decay={2} />
    </group>
  );
}
