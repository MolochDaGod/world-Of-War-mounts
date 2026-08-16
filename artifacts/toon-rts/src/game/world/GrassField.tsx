import * as THREE from 'three';
import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

const grassVertexShader = /* glsl */`
  varying vec2 vUv;
  varying vec3 vColor;
  uniform float uTime;
  
  void main() {
    vUv = uv;
    
    vec3 pos = position;
    
    // Wind sway — only affects top of blade (uv.y near 1)
    float windStrength = vUv.y * vUv.y;
    float windX = sin(instanceMatrix[3].x * 0.4 + uTime * 1.2) * 0.3 * windStrength;
    float windZ = cos(instanceMatrix[3].z * 0.4 + uTime * 0.9) * 0.15 * windStrength;
    pos.x += windX;
    pos.z += windZ;
    
    // Color variation per blade using instance position as seed
    float seed = fract(instanceMatrix[3].x * 0.1731 + instanceMatrix[3].z * 0.2371);
    vColor = mix(vec3(0.12, 0.35, 0.08), vec3(0.35, 0.62, 0.15), seed);
    
    // Tip color brightening
    vColor = mix(vColor, vColor * 1.4, vUv.y);
    
    vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const grassFragmentShader = /* glsl */`
  varying vec2 vUv;
  varying vec3 vColor;
  
  void main() {
    // Back-scatter: brighter at tip (translucency sim)
    float backlightLobe = pow(1.0 - vUv.y, 3.0) * 0.3;
    vec3 color = vColor + backlightLobe;
    
    // Alpha cutout at top for tapered look
    float alpha = step(vUv.x, 1.0 - vUv.y * 0.6);
    
    if (alpha < 0.1) discard;
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Pre-calculate all blade transforms outside component to avoid useMemo/ref issues
const BLADE_COUNT = 18000;
const bladeMatrices = (() => {
  const dummy = new THREE.Object3D();
  const matrices: THREE.Matrix4[] = [];
  for (let i = 0; i < BLADE_COUNT; i++) {
    const x = (Math.random() - 0.5) * 90;
    const z = (Math.random() - 0.5) * 90;
    const ry = Math.random() * Math.PI;
    const scale = 0.6 + Math.random() * 0.6;
    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, ry, 0);
    dummy.scale.set(scale, scale + Math.random() * 0.4, scale);
    dummy.updateMatrix();
    matrices.push(dummy.matrix.clone());
  }
  return matrices;
})();

export function GrassField() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: grassVertexShader,
    fragmentShader: grassFragmentShader,
    uniforms,
    side: THREE.DoubleSide,
    alphaTest: 0.1,
  }), [uniforms]);

  const geometry = useMemo(() => {
    // Tapered blade: narrow at top, wider at base
    const g = new THREE.PlaneGeometry(0.15, 1.2, 1, 4);
    // Squeeze vertices toward top for taper
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = (y + 0.6) / 1.2; // 0 at bottom, 1 at top
      pos.setX(i, pos.getX(i) * (1.0 - t * 0.8));
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, []);

  // Set instance matrices AFTER mesh is mounted
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < BLADE_COUNT; i++) {
      mesh.setMatrixAt(i, bladeMatrices[i]);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []); // empty dep array: run once after mount

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, BLADE_COUNT]}
      castShadow
    />
  );
}
