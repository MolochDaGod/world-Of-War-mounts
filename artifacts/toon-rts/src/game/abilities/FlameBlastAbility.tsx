/**
 * FlameBlastAbility — uses the cartoonish_flame.glb asset as the core VFX.
 *
 * The GLB is cloned, auto-plays its first animation, scaled up over 0.4 s,
 * lingers 1.6 s, then fades out (total ≈ 2.8 s).
 * A ring of secondary ember particles + point light complete the effect.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AbilityTarget, useGameStore } from '../store/gameStore';

const FLAME_GLB = '/assets/effects/cartoonish_flame.glb';
// No module-level preload — 34 MB GLB loads lazily on first cast

// ── Ember particles ───────────────────────────────────────────────────────
const EMBER_COUNT = 24;
const embers = Array.from({ length: EMBER_COUNT }, (_, i) => ({
  angle:  (i / EMBER_COUNT) * Math.PI * 2 + Math.random() * 0.4,
  speed:  2.0 + Math.random() * 4.5,
  height: 0.5 + Math.random() * 5.0,
  size:   0.12 + Math.random() * 0.22,
  drift:  (Math.random() - 0.5) * 0.8,
}));

const TOTAL_DURATION = 2.8;
const RISE_END       = 0.4;
const LINGER_END     = 2.0; // fade starts here

export function FlameBlastAbility({
  cast,
}: {
  cast: { id: string; target: AbilityTarget; startTime: number };
}) {
  const { scene, animations } = useGLTF(FLAME_GLB);
  const removeCast = useGameStore(s => s.removeCast);

  // Clone scene so each cast has independent animation state
  const cloned = useMemo(() => {
    const c = SkeletonUtils.clone(scene) as THREE.Group;
    c.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      // Ensure emissive orange glow on all meshes
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      mat.emissive     = new THREE.Color('#ff4400');
      mat.emissiveIntensity = 0.6;
      mat.transparent  = true;
      mesh.material    = mat;
    });
    return c;
  }, [scene]);

  const { actions } = useAnimations(animations, cloned);

  // Auto-play first animation clip if any
  useEffect(() => {
    const first = Object.values(actions)[0];
    if (first) {
      first.reset()
        .setLoop(THREE.LoopRepeat, Infinity)
        .setEffectiveTimeScale(1.2)
        .play();
    }
  }, [actions]);

  const groupRef    = useRef<THREE.Group>(null);
  const lightRef    = useRef<THREE.PointLight>(null);
  const emberRefs   = useRef<(THREE.Mesh | null)[]>([]);

  const emberMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ff6600',
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  useFrame(() => {
    const elapsed = (Date.now() - cast.startTime) / 1000;
    if (elapsed > TOTAL_DURATION) { removeCast(cast.id); return; }

    // Scale / fade envelope
    let scale: number;
    let opacity: number;
    if (elapsed < RISE_END) {
      scale   = elapsed / RISE_END;
      opacity = scale;
    } else if (elapsed < LINGER_END) {
      scale   = 1.0;
      opacity = 1.0;
    } else {
      const t = (elapsed - LINGER_END) / (TOTAL_DURATION - LINGER_END);
      scale   = 1.0 - t * 0.3;
      opacity = 1.0 - t;
    }

    // Apply to GLB clone
    if (groupRef.current) {
      groupRef.current.scale.setScalar(Math.max(0, scale) * 4.0);
      cloned.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        (mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, opacity);
      });
    }

    // Ember arcs
    const et = elapsed - RISE_END * 0.3;
    if (et > 0) {
      emberRefs.current.forEach((m, i) => {
        if (!m) return;
        const e = embers[i];
        const arc = et * e.speed;
        m.position.x = Math.cos(e.angle + et * e.drift) * arc;
        m.position.z = Math.sin(e.angle + et * e.drift) * arc;
        m.position.y = Math.max(0, e.height * Math.sin((Math.min(arc / e.speed, 1.0)) * Math.PI));
        emberMat.opacity = Math.max(0, opacity * (1 - arc / (e.speed * TOTAL_DURATION)));
      });
    }

    // Flickering orange light
    if (lightRef.current) {
      lightRef.current.intensity = opacity * (8 + Math.random() * 5);
    }
  });

  const [cx, , cz] = cast.target.direction;

  return (
    <group position={[cx, 0, cz]}>
      {/* Animated GLB flame */}
      <group ref={groupRef}>
        <primitive object={cloned} />
      </group>

      {/* Ember debris */}
      {embers.map((e, i) => (
        <mesh
          key={i}
          ref={el => { emberRefs.current[i] = el; }}
          position={[0, 0, 0]}
          material={emberMat}
        >
          <sphereGeometry args={[e.size, 4, 4]} />
        </mesh>
      ))}

      {/* Dynamic orange light */}
      <pointLight
        ref={lightRef}
        color="#ff5500"
        intensity={8}
        distance={22}
        decay={2}
      />
    </group>
  );
}
