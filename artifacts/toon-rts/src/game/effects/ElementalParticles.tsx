/**
 * ElementalParticles — small, shader-driven particle clouds for battlefield VFX.
 *
 * The smoke/fire references use many soft sprites with turbulent rise rather
 * than a single opaque mesh. This keeps the effect lightweight and gives each
 * particle independent motion while the CPU only updates two uniforms.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type ParticleTheme = 'fire' | 'smoke';

interface ElementalParticleBurstProps {
  theme: ParticleTheme;
  startedAt: number;
  duration?: number;
  intensity?: number;
}

const PARTICLE_COUNT: Record<ParticleTheme, number> = {
  fire: 54,
  smoke: 42,
};

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aVelocity;

  uniform float uTime;
  uniform float uDuration;
  uniform float uTheme;

  varying float vLife;
  varying float vSeed;

  void main() {
    float life = clamp(uTime / uDuration, 0.0, 1.0);
    vec3 pos = position + aVelocity * uTime;
    float turbulence = 0.18 + uTheme * 0.14;
    float swirl = sin(uTime * (2.0 + aSeed * 3.0) + aSeed * 6.2831);
    float billow = cos(uTime * (1.4 + aSeed * 2.0) + aSeed * 4.2);
    pos.x += swirl * turbulence * (0.35 + life);
    pos.z += billow * turbulence * (0.35 + life);
    pos.y += sin(uTime * 2.0 + aSeed * 8.0) * (uTheme > 0.5 ? 0.08 : 0.16);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float sizePulse = 0.82 + 0.28 * sin(aSeed * 12.0 + uTime * 4.0);
    float growth = uTheme > 0.5 ? 0.8 + life * 1.4 : 0.65 + life * 1.8;
    gl_PointSize = aSize * sizePulse * growth * (300.0 / max(1.0, -mvPosition.z));
    gl_Position = projectionMatrix * mvPosition;

    vLife = life;
    vSeed = aSeed;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  uniform float uTheme;

  varying float vLife;
  varying float vSeed;

  void main() {
    vec2 centered = gl_PointCoord - 0.5;
    float distanceFromCenter = length(centered) * 2.0;
    float softEdge = pow(max(0.0, 1.0 - distanceFromCenter), 1.65);
    if (softEdge < 0.01) discard;

    vec3 color;
    float alpha = softEdge * uOpacity;
    if (uTheme < 0.5) {
      float heat = clamp(1.0 - vLife * 0.85 + sin(vSeed * 17.0) * 0.08, 0.0, 1.0);
      vec3 ember = vec3(0.95, 0.08, 0.008);
      vec3 orange = vec3(1.0, 0.38, 0.015);
      vec3 hot = vec3(1.0, 0.92, 0.28);
      color = mix(ember, orange, heat);
      color = mix(color, hot, heat * heat * 0.75);
      alpha *= 1.0 - vLife * 0.48;
    } else {
      float shade = 0.13 + 0.11 * sin(vSeed * 23.0);
      color = vec3(shade * 1.15, shade * 1.08, shade);
      alpha *= (1.0 - vLife * 0.58);
    }

    gl_FragColor = vec4(color, alpha);
  }
`;

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 91.17 + salt * 17.31) * 43758.5453;
  return value - Math.floor(value);
}

export function ElementalParticleBurst({
  theme,
  startedAt,
  duration = theme === 'fire' ? 2.2 : 1.65,
  intensity = 1,
}: ElementalParticleBurstProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const count = PARTICLE_COUNT[theme];
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const x = seeded(i, 1) - 0.5;
      const y = seeded(i, 2);
      const z = seeded(i, 3) - 0.5;
      const seed = seeded(i, 4);
      const baseScale = theme === 'fire' ? 2.4 : 2.9;
      const rise = theme === 'fire'
        ? 1.35 + seeded(i, 5) * 3.4
        : 0.7 + seeded(i, 5) * 1.9;

      positions[i * 3] = x * baseScale;
      positions[i * 3 + 1] = y * (theme === 'fire' ? 0.45 : 0.75);
      positions[i * 3 + 2] = z * baseScale;
      velocities[i * 3] = (seeded(i, 6) - 0.5) * (theme === 'fire' ? 0.75 : 0.42);
      velocities[i * 3 + 1] = rise;
      velocities[i * 3 + 2] = (seeded(i, 7) - 0.5) * (theme === 'fire' ? 0.75 : 0.42);
      sizes[i] = (theme === 'fire' ? 17 : 24) * (0.62 + seed * 0.85);
      seeds[i] = seed;
    }

    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    next.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    next.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    next.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    return next;
  }, [count, theme]);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uDuration: { value: duration },
      uOpacity: { value: 0 },
      uTheme: { value: theme === 'fire' ? 0 : 1 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: theme === 'fire' ? THREE.AdditiveBlending : THREE.NormalBlending,
  }), [duration, theme]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame(() => {
    const elapsed = Math.max(0, (Date.now() - startedAt) / 1000);
    const fadeIn = Math.min(1, elapsed / (theme === 'fire' ? 0.1 : 0.18));
    const fadeOut = Math.max(0, 1 - Math.max(0, elapsed - duration * 0.66) / (duration * 0.34));
    material.uniforms.uTime.value = Math.min(elapsed, duration);
    material.uniforms.uOpacity.value = fadeIn * fadeOut * intensity;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}