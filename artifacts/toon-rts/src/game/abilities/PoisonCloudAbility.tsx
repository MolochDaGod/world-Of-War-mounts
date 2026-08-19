/**
 * PoisonCloudAbility — a billowing toxic cloud that rises from the ground,
 * lingers, then disperses. Rendered as layered transparent discs + rising
 * particles driven by a custom GLSL shader.
 *
 * Duration: ~3.5 s total (rise 0.6 s, linger 2.0 s, fade 0.9 s)
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AbilityTarget, useGameStore } from '../store/gameStore';

// ── Particle config ────────────────────────────────────────────────────────
const PUFF_COUNT = 18;
const puffs = Array.from({ length: PUFF_COUNT }, (_, i) => ({
  ox:    (Math.random() - 0.5) * 10,
  oz:    (Math.random() - 0.5) * 10,
  speed: 0.8 + Math.random() * 1.2,
  size:  2.0 + Math.random() * 3.5,
  phase: (i / PUFF_COUNT) * Math.PI * 2,
  rot:   Math.random() * Math.PI * 2,
}));

// ── Shader: swirling toxic cloud disc ─────────────────────────────────────
const cloudVert = /* glsl */`
  varying vec2 vUv;
  uniform float uTime;
  uniform float uRot;
  void main() {
    vUv = uv;
    vec3 pos = position;
    // Slow swirl: rotate the disc verts around Y
    float angle = uTime * 0.4 + uRot;
    float s = sin(angle), c = cos(angle);
    float x2 = pos.x * c - pos.z * s;
    float z2 = pos.x * s + pos.z * c;
    pos.x = x2; pos.z = z2;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const cloudFrag = /* glsl */`
  varying vec2 vUv;
  uniform float uAlpha;
  uniform float uTime;
  void main() {
    vec2 d = vUv - 0.5;
    float r = length(d);
    // Soft round falloff with wispy edge
    float wisp = sin(atan(d.y, d.x) * 6.0 + uTime * 2.0) * 0.08;
    float mask = 1.0 - smoothstep(0.3 + wisp, 0.5, r);
    // Colour: sickly yellow-green gradient
    vec3 inner = vec3(0.55, 0.90, 0.15);
    vec3 outer = vec3(0.20, 0.55, 0.05);
    vec3 col = mix(outer, inner, mask);
    gl_FragColor = vec4(col, mask * uAlpha);
  }
`;

export function PoisonCloudAbility({
  cast,
}: {
  cast: { id: string; target: AbilityTarget; startTime: number };
}) {
  const groupRef   = useRef<THREE.Group>(null);
  const lightRef   = useRef<THREE.PointLight>(null);
  const puffRefs   = useRef<(THREE.Mesh | null)[]>([]);
  const removeCast = useGameStore(s => s.removeCast);

  const TOTAL   = 3.5;
  const RISE    = 0.6;
  const LINGER  = 2.0;
  // fade starts at RISE+LINGER = 2.6

  const puffMats = useMemo(() =>
    puffs.map(p =>
      new THREE.ShaderMaterial({
        vertexShader:   cloudVert,
        fragmentShader: cloudFrag,
        uniforms: {
          uTime:  { value: 0 },
          uAlpha: { value: 0 },
          uRot:   { value: p.rot },
        },
        transparent: true,
        depthWrite:  false,
        side:        THREE.DoubleSide,
        blending:    THREE.NormalBlending,
      })
    ),
  []);

  const groundMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#33ff00',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  useFrame((state) => {
    const elapsed = (Date.now() - cast.startTime) / 1000;
    if (elapsed > TOTAL) { removeCast(cast.id); return; }

    // Alpha envelope
    let alpha: number;
    if (elapsed < RISE) {
      alpha = elapsed / RISE;
    } else if (elapsed < RISE + LINGER) {
      alpha = 1.0;
    } else {
      alpha = 1.0 - (elapsed - RISE - LINGER) / (TOTAL - RISE - LINGER);
    }
    alpha = Math.max(0, Math.min(1, alpha));

    const t = state.clock.elapsedTime;

    puffRefs.current.forEach((m, i) => {
      if (!m) return;
      const p = puffs[i];
      // Rise upward during rise phase, drift slowly after
      const riseY = elapsed < RISE
        ? (elapsed / RISE) * 2.5
        : 2.5 + (elapsed - RISE) * p.speed * 0.3;

      m.position.x = p.ox + Math.sin(t * 0.5 + p.phase) * 0.4;
      m.position.y = riseY;
      m.position.z = p.oz + Math.cos(t * 0.4 + p.phase) * 0.4;

      // Scale puff up as it rises
      const sc = p.size * Math.min(1, elapsed / RISE + 0.2);
      m.scale.setScalar(sc);

      const mat = puffMats[i];
      mat.uniforms.uTime.value  = t;
      mat.uniforms.uAlpha.value = alpha * (0.55 + 0.15 * Math.sin(t + p.phase));
    });

    // Ground glow ring
    groundMat.opacity = alpha * 0.35;

    // Sickly green light
    if (lightRef.current) {
      lightRef.current.intensity = alpha * 4.0 + Math.sin(t * 3) * 0.5;
    }
  });

  const [cx, , cz] = cast.target.direction;

  return (
    <group ref={groupRef} position={[cx, 0, cz]}>
      {/* Ground splatter ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} material={groundMat}>
        <ringGeometry args={[0, 7, 40]} />
      </mesh>

      {/* Cloud puffs */}
      {puffs.map((_, i) => (
        <mesh
          key={i}
          ref={el => { puffRefs.current[i] = el; }}
          rotation={[-Math.PI / 2, 0, 0]}
          material={puffMats[i]}
        >
          {/* PlaneGeometry — rotated flat, swirled by shader */}
          <planeGeometry args={[1, 1, 1, 1]} />
        </mesh>
      ))}

      {/* Toxic green point light */}
      <pointLight
        ref={lightRef}
        color="#66ff22"
        intensity={4}
        distance={18}
        decay={2}
      />
    </group>
  );
}
