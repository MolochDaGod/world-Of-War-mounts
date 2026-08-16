import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AbilityTarget, useGameStore } from '../store/gameStore';

const LEAF_COUNT = 30;
// Pre-calc leaf positions/speeds
const leaves = Array.from({ length: LEAF_COUNT }, () => ({
  ox: (Math.random() - 0.5) * 4,
  oz: (Math.random() - 0.5) * 4,
  speed: 1.5 + Math.random() * 2.5,
  radius: 1.5 + Math.random() * 2.5,
  phase: Math.random() * Math.PI * 2,
  size: 0.12 + Math.random() * 0.15,
  color: Math.random() > 0.5 ? '#3a7a2a' : '#6a9a3a',
}));

const tornadoVert = /* glsl */`
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vUv = uv;
    vec3 pos = position;
    // Funnel profile: narrow at bottom, wide at top
    float funnel = 1.0 - (1.0 - vUv.y) * 0.7;
    // Spiral twist
    float twist = vUv.y * 4.0 + uTime * 3.0;
    vec3 twisted = vec3(
      pos.x * cos(twist) - pos.z * sin(twist),
      pos.y,
      pos.x * sin(twist) + pos.z * cos(twist)
    );
    twisted.xz *= funnel;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(twisted, 1.0);
  }
`;

const tornadoFrag = /* glsl */`
  varying vec2 vUv;
  uniform float uAlpha;
  void main() {
    // Swirling bands
    float band = sin(vUv.y * 20.0 + vUv.x * 10.0) * 0.5 + 0.5;
    vec3 col = mix(vec3(0.7, 0.8, 1.0), vec3(1.0), band * 0.4);
    float edge = abs(vUv.x - 0.5) * 2.0;
    float alpha = (1.0 - edge) * 0.4 * uAlpha;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function WindAbility({ cast }: { cast: { id: string; target: AbilityTarget; startTime: number } }) {
  const { removeCast } = useGameStore();
  const groupRef    = useRef<THREE.Group>(null);
  const tornadoRef  = useRef<THREE.Group>(null);
  const leafRefs    = useRef<(THREE.Mesh | null)[]>([]);

  const tornadoMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: tornadoVert,
    fragmentShader: tornadoFrag,
    uniforms: {
      uTime:  { value: 0 },
      uAlpha: { value: 1.0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }), []);

  const dustMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#a8954a',
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  }), []);

  useFrame((state) => {
    const elapsed = (Date.now() - cast.startTime) / 1000;
    if (elapsed > 3.5) { removeCast(cast.id); return; }

    tornadoMat.uniforms.uTime.value = state.clock.elapsedTime;
    const fade = elapsed > 2.5 ? 1.0 - (elapsed - 2.5) : 1.0;
    tornadoMat.uniforms.uAlpha.value = fade;

    // Move tornado forward
    if (groupRef.current) {
      groupRef.current.position.z -= 0.06;
      groupRef.current.rotation.y += 0.04;
    }

    // Swirl leaves
    leafRefs.current.forEach((m, i) => {
      if (!m) return;
      const lf = leaves[i];
      const t  = state.clock.elapsedTime * lf.speed + lf.phase;
      m.position.x = Math.cos(t) * lf.radius;
      m.position.z = Math.sin(t) * lf.radius;
      m.position.y = ((t * 0.5) % 8) + 0.2;
      m.rotation.z += 0.05;
      (m.material as THREE.MeshBasicMaterial).opacity = fade * 0.8;
    });
  });

  const [cx, , cz] = cast.target.direction;

  return (
    <group ref={groupRef} position={[cx, 0, cz]}>
      {/* Tornado shell — nested for depth */}
      <group ref={tornadoRef}>
        <mesh material={tornadoMat}>
          <cylinderGeometry args={[3.5, 0.4, 12, 20, 8, true]} />
        </mesh>
        <mesh material={tornadoMat}>
          <cylinderGeometry args={[2.8, 0.2, 10, 16, 6, true]} />
        </mesh>
      </group>

      {/* Ground dust ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} material={dustMat}>
        <ringGeometry args={[0.3, 3.5, 32]} />
      </mesh>

      {/* Swirling leaves */}
      {leaves.map((lf, i) => (
        <mesh key={i} ref={el => { leafRefs.current[i] = el; }}>
          <planeGeometry args={[lf.size, lf.size]} />
          <meshBasicMaterial color={lf.color} transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}

      <pointLight color="#aaddaa" intensity={6} distance={14} decay={2} />
    </group>
  );
}
