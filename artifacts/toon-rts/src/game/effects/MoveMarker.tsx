/**
 * MoveMarker — expanding ring VFX shown at RMB move command destinations.
 * emitMoveMarker() is called by RTSInputController on RMB ground click.
 * The R3F component polls the module-level list at ~10 fps via state sync.
 */
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Marker { id: number; pos: THREE.Vector3; life: number; maxLife: number }

let _markers: Marker[] = [];
let _nextId = 0;

export function emitMoveMarker(pos: [number, number, number]) {
  _markers.push({
    id: _nextId++,
    pos: new THREE.Vector3(pos[0], 0.06, pos[2]),
    life: 1.6,
    maxLife: 1.6,
  });
}

// ── Single marker mesh ────────────────────────────────────────────────────────
function MarkerMesh({ marker }: { marker: Marker }) {
  const groupRef = useRef<THREE.Group>(null);
  const matRefs  = useRef<THREE.MeshBasicMaterial[]>([]);

  useFrame((_, dt) => {
    marker.life -= dt;
    if (!groupRef.current) return;
    const t = 1 - marker.life / marker.maxLife;          // 0→1
    const scale = 0.4 + t * 2.8;
    const opacity = Math.max(0, (1 - t) * 1.4);
    groupRef.current.scale.setScalar(scale);
    for (const mat of matRefs.current) mat.opacity = opacity;
  });

  const collectMat = (mat: THREE.MeshBasicMaterial | null) => {
    if (mat && !matRefs.current.includes(mat)) matRefs.current.push(mat);
  };

  return (
    <group ref={groupRef} position={marker.pos} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Outer ring */}
      <mesh>
        <ringGeometry args={[0.82, 1.0, 40]} />
        <meshBasicMaterial
          ref={collectMat}
          color="#44ff88"
          transparent
          opacity={1}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Inner pulse ring */}
      <mesh scale={[0.55, 0.55, 0.55]}>
        <ringGeometry args={[0.82, 1.0, 40]} />
        <meshBasicMaterial
          ref={collectMat}
          color="#aaffcc"
          transparent
          opacity={1}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Cross — vertical bar */}
      <mesh>
        <planeGeometry args={[0.08, 0.9]} />
        <meshBasicMaterial
          ref={collectMat}
          color="#44ff88"
          transparent
          opacity={1}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Cross — horizontal bar */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[0.08, 0.9]} />
        <meshBasicMaterial
          ref={collectMat}
          color="#44ff88"
          transparent
          opacity={1}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ── Main system component ────────────────────────────────────────────────────
export function MoveMarker() {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const lastSync = useRef(0);

  useFrame((state) => {
    // Expire old markers
    _markers = _markers.filter(m => m.life > 0);
    const now = state.clock.elapsedTime;
    if (now - lastSync.current > 0.08) {
      lastSync.current = now;
      setMarkers([..._markers]);
    }
  });

  return (
    <group name="move-markers">
      {markers.map(m => <MarkerMesh key={m.id} marker={m} />)}
    </group>
  );
}
