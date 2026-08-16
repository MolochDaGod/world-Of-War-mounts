/**
 * ResourceNodes — renders interactable resource nodes from worldStore.
 * Mines use FBX models; trees use procedural cone+cylinder geometry.
 * Non-depleted nodes show a pulsing green glow ring.
 * Click to gather +5 resources.
 */
import * as THREE from 'three';
import { Suspense, useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { useFBX, Html } from '@react-three/drei';
import { TextureLoader, MeshLambertMaterial } from 'three';
import { useWorldStore, ResourceNode } from '@/game/store/worldStore';
import { MineModels } from '@/game/assets/CraftpixManifest';

// ── Glow ring under node ───────────────────────────────────────────────────────
function GlowRing({ position }: { position: [number, number, number] }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const t = clock.elapsedTime;
    const pulse = 0.85 + Math.sin(t * 2.5) * 0.15;
    ringRef.current.scale.setScalar(pulse);
  });

  return (
    <mesh
      ref={ringRef}
      position={[position[0], position[1] + 0.05, position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <torusGeometry args={[1.2, 0.12, 8, 32]} />
      <meshBasicMaterial color="#44ff88" transparent opacity={0.6} />
    </mesh>
  );
}

// ── Floating +5 text ──────────────────────────────────────────────────────────
function FloatingText({ position }: { position: [number, number, number] }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(id);
  }, []);

  if (!visible) return null;

  return (
    <Html position={[position[0], position[1] + 3, position[2]]} center>
      <div style={{
        color: '#ffdd44',
        fontWeight: 'bold',
        fontSize: '16px',
        textShadow: '1px 1px 2px #000',
        pointerEvents: 'none',
        userSelect: 'none',
      }}>+5</div>
    </Html>
  );
}

// ── Mine FBX model ────────────────────────────────────────────────────────────
interface MineModelProps {
  modelPath: string;
  node: ResourceNode;
  onGather: () => void;
}

function MineModel({ modelPath, node, onGather }: MineModelProps) {
  const fbx = useFBX(modelPath);
  const texture = useLoader(TextureLoader, MineModels.texture);
  const [showText, setShowText] = useState(false);

  const mat = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    return new MeshLambertMaterial({ map: texture });
  }, [texture]);

  useEffect(() => () => { mat.dispose(); }, [mat]);

  const cloned = useMemo(() => {
    const clone = fbx.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        // Clone the geometry so this instance owns it and can safely dispose it
        mesh.geometry = mesh.geometry.clone();
        mesh.material = mat;
        mesh.castShadow = true;
      }
    });
    return clone;
  }, [fbx, mat]);

  useEffect(() => () => {
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).geometry.dispose();
      }
    });
  }, [cloned]);

  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    onGather();
    setShowText(true);
    setTimeout(() => setShowText(false), 1500);
  }, [onGather]);

  return (
    <group
      position={node.position}
      scale={0.01}
      onClick={handleClick}
    >
      <primitive object={cloned} />
      {showText && <FloatingText position={[0, 0, 0]} />}
    </group>
  );
}

// ── Procedural resource tree ──────────────────────────────────────────────────
interface ResourceTreeProps {
  node: ResourceNode;
  onGather: () => void;
}

function ResourceTree({ node, onGather }: ResourceTreeProps) {
  const [showText, setShowText] = useState(false);

  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    onGather();
    setShowText(true);
    setTimeout(() => setShowText(false), 1500);
  }, [onGather]);

  return (
    <group position={node.position} onClick={handleClick}>
      {/* Trunk */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 2, 6]} />
        <meshLambertMaterial color="#2d5a1b" />
      </mesh>
      {/* Foliage */}
      <mesh position={[0, 3.2, 0]} castShadow>
        <coneGeometry args={[1.4, 3, 7]} />
        <meshLambertMaterial color="#4a7c3f" />
      </mesh>
      {showText && <FloatingText position={[0, 0, 0]} />}
    </group>
  );
}

// ── Single resource node renderer ─────────────────────────────────────────────
interface NodeRendererProps {
  node: ResourceNode;
}

function NodeRenderer({ node }: NodeRendererProps) {
  const gatherResource = useWorldStore((s) => s.gatherResource);

  const onGather = useCallback(() => {
    gatherResource(node.id, 5);
  }, [node.id, gatherResource]);

  const getMineModelPath = (): string => {
    switch (node.kind) {
      case 'goldMine':
        return node.modelVariant % 2 === 0 ? MineModels.mine1 : MineModels.mine2;
      case 'crystalMine':
        if (node.modelVariant % 3 === 0) return MineModels.crystal1;
        if (node.modelVariant % 3 === 1) return MineModels.crystal2;
        return MineModels.crystal3;
      case 'coalMine':
        return MineModels.coal;
      default:
        return MineModels.mine1;
    }
  };

  if (node.kind === 'tree') {
    return (
      <>
        <ResourceTree node={node} onGather={onGather} />
        {!node.depleted && <GlowRing position={node.position} />}
      </>
    );
  }

  return (
    <>
      <Suspense fallback={null}>
        <MineModel
          modelPath={getMineModelPath()}
          node={node}
          onGather={onGather}
        />
      </Suspense>
      {!node.depleted && <GlowRing position={node.position} />}
    </>
  );
}

// ── ResourceNodes ─────────────────────────────────────────────────────────────
export function ResourceNodes() {
  const resourceNodes = useWorldStore((s) => s.resourceNodes);

  return (
    <group>
      {resourceNodes
        .filter((n) => !n.depleted)
        .map((node) => (
          <NodeRenderer key={node.id} node={node} />
        ))}
    </group>
  );
}
