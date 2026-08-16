import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AbilityTarget, useGameStore } from '../store/gameStore';

// Pre-calc debris offsets
const DEBRIS_COUNT = 12;
const debris = Array.from({ length: DEBRIS_COUNT }, () => ({
  dx: (Math.random() - 0.5) * 12,
  dz: (Math.random() - 0.5) * 12,
  speed: 3 + Math.random() * 4,
  size: 0.3 + Math.random() * 0.5,
  phase: Math.random() * Math.PI * 2,
}));

const meteorVert = /* glsl */`
  varying vec3 vNormal;
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const meteorFrag = /* glsl */`
  varying vec3 vNormal;
  varying vec2 vUv;
  uniform float uHeat;  // 0=cool 1=molten
  void main() {
    float ndotl = dot(vNormal, normalize(vec3(1,1,0.5)));
    float cel = ndotl > 0.6 ? 1.0 : ndotl > 0.2 ? 0.6 : 0.2;
    vec3 cool  = vec3(0.4, 0.3, 0.25);
    vec3 hot   = vec3(1.0, 0.5, 0.05);
    vec3 white = vec3(1.0, 0.9, 0.7);
    vec3 base  = mix(cool, hot, uHeat);
    base = mix(base, white, max(0.0, uHeat - 0.7) * 3.0);
    gl_FragColor = vec4(base * cel, 1.0);
  }
`;

export function MeteorAbility({ cast }: { cast: { id: string; target: AbilityTarget; startTime: number } }) {
  const meteorRef   = useRef<THREE.Mesh>(null);
  const debrisRefs  = useRef<(THREE.Mesh | null)[]>([]);
  const craterRef   = useRef<THREE.Mesh>(null);
  const lightRef    = useRef<THREE.PointLight>(null);
  const { removeCast } = useGameStore();

  const [cx, , cz] = cast.target.direction;
  const startY = 80;

  const meteorMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: meteorVert,
    fragmentShader: meteorFrag,
    uniforms: { uHeat: { value: 0.0 } },
  }), []);

  const debrisMat = useMemo(() => new THREE.MeshLambertMaterial({ color: '#7a5035' }), []);

  const craterMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#331100',
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  }), []);

  useFrame((state) => {
    const elapsed = (Date.now() - cast.startTime) / 1000;
    const flightDuration = 1.5;

    if (elapsed > flightDuration + 2.0) { removeCast(cast.id); return; }

    if (elapsed < flightDuration) {
      // FLIGHT phase
      const t = elapsed / flightDuration;
      const ease = t * t; // accelerate
      if (meteorRef.current) {
        meteorRef.current.position.y = startY * (1 - ease);
        meteorRef.current.rotation.x += 0.05;
        meteorRef.current.rotation.z += 0.03;
        // Heat up
        meteorMat.uniforms.uHeat.value = ease;
        meteorRef.current.scale.setScalar(1 + ease * 1.5);
      }
      if (lightRef.current) {
        lightRef.current.intensity = ease * 20;
        lightRef.current.position.set(cx, startY * (1 - ease), cz);
      }
    } else {
      // IMPACT phase
      const it = elapsed - flightDuration;
      if (meteorRef.current) meteorRef.current.visible = false;

      // Crater appears
      if (craterRef.current) {
        craterMat.opacity = Math.min(it * 3, 0.7);
        craterRef.current.scale.setScalar(Math.min(it * 8, 1));
      }
      if (lightRef.current) {
        lightRef.current.intensity = Math.max(0, 20 - it * 15);
        lightRef.current.position.set(cx, 1, cz);
      }

      // Debris arcs
      debrisRefs.current.forEach((m, i) => {
        if (!m) return;
        const db = debris[i];
        const arc = it * db.speed;
        m.position.x = (arc / db.speed) * db.dx;
        m.position.z = (arc / db.speed) * db.dz;
        m.position.y = Math.max(0, arc * 1.5 - arc * arc * 0.5); // parabola
        m.rotation.x += 0.1;
      });
    }
  });

  return (
    <group position={[cx, 0, cz]}>
      {/* Meteor */}
      <mesh ref={meteorRef} position={[0, startY, 0]} material={meteorMat} castShadow>
        <icosahedronGeometry args={[2.5, 1]} />
      </mesh>

      {/* Crater ground */}
      <mesh ref={craterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} material={craterMat}>
        <circleGeometry args={[8, 32]} />
      </mesh>

      {/* Debris chunks */}
      {debris.map((db, i) => (
        <mesh
          key={i}
          ref={el => { debrisRefs.current[i] = el; }}
          position={[0, 0, 0]}
          material={debrisMat}
          castShadow
        >
          <dodecahedronGeometry args={[db.size, 0]} />
        </mesh>
      ))}

      {/* Dynamic light */}
      <pointLight ref={lightRef} color="#ff7700" intensity={0} distance={30} decay={2} />
    </group>
  );
}
