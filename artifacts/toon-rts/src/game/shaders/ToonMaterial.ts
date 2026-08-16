import * as THREE from 'three';

const toonVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const toonFragmentShader = `
  uniform vec3 uColor;
  uniform vec3 uTeamColor;
  uniform float uTeamWeight;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;
  
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    // Hardcoded directional light for toon shading
    vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
    
    float ndotl = dot(normal, lightDir);
    
    // 3-step cel ramp
    float intensity = 0.2; // shadow
    if(ndotl > 0.5) {
      intensity = 1.0; // highlight
    } else if(ndotl > 0.0) {
      intensity = 0.6; // midtone
    }
    
    // Rim light
    float rimDot = 1.0 - max(dot(viewDir, normal), 0.0);
    float rimIntensity = smoothstep(0.7, 1.0, rimDot) * max(dot(normal, lightDir), 0.0);
    
    vec3 baseColor = mix(uColor, uTeamColor, uTeamWeight);
    vec3 finalColor = baseColor * intensity + vec3(rimIntensity * 0.5);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export class ToonMaterial extends THREE.ShaderMaterial {
  constructor(color: THREE.Color, teamColor: THREE.Color = new THREE.Color(1,1,1), teamWeight: number = 0) {
    super({
      uniforms: {
        uColor: { value: color },
        uTeamColor: { value: teamColor },
        uTeamWeight: { value: teamWeight }
      },
      vertexShader: toonVertexShader,
      fragmentShader: toonFragmentShader,
      side: THREE.DoubleSide
    });
  }
}
