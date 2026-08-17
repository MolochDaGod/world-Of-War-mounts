/**
 * RTSInputController — all RTS mouse commands inside the R3F Canvas.
 *
 * LMB single click on ground   → deselect all (handled via onPointerMissed on Canvas)
 * LMB drag on ground           → rubber-band box select (player team 1 only)
 * RMB click                    → issue move order to selected regiments + show MoveMarker
 * MMB drag                     → camera pan (handled in RTSCamera)
 *
 * SelectionBoxOverlay is a companion DOM component rendered OUTSIDE the Canvas
 * (add it to the HUD layer). It reads module-level box state via useSelectionBox().
 */
import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { emitMoveMarker } from '@/game/effects/MoveMarker';

// ── Module-level selection-box state (shared with SelectionBoxOverlay) ────────
interface BoxRect { x1: number; y1: number; x2: number; y2: number }
let _box: BoxRect | null = null;
const _listeners: Set<() => void> = new Set();
function _notifyBox() { _listeners.forEach(fn => fn()); }

/** Subscribe to selection box changes from outside the Canvas. */
export function useSelectionBox(): BoxRect | null {
  const [box, setBox] = useState<BoxRect | null>(_box);
  useEffect(() => {
    const fn = () => setBox(_box ? { ..._box } : null);
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);
  return box;
}

// ── RTSInputController (inside Canvas) ───────────────────────────────────────
export function RTSInputController() {
  const { camera, gl } = useThree();
  const groundRef = useRef<THREE.Mesh>(null);
  const raycaster  = useRef(new THREE.Raycaster());

  useEffect(() => {
    const canvas = gl.domElement;

    // Prevent browser context menu on right-click inside the canvas
    const noCtx = (e: MouseEvent) => e.preventDefault();
    canvas.addEventListener('contextmenu', noCtx);

    // ── Drag state ────────────────────────────────────────────────────────────
    let dragStart: { x: number; y: number } | null = null;
    let isDragging = false;
    const DRAG_THRESHOLD = 8; // px

    // Convert canvas-relative client coords → NDC for raycasting
    const toNDC = (cx: number, cy: number): THREE.Vector2 => {
      const rect = canvas.getBoundingClientRect();
      return new THREE.Vector2(
        ((cx - rect.left) / rect.width) * 2 - 1,
        -((cy - rect.top) / rect.height) * 2 + 1,
      );
    };

    // Raycast the invisible ground plane → world position
    const groundHit = (cx: number, cy: number): THREE.Vector3 | null => {
      const ground = groundRef.current;
      if (!ground) return null;
      raycaster.current.setFromCamera(toNDC(cx, cy), camera);
      const hits = raycaster.current.intersectObject(ground, false);
      return hits[0]?.point ?? null;
    };

    // Project a world position to canvas pixel coords
    const worldToScreen = (wp: [number, number, number]): { x: number; y: number } => {
      const rect  = canvas.getBoundingClientRect();
      const v = new THREE.Vector3(...wp).project(camera);
      return {
        x: ((v.x + 1) / 2) * rect.width  + rect.left,
        y: ((1 - v.y) / 2) * rect.height + rect.top,
      };
    };

    // ── Mouse event handlers ───────────────────────────────────────────────────
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        dragStart  = { x: e.clientX, y: e.clientY };
        isDragging = false;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragStart || !(e.buttons & 1)) { dragStart = null; return; }
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (!isDragging && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
        isDragging = true;
      }
      if (isDragging) {
        _box = {
          x1: Math.min(dragStart.x, e.clientX),
          y1: Math.min(dragStart.y, e.clientY),
          x2: Math.max(dragStart.x, e.clientX),
          y2: Math.max(dragStart.y, e.clientY),
        };
        _notifyBox();
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      // ── LMB ──
      if (e.button === 0) {
        if (isDragging && _box) {
          // Box-select player regiments whose centre falls inside the box
          const { units, selectUnits } = useGameStore.getState();
          const selected: string[] = [];
          for (const unit of units) {
            if (unit.teamId !== 1 || unit.state === 'dead') continue;
            const scrPos = worldToScreen([
              unit.position[0],
              unit.position[1] + 1.5,
              unit.position[2],
            ]);
            if (
              scrPos.x >= _box.x1 && scrPos.x <= _box.x2 &&
              scrPos.y >= _box.y1 && scrPos.y <= _box.y2
            ) {
              selected.push(unit.id);
            }
          }
          selectUnits(selected);
        }
        // Single-click deselect handled by onPointerMissed on the Canvas element
        _box = null;
        _notifyBox();
        dragStart  = null;
        isDragging = false;
      }

      // ── RMB — issue move command ──
      if (e.button === 2) {
        const { selectedUnitIds, issueMove } = useGameStore.getState();
        if (selectedUnitIds.length === 0) return;
        const hit = groundHit(e.clientX, e.clientY);
        if (!hit) return;
        const dest: [number, number, number] = [hit.x, 0, hit.z];
        issueMove(selectedUnitIds, dest);
        emitMoveMarker(dest);
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);   // window so drag works outside canvas
    window.addEventListener('mouseup',   onMouseUp);

    return () => {
      canvas.removeEventListener('contextmenu', noCtx);
      canvas.removeEventListener('mousedown',   onMouseDown);
      window.removeEventListener('mousemove',   onMouseMove);
      window.removeEventListener('mouseup',     onMouseUp);
      _box = null;
      _notifyBox();
    };
  }, [camera, gl]);

  // Invisible ground plane — used for RMB raycasting
  return (
    <mesh
      ref={groundRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.01, 0]}
      visible={false}
    >
      <planeGeometry args={[600, 600]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

// ── SelectionBoxOverlay (rendered outside Canvas in the HUD layer) ────────────

/**
 * Renders the rubber-band selection rectangle.
 * Place <SelectionBoxOverlay /> anywhere above the canvas in absolute-position space.
 */
export function SelectionBoxOverlay() {
  const box = useSelectionBox();
  if (!box) return null;

  const left   = box.x1;
  const top    = box.y1;
  const width  = box.x2 - box.x1;
  const height = box.y2 - box.y1;

  return (
    <div
      style={{
        position: 'fixed',
        left, top, width, height,
        border: '1.5px solid rgba(68, 255, 136, 0.85)',
        background: 'rgba(68, 255, 136, 0.08)',
        pointerEvents: 'none',
        zIndex: 9999,
        boxShadow: '0 0 8px rgba(68, 255, 136, 0.3) inset',
      }}
    />
  );
}
