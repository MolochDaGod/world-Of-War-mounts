import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AbilityTarget, useGameStore } from '../store/gameStore';

const FILAMENT_COUNT = 5;
// Pre-calc filament offsets — never in render
const filaments = Array.from({ length: FILAMENT_COUNT }, (_, i) => ({
  ox: (Math.random() - 0.5) * 1.5,
  oz: (Math.random() - 0.5) * 1.5,
  phase: (i / FILAMENT_COUNT) * Math.PI * 2,
}));

const boltVert = /* glsl */`
  varying vec2 vUv;
  uniform float uTime;
  uniform float uPhase;
  void main() {
    vUv = uv;
    vec3 pos = position;
    // Jitter along length
    float jitter = sin(vUv.y * 30.0 + uTime * 40.0 + uPhase) * 0.25 * sin(vUv.y * 3.14159);
    pos.x += jitter;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const boltFrag = /* glsl */`
  varying vec2 vUv;
  uniform float uAlpha;
  void main() {
    float edge = 1.0 - abs(vUv.x * 2.0 - 1.0);
    float core = smoothstep(0.3, 1.0, edge);
    vec3 innerCol = vec3(0.9, 1.0, 1.0);
    vec3 outerCol = vec3(0.4, 0.6, 1.0);
    vec3 col = mix(outerCol, innerCol, core);
    float alpha = edge * uAlpha;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function LightningAbility({ cast }: { cast: { id: string; target: AbilityTarget; startTime: number } }) {
  const groupRef  = useRef<THREE.Group>(null);
  const lightRef  = useRef<THREE.PointLight>(null);
  const { removeCast } = useGameStore();

  // One ShaderMaterial per filament, different phase uniform
  const boltMats = useMemo(() => filaments.map(f =>
    new THREE.ShaderMaterial({
      vertexShader: boltVert,
      fragmentShader: boltFrag,
      uniforms: {
        uTime:  { value: 0 },
        uPhase: { value: f.phase },
        uAlpha: { value: 1.0 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
  ), []);

  const groundMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#6699ff',
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  useFrame((state) => {
    const elapsed = (Date.now() - cast.startTime) / 1000;
    if (elapsed > 1.2) { removeCast(cast.id); return; }

    const fade  = elapsed > 0.8 ? 1.0 - (elapsed - 0.8) / 0.4 : 1.0;
    const flicker = Math.random() > 0.25 ? 1 : 0; // 75% visible each frame

    boltMats.forEach(m => {
      m.uniforms.uTime.value  = state.clock.elapsedTime;
      m.uniforms.uAlpha.value = fade * flicker;
    });

    // Pulse light
    if (lightRef.current) {
      lightRef.current.intensity = flicker * 15 * fade;
    }
  });

  const [cx, , cz] = cast.target.direction;

  return (
    <group ref={groupRef} position={[cx, 0, cz]}>
      {/* Bolt filaments (sky strike) */}
      {filaments.map((f, i) => (
        <mesh
          key={i}
          position={[f.ox, 20, f.oz]}
          material={boltMats[i]}
        >
          <planeGeometry args={[0.4, 40, 1, 12]} />
        </mesh>
      ))}

      {/* Ground electric ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} material={groundMat}>
        <ringGeometry args={[0, 6, 40]} />
      </mesh>

      {/* Pulsing light */}
      <pointLight ref={lightRef} color="#aaccff" intensity={15} distance={20} decay={2} />
    </group>
  );
}
