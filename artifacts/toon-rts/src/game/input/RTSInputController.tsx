/**
 * RTSInputController — all RTS mouse + keyboard commands inside the R3F Canvas.
 *
 * Mouse:
 *   LMB single click on ground   → deselect all (via Canvas onPointerMissed)
 *   LMB drag on ground           → rubber-band box select (player team 1 only)
 *   RMB click                    → execute current command mode at target location
 *   MMB drag                     → camera pan (handled in RTSCamera)
 *
 * Keyboard (battle phase):
 *   M — Move mode       click ground → ordered march
 *   F — Fight mode      click ground → attack-move; click enemy → focus attack
 *   P — Patrol mode     click A then B → patrol route
 *   L — Lob mode        click ground → siege units fire there
 *   Escape              → cancel active mode (return to default)
 *
 * SelectionBoxOverlay is a companion DOM component for the HUD layer.
 */
import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { emitMoveMarker } from '@/game/effects/MoveMarker';
import {
  getCommandMode, setCommandMode,
  getPatrolAnchor, setPatrolAnchor, clearPatrolAnchor,
  MODE_CURSOR,
} from '@/game/input/CommandMode';

// ── Module-level selection-box state (shared with SelectionBoxOverlay) ────────
interface BoxRect { x1: number; y1: number; x2: number; y2: number }
let _box: BoxRect | null = null;
const _listeners: Set<() => void> = new Set();
function _notifyBox() { _listeners.forEach(fn => fn()); }

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
    const noCtx = (e: MouseEvent) => e.preventDefault();
    canvas.addEventListener('contextmenu', noCtx);

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const phase = useGameStore.getState().phase;
      if (phase !== 'battle') return;

      switch (e.code) {
        case 'KeyM': setCommandMode('move');    e.preventDefault(); break;
        case 'KeyF': setCommandMode('fight');   e.preventDefault(); break;
        case 'KeyP': setCommandMode('patrol');  e.preventDefault(); break;
        case 'KeyL': setCommandMode('lob');     e.preventDefault(); break;
        case 'KeyS': {
          const { selectedUnitIds, toggleStandGround } = useGameStore.getState();
          if (selectedUnitIds.length > 0) { toggleStandGround(selectedUnitIds); e.preventDefault(); }
          break;
        }
        case 'Escape': {
          useGameStore.getState().setPendingAbility(null);
          setCommandMode('default');
          break;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);

    // ── Drag state ────────────────────────────────────────────────────────────
    let dragStart: { x: number; y: number } | null = null;
    let isDragging = false;
    const DRAG_THRESHOLD = 8;

    const toNDC = (cx: number, cy: number): THREE.Vector2 => {
      const rect = canvas.getBoundingClientRect();
      return new THREE.Vector2(
        ((cx - rect.left) / rect.width) * 2 - 1,
        -((cy - rect.top) / rect.height) * 2 + 1,
      );
    };

    const groundHit = (cx: number, cy: number): THREE.Vector3 | null => {
      const ground = groundRef.current;
      if (!ground) return null;
      raycaster.current.setFromCamera(toNDC(cx, cy), camera);
      const hits = raycaster.current.intersectObject(ground, false);
      return hits[0]?.point ?? null;
    };

    const worldToScreen = (wp: [number, number, number]): { x: number; y: number } => {
      const rect  = canvas.getBoundingClientRect();
      const v = new THREE.Vector3(...wp).project(camera);
      return {
        x: ((v.x + 1) / 2) * rect.width  + rect.left,
        y: ((1 - v.y) / 2) * rect.height + rect.top,
      };
    };

    // Apply cursor style to canvas based on active command mode
    const updateCursor = () => {
      canvas.style.cursor = MODE_CURSOR[getCommandMode()];
    };

    // ── Execute the current command mode at a ground position ─────────────────
    const executeCommand = (hit: THREE.Vector3) => {
      const store = useGameStore.getState();
      const { selectedUnitIds, issueMove, issueAttackMove, issuePatrol, issueLob,
              pendingAbility, placeTotem, triggerAbility, setPendingAbility, combatElapsed } = store;

      // ── Pending ability ground click (e.g. holy totem placement) ────────────
      if (pendingAbility) {
        const dest: [number, number, number] = [hit.x, 0, hit.z];
        if (pendingAbility.abilityId === 'holy_totem') {
          placeTotem({
            id: `totem_${Date.now()}`,
            position: dest,
            teamId: 1, // player is always team 1
            radius: 14,
            healPerSec: 35,
            expiresAt: combatElapsed + 12,
          });
          emitMoveMarker(dest);
        } else {
          triggerAbility(pendingAbility.unitIds, pendingAbility.abilityId, dest);
          emitMoveMarker(dest);
        }
        setPendingAbility(null);
        return;
      }

      if (selectedUnitIds.length === 0) return;

      const dest: [number, number, number] = [hit.x, 0, hit.z];
      const mode = getCommandMode();

      switch (mode) {
        case 'default':
        case 'move':
          issueMove(selectedUnitIds, dest);
          emitMoveMarker(dest);
          if (mode === 'move') setCommandMode('default');
          break;

        case 'fight':
          issueAttackMove(selectedUnitIds, dest);
          emitMoveMarker(dest);
          setCommandMode('default');
          break;

        case 'patrol': {
          const anchor = getPatrolAnchor();
          if (!anchor) {
            // First click — store anchor, show marker
            setPatrolAnchor(dest);
            emitMoveMarker(dest);
          } else {
            // Second click — issue patrol route
            issuePatrol(selectedUnitIds, anchor, dest);
            emitMoveMarker(dest);
            clearPatrolAnchor();
            setCommandMode('default');
          }
          break;
        }

        case 'lob':
          issueLob(selectedUnitIds, dest);
          emitMoveMarker(dest);
          setCommandMode('default');
          break;
      }
    };

    // ── Mouse event handlers ──────────────────────────────────────────────────
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        dragStart  = { x: e.clientX, y: e.clientY };
        isDragging = false;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      updateCursor();
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
          // Box-select player regiments whose screen centre falls inside the box
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
        } else {
          // Single LMB in command mode → execute on ground
          const mode = getCommandMode();
          if (mode !== 'default') {
            const hit = groundHit(e.clientX, e.clientY);
            if (hit) executeCommand(hit);
          }
          // otherwise deselect handled by Canvas onPointerMissed
        }
        _box = null;
        _notifyBox();
        dragStart  = null;
        isDragging = false;
      }

      // ── RMB — execute command (default = move) ────────────────────────────
      if (e.button === 2) {
        const mode = getCommandMode();
        const { selectedUnitIds } = useGameStore.getState();
        if (selectedUnitIds.length === 0) return;
        const hit = groundHit(e.clientX, e.clientY);
        if (!hit) return;

        if (mode === 'default' || mode === 'move') {
          // RMB always issues a move order in default / move mode
          const { issueMove } = useGameStore.getState();
          const dest: [number, number, number] = [hit.x, 0, hit.z];
          issueMove(selectedUnitIds, dest);
          emitMoveMarker(dest);
          if (mode === 'move') setCommandMode('default');
        } else {
          // In other modes, RMB executes that mode's action
          executeCommand(hit);
        }
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);

    return () => {
      canvas.removeEventListener('contextmenu', noCtx);
      canvas.removeEventListener('mousedown',   onMouseDown);
      window.removeEventListener('keydown',     onKeyDown);
      window.removeEventListener('mousemove',   onMouseMove);
      window.removeEventListener('mouseup',     onMouseUp);
      canvas.style.cursor = 'default';
      _box = null;
      _notifyBox();
    };
  }, [camera, gl]);

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
