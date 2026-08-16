import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const waterVert = /* glsl */`
  varying vec2 vWorldXZ;
  uniform float uTime;
  
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    // Gentle wave displacement
    worldPos.y += sin(worldPos.x * 0.4 + uTime * 0.8) * 0.18
                + cos(worldPos.z * 0.35 + uTime * 1.1) * 0.14;
    vWorldXZ = worldPos.xz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const waterFrag = /* glsl */`
  varying vec2 vWorldXZ;
  uniform float uTime;
  
  // Smooth voronoi — returns (F1, F2)
  vec2 voronoi(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float F1 = 8.0, F2 = 8.0;
    for (int x = -1; x <= 1; x++) {
      for (int y = -1; y <= 1; y++) {
        vec2 g = vec2(float(x), float(y));
        vec2 o = fract(sin(vec2(
          dot(i + g, vec2(127.1, 311.7)),
          dot(i + g, vec2(269.5, 183.3))
        )) * 43758.5453);
        // Animate cell centers
        o = 0.5 + 0.45 * sin(uTime * 0.6 + 6.2831 * o);
        float d = length(f - g - o);
        if (d < F1) { F2 = F1; F1 = d; }
        else if (d < F2) { F2 = d; }
      }
    }
    return vec2(F1, F2);
  }
  
  void main() {
    vec2 uv = vWorldXZ * 0.18;
    uv += vec2(uTime * 0.03, uTime * 0.02); // slow drift
    
    vec2 vor = voronoi(uv);
    float edge = vor.y - vor.x; // cell edge mask
    
    // Cel-shaded 3-stop ramp
    vec3 deep      = vec3(0.03, 0.22, 0.48);
    vec3 mid       = vec3(0.08, 0.45, 0.72);
    vec3 highlight = vec3(0.65, 0.88, 1.00);
    
    float t1 = smoothstep(0.05, 0.18, edge);
    float t2 = smoothstep(0.22, 0.32, edge);
    vec3 col = mix(deep, mid, t1);
    col = mix(col, highlight, t2);
    
    // Hard-edged cell highlight stripe
    float stripe = step(0.38, edge) * step(edge, 0.42);
    col = mix(col, vec3(1.0), stripe * 0.6);
    
    gl_FragColor = vec4(col, 0.82);
  }
`;

export function AnimeWater() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { camera }  = useThree();

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  // Follow camera in XZ for "infinite" water feel
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
    if (meshRef.current) {
      meshRef.current.position.x = camera.position.x;
      meshRef.current.position.z = camera.position.z;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, -0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Large enough to always fill view */}
      <planeGeometry args={[200, 200, 48, 48]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={waterVert}
        fragmentShader={waterFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
