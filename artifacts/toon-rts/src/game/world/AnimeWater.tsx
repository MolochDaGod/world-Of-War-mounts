import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const waterVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  uniform float uTime;
  
  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    // Simple wave distortion
    worldPosition.y += sin(worldPosition.x * 0.5 + uTime) * 0.2 + cos(worldPosition.z * 0.5 + uTime) * 0.2;
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const waterFragmentShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  uniform float uTime;
  
  void main() {
    // Basic toon water pattern
    vec2 p = vUv * 20.0;
    float noise = sin(p.x + uTime) * cos(p.y + uTime);
    
    vec3 deepColor = vec3(0.0, 0.3, 0.6);
    vec3 shallowColor = vec3(0.2, 0.6, 0.8);
    vec3 highlightColor = vec3(0.8, 0.9, 1.0);
    
    vec3 color = mix(deepColor, shallowColor, smoothstep(-1.0, 1.0, noise));
    if (noise > 0.8) {
      color = highlightColor;
    }
    
    gl_FragColor = vec4(color, 0.8);
  }
`;

export function AnimeWater() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }
  }), []);
  
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[100, 100, 32, 32]} />
      <shaderMaterial 
        ref={materialRef}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
