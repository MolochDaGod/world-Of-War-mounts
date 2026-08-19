/**
 * ThunderStrikeAbility — a focused ground-strike bolt that hammers a single
 * point with a bright flash, expanding shockwave ring, and residual sparks.
 *
 * Distinct from LightningAbility (chain bolts) — this is a concentrated
 * single pillar of divine white-blue energy slamming straight down.
 *
 * Duration: ~1.8 s (flash 0.15 s → pillar 0.6 s → shockwave + sparks 1.0 s)
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AbilityTarget, useGameStore } from '../store/gameStore';

// ── Spark particles ───────────────────────────────────────────────────────
const SPARK_COUNT = 20;
const sparks = Array.from({ length: SPARK_COUNT }, () => ({
  angle:  Math.random() * Math.PI * 2,
  speed:  4 + Math.random() * 8,
  height: 1 + Math.random() * 6,
  size:   0.08 + Math.random() * 0.15,
}));

// ── Pillar shader — glowing energy column ─────────────────────────────────
const pillarVert = /* glsl */`
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vUv = uv;
    vec3 pos = position;
    // Jitter pillar sides slightly
    float jitter = sin(vUv.y * 25.0 + uTime * 60.0) * 0.18 * sin(vUv.y * 3.14159);
    pos.x += jitter;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const pillarFrag = /* glsl */`
  varying vec2 vUv;
  uniform float uAlpha;
  void main() {
    float edge = 1.0 - abs(vUv.x * 2.0 - 1.0);
    float core = smoothstep(0.4, 1.0, edge);
    vec3 inner = vec3(1.0, 1.0, 1.0);
    vec3 outer = vec3(0.5, 0.75, 1.0);
    vec3 col = mix(outer, inner, core);
    gl_FragColor = vec4(col, edge * uAlpha);
  }
`;

// ── Shockwave shader ──────────────────────────────────────────────────────
const shockVert = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const shockFrag = /* glsl */`
  varying vec2 vUv;
  uniform float uProgress; // 0→1 ring expanding outward
  uniform float uAlpha;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float ring = 1.0 - abs(r - uProgress) / 0.08;
    ring = max(0.0, ring);
    vec3 col = mix(vec3(0.6, 0.8, 1.0), vec3(1.0, 1.0, 1.0), ring);
    gl_FragColor = vec4(col, ring * uAlpha);
  }
`;

export function ThunderStrikeAbility({
  cast,
}: {
  cast: { id: string; target: AbilityTarget; startTime: number };
}) {
  const pillarRef  = useRef<THREE.Mesh>(null);
  const shockRef   = useRef<THREE.Mesh>(null);
  const flashRef   = useRef<THREE.Mesh>(null);
  const sparkRefs  = useRef<(THREE.Mesh | null)[]>([]);
  const lightRef   = useRef<THREE.PointLight>(null);
  const removeCast = useGameStore(s => s.removeCast);

  const TOTAL       = 1.8;
  const FLASH_END   = 0.15;
  const PILLAR_END  = 0.75;

  const pillarMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   pillarVert,
    fragmentShader: pillarFrag,
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 } },
    transparent: true,
    depthWrite:  false,
    side:        THREE.DoubleSide,
    blending:    THREE.AdditiveBlending,
  }), []);

  const shockMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   shockVert,
    fragmentShader: shockFrag,
    uniforms: { uProgress: { value: 0 }, uAlpha: { value: 0 } },
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  }), []);

  const flashMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  const sparkMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#aaddff',
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  useFrame((state) => {
    const elapsed = (Date.now() - cast.startTime) / 1000;
    if (elapsed > TOTAL) { removeCast(cast.id); return; }

    const t = state.clock.elapsedTime;

    // ── Flash ──────────────────────────────────────────────────────────────
    if (elapsed < FLASH_END) {
      flashMat.opacity = (1 - elapsed / FLASH_END) * 0.9;
    } else {
      flashMat.opacity = 0;
    }

    // ── Pillar ─────────────────────────────────────────────────────────────
    if (elapsed < PILLAR_END) {
      const pillarT = (elapsed - FLASH_END) / (PILLAR_END - FLASH_END);
      const alpha = elapsed < FLASH_END ? 0 : Math.min(1, pillarT * 3);
      const fade  = pillarT > 0.6 ? 1 - (pillarT - 0.6) / 0.4 : 1.0;
      pillarMat.uniforms.uTime.value  = t;
      pillarMat.uniforms.uAlpha.value = alpha * fade;
    } else {
      pillarMat.uniforms.uAlpha.value = 0;
    }

    // ── Shockwave ──────────────────────────────────────────────────────────
    if (elapsed >= FLASH_END) {
      const st = (elapsed - FLASH_END) / (TOTAL - FLASH_END);
      shockMat.uniforms.uProgress.value = st;
      shockMat.uniforms.uAlpha.value    = Math.max(0, 1 - st * 1.4);
    }

    // ── Sparks ─────────────────────────────────────────────────────────────
    if (elapsed >= FLASH_END) {
      const st = (elapsed - FLASH_END);
      sparkRefs.current.forEach((m, i) => {
        if (!m) return;
        const sp = sparks[i];
        const arc = st * sp.speed;
        m.position.x = Math.cos(sp.angle) * arc;
        m.position.z = Math.sin(sp.angle) * arc;
        m.position.y = Math.max(0, sp.height * Math.sin((arc / sp.speed) * Math.PI));
        m.visible = st < 1.2;
      });
    }

    // ── Light ──────────────────────────────────────────────────────────────
    if (lightRef.current) {
      const base = elapsed < FLASH_END
        ? (1 - elapsed / FLASH_END) * 40
        : elapsed < PILLAR_END
          ? 18 * (1 - (elapsed - FLASH_END) / (PILLAR_END - FLASH_END))
          : 0;
      lightRef.current.intensity = base + (Math.random() > 0.5 ? 4 : 0);
    }
  });

  const [cx, , cz] = cast.target.direction;
  const PILLAR_H = 50;

  return (
    <group position={[cx, 0, cz]}>
      {/* Blinding flash sphere */}
      <mesh ref={flashRef} position={[0, 2, 0]} material={flashMat}>
        <sphereGeometry args={[6, 16, 16]} />
      </mesh>

      {/* Energy pillar (tall plane) */}
      <mesh
        ref={pillarRef}
        position={[0, PILLAR_H / 2, 0]}
        material={pillarMat}
      >
        <planeGeometry args={[1.8, PILLAR_H, 1, 20]} />
      </mesh>
      {/* Second pillar rotated 90° for thickness illusion */}
      <mesh
        position={[0, PILLAR_H / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        material={pillarMat}
      >
        <planeGeometry args={[1.8, PILLAR_H, 1, 20]} />
      </mesh>

      {/* Expanding shockwave ring on ground */}
      <mesh
        ref={shockRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.06, 0]}
        material={shockMat}
      >
        <planeGeometry args={[24, 24, 1, 1]} />
      </mesh>

      {/* Spark debris */}
      {sparks.map((sp, i) => (
        <mesh
          key={i}
          ref={el => { sparkRefs.current[i] = el; }}
          position={[0, 0, 0]}
          material={sparkMat}
        >
          <sphereGeometry args={[sp.size, 4, 4]} />
        </mesh>
      ))}

      {/* Blinding point light */}
      <pointLight
        ref={lightRef}
        color="#ddeeff"
        intensity={40}
        distance={35}
        decay={2}
      />
    </group>
  );
}
