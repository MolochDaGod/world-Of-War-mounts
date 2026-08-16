/**
 * MedievalNPCs — static townsfolk NPCs wandering near the town area.
 * All random values are pre-calculated at module level (no Math.random in JSX/render).
 */
import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MedievalModels } from '@/game/assets/CraftpixManifest';
import { useFBXCharacter, useAnimMixer, BaseFallback } from './CharacterBase';

// ─── Pre-calc all randomness at module level ──────────────────────────────────
const NPC_COUNT = 6;
const TOWN_CENTER: [number, number, number] = [-60, 0, -60];
const WANDER_RADIUS = 5;
const WANDER_INTERVAL = 5; // seconds per target

/**
 * Pre-computed NPC configs: fixed spawn position + initial wander targets.
 * Each NPC gets 8 pre-baked wander targets it cycles through.
 */
const NPC_CONFIGS = (() => {
  // Deterministic offsets — no Math.random, use golden-ratio spread
  const phi = 2.399963; // golden angle in radians
  return Array.from({ length: NPC_COUNT }, (_, i) => {
    const angle = i * phi;
    const r = WANDER_RADIUS * 0.5 * (0.4 + (i % 3) * 0.3);
    const spawnX = TOWN_CENTER[0] + Math.cos(angle) * r;
    const spawnZ = TOWN_CENTER[2] + Math.sin(angle) * r;

    // 8 wander targets per NPC — deterministic pattern
    const targets: [number, number, number][] = Array.from({ length: 8 }, (_, j) => {
      const a = angle + j * (Math.PI / 4) + i * 0.5;
      const wanderR = WANDER_RADIUS * (0.3 + ((i + j) % 4) * 0.15);
      return [
        TOWN_CENTER[0] + Math.cos(a) * wanderR,
        0,
        TOWN_CENTER[2] + Math.sin(a) * wanderR,
      ];
    });

    return {
      id: `npc_${i}`,
      spawnPos: [spawnX, 0, spawnZ] as [number, number, number],
      modelPath: MedievalModels.units[i % MedievalModels.units.length],
      targets,
    };
  });
})();

// ─── Single NPC FBX component ─────────────────────────────────────────────────
function NPCFigureFBX({
  spawnPos,
  modelPath,
  targets,
}: {
  spawnPos: [number, number, number];
  modelPath: string;
  targets: [number, number, number][];
}) {
  const { scene, animations } = useFBXCharacter(modelPath, MedievalModels.texture);
  const { playClip } = useAnimMixer(scene, animations);

  const groupRef = useRef<THREE.Group>(null);
  const targetIndexRef = useRef(0);
  const elapsedRef = useRef(0);
  const isMovingRef = useRef(false);

  // Set initial position synchronously on first render via ref callback
  const initRef = useRef(false);

  useFrame((_state, delta) => {
    const grp = groupRef.current;
    if (!grp) return;

    // Set initial position once
    if (!initRef.current) {
      grp.position.set(...spawnPos);
      initRef.current = true;
    }

    elapsedRef.current += delta;

    // Switch wander target every WANDER_INTERVAL seconds
    if (elapsedRef.current >= WANDER_INTERVAL) {
      elapsedRef.current = 0;
      targetIndexRef.current = (targetIndexRef.current + 1) % targets.length;
    }

    const target = targets[targetIndexRef.current];
    const dx = target[0] - grp.position.x;
    const dz = target[2] - grp.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.3) {
      // Walk toward target
      const speed = 1.2 * delta;
      grp.position.x += (dx / dist) * speed;
      grp.position.z += (dz / dist) * speed;
      grp.rotation.y = Math.atan2(dx, dz);

      if (!isMovingRef.current) {
        isMovingRef.current = true;
        playClip('walk');
      }
    } else {
      // Idle
      if (isMovingRef.current) {
        isMovingRef.current = false;
        playClip('idle');
      }
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

// ─── Per-NPC wrapper with Suspense ────────────────────────────────────────────
function NPCFigure({
  config,
}: {
  config: (typeof NPC_CONFIGS)[number];
}) {
  return (
    <Suspense
      fallback={
        <group position={config.spawnPos}>
          <BaseFallback color="#9e8a60" />
        </group>
      }
    >
      <NPCFigureFBX
        spawnPos={config.spawnPos}
        modelPath={config.modelPath}
        targets={config.targets}
      />
    </Suspense>
  );
}

// ─── MedievalNPCs ─────────────────────────────────────────────────────────────
export function MedievalNPCs() {
  return (
    <group name="medieval-npcs">
      {NPC_CONFIGS.map((cfg) => (
        <NPCFigure key={cfg.id} config={cfg} />
      ))}
    </group>
  );
}
