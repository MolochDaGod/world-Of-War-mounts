/**
 * BuildSystem — R3F scene component managing build-mode placement.
 *
 * When build mode is active:
 *   • An invisible ground plane intercepts pointer events for grid-snapped placement.
 *   • A ghost piece follows the cursor at the snapped position.
 *   • Click  → place building in worldStore
 *   • R key  → rotate ghost 90°
 *   • Esc    → cancel build mode
 *
 * Position updates go directly to a THREE.Group ref (no React state) so the
 * ghost moves at pointer speed without triggering React re-renders.
 */
import { useRef, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { useWorldStore, wuid } from '@/game/store/worldStore';
import { useBuildStore } from '@/game/store/buildStore';
import { BUILD_CATALOG_MAP } from './BuildCatalog';
import { GhostPiece } from './PlacedBuildings';

const SNAP = 2; // grid snap in game units

export function BuildSystem() {
  const active     = useBuildStore((s) => s.active);
  const selectedId = useBuildStore((s) => s.selectedId);
  const rotation   = useBuildStore((s) => s.rotation);
  const { deactivate, rotateGhost } = useBuildStore.getState();

  const ghostRef = useRef<THREE.Group>(null);
  const posRef   = useRef(new THREE.Vector3(0, 0, 0));

  // ── Keyboard: R = rotate, Esc = cancel ────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rotateGhost(); }
      if (e.key === 'Escape')             { deactivate(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, rotateGhost, deactivate]);

  // ── Update ghost rotation from store ─────────────────────────────────────
  useEffect(() => {
    if (ghostRef.current) {
      ghostRef.current.rotation.y = rotation * (Math.PI / 2);
    }
  }, [rotation]);

  if (!active || !selectedId) return null;

  const piece = BUILD_CATALOG_MAP[selectedId];
  if (!piece) return null;

  const handlePointerMove = (e: any) => {
    const pt = e.point as THREE.Vector3;
    const x  = Math.round(pt.x / SNAP) * SNAP;
    const z  = Math.round(pt.z / SNAP) * SNAP;
    posRef.current.set(x, piece.yOffset, z);
    if (ghostRef.current) {
      ghostRef.current.position.set(x, piece.yOffset, z);
    }
    e.stopPropagation();
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    const [x, y, z] = [posRef.current.x, posRef.current.y, posRef.current.z];
    const { spendResources, addBuilding } = useWorldStore.getState();

    const canAfford = spendResources(piece.cost);
    if (!canAfford) return; // not enough resources

    addBuilding({
      id:       wuid(),
      kind:     'piece',
      pieceId:  piece.id,
      teamId:   1,
      position: [x, y, z],
      rotation: rotation,
      health:   piece.health,
      maxHealth: piece.health,
      level:    1,
    } as any);
  };

  return (
    <>
      {/* ── Invisible ground plane — captures pointer events for placement ── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        receiveShadow={false}
      >
        <planeGeometry args={[500, 500]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* ── Ghost piece ─────────────────────────────────────────────────── */}
      <group
        ref={ghostRef}
        position={posRef.current}
        rotation={[0, rotation * (Math.PI / 2), 0]}
        scale={piece.scale}
      >
        <Suspense fallback={null}>
          <GhostPiece piece={piece} />
        </Suspense>
      </group>

      {/* ── Build grid overlay ──────────────────────────────────────────── */}
      <gridHelper
        args={[200, 100, 0x4488ff, 0x224466]}
        position={[0, 0.02, 0]}
        // @ts-ignore — opacity not in gridHelper typings but works at runtime
        material-transparent={true}
        material-opacity={0.25}
      />
    </>
  );
}
