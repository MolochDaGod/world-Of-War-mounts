import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

const grassVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  uniform float uTime;
  
  void main() {
    vUv = uv;
    vNormal = normal;
    
    // Transform position
    vec3 pos = position;
    
    // Sway only the top vertices (assuming UV.y > 0 is top)
    float sway = sin(pos.x * 0.5 + uTime) * cos(pos.z * 0.5 + uTime * 0.8) * 0.2;
    pos.x += sway * vUv.y;
    pos.z += sway * vUv.y * 0.5;
    
    // Instance matrix application
    vec4 mvPosition = viewMatrix * instanceMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const grassFragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  
  void main() {
    vec3 baseColor = vec3(0.2, 0.4, 0.1);
    vec3 tipColor = vec3(0.4, 0.7, 0.2);
    
    // Gradient from bottom to top
    vec3 color = mix(baseColor, tipColor, vUv.y);
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function GrassField() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 20000;
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }
  }), []);

  const customMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
      uniforms,
      side: THREE.DoubleSide,
    });
  }, [uniforms]);

  // Set positions once
  useMemo(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 80;
      const z = (Math.random() - 0.5) * 80;
      dummy.position.set(x, 0, z);
      dummy.rotation.y = Math.random() * Math.PI;
      // random scale
      const scale = 0.5 + Math.random() * 0.5;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  useFrame((state) => {
    if (customMaterial) {
      customMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow material={customMaterial}>
      {/* Simple blade of grass geometry */}
      <planeGeometry args={[0.2, 1, 1, 4]} />
    </instancedMesh>
  );
}
