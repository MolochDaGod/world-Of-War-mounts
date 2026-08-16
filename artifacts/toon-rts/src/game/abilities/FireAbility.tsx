import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AbilityTarget, useGameStore } from '../store/gameStore';

// Pre-calc ember offsets — stable, never in render
const EMBER_COUNT = 20;
const embers = Array.from({ length: EMBER_COUNT }, () => ({
  ox: (Math.random() - 0.5) * 4,
  oz: (Math.random() - 0.5) * 4,
  speed: 2 + Math.random() * 3,
  phase: Math.random() * Math.PI * 2,
  size: 0.12 + Math.random() * 0.18,
}));

const fireVert = /* glsl */`
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vUv = uv;
    vec3 pos = position;
    // Turbulent displacement
    pos.x += sin(uv.y * 6.0 + uTime * 3.0) * 0.15 * (1.0 - uv.y);
    pos.z += cos(uv.y * 5.0 + uTime * 2.5) * 0.12 * (1.0 - uv.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fireFrag = /* glsl */`
  varying vec2 vUv;
  uniform float uTime;
  uniform float uAlpha;
  void main() {
    float y = vUv.y;
    // Fire color ramp: red -> orange -> yellow -> white core
    vec3 col = mix(vec3(1.0, 0.08, 0.0), vec3(1.0, 0.45, 0.0), y);
    col = mix(col, vec3(1.0, 0.95, 0.4), y * y);
    // Edge alpha falloff
    float edge = 1.0 - abs(vUv.x * 2.0 - 1.0);
    float alpha = edge * (1.0 - y * y) * uAlpha;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function FireAbility({ cast }: { cast: { id: string; target: AbilityTarget; startTime: number } }) {
  const removeCast = useGameStore(s => s.removeCast);
  const groupRef  = useRef<THREE.Group>(null);
  const emberRefs = useRef<(THREE.Mesh | null)[]>([]);

  const fireMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: fireVert,
    fragmentShader: fireFrag,
    uniforms: {
      uTime:  { value: 0 },
      uAlpha: { value: 1.0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }), []);

  const emberMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ff6600',
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  useFrame((state) => {
    const elapsed = (Date.now() - cast.startTime) / 1000;
    if (elapsed > 2.0) { removeCast(cast.id); return; }

    const t = elapsed;
    fireMat.uniforms.uTime.value  = state.clock.elapsedTime;
    fireMat.uniforms.uAlpha.value = t < 1.5 ? 1.0 : 1.0 - (t - 1.5) / 0.5;

    // Scale up blast
    const blast = Math.min(t * 6, 1);
    if (groupRef.current) groupRef.current.scale.setScalar(1 + blast * 3);

    // Animate embers rising
    emberRefs.current.forEach((m, i) => {
      if (!m) return;
      const em = embers[i];
      m.position.y = (t * em.speed + em.phase) % 6;
      m.position.x = em.ox + Math.sin(t * 2 + em.phase) * 0.4;
      m.position.z = em.oz + Math.cos(t * 2 + em.phase) * 0.4;
      (m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - m.position.y / 6);
    });
  });

  const [cx, , cz] = cast.target.direction;

  return (
    <group position={[cx, 0, cz]}>
      {/* Fire cone */}
      <group ref={groupRef}>
        <mesh material={fireMat} castShadow>
          <coneGeometry args={[1.2, 4, 16, 8, true]} />
        </mesh>
        <pointLight color="#ff4400" intensity={12} distance={15} decay={2} />
      </group>

      {/* Embers */}
      {embers.map((em, i) => (
        <mesh
          key={i}
          ref={el => { emberRefs.current[i] = el; }}
          position={[em.ox, 0, em.oz]}
          material={emberMat}
        >
          <sphereGeometry args={[em.size, 4, 4]} />
        </mesh>
      ))}

      {/* Scorch ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[1.5, 3.5, 32]} />
        <meshBasicMaterial color="#330800" transparent opacity={0.6} depthWrite={false} />
      </mesh>
    </group>
  );
}
