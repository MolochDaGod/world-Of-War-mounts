/**
 * RTSCamera — isometric RTS camera with:
 *   WASD / Arrow keys   — pan
 *   Mouse wheel         — zoom (height)
 *   Edge scroll         — pan when pointer near screen edges
 *   Middle mouse drag   — free pan (Total War style)
 *   Alt + middle drag   — orbit with clamped pitch (never collides with orders)
 */
import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const PAN_SPEED = 32;
const ZOOM_MIN = 12;
const ZOOM_MAX = 92;
const BOUND = 155;
const EDGE_MARGIN = 50;
const MIN_PITCH = THREE.MathUtils.degToRad(34);
const MAX_PITCH = THREE.MathUtils.degToRad(68);

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (
    target.isContentEditable
    || target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.tagName === 'SELECT'
  );
}

export function RTSCamera() {
  const { camera, gl } = useThree();

  const desiredTarget = useRef(new THREE.Vector3(0, 0, 0));
  const visibleTarget = useRef(new THREE.Vector3(0, 0, 0));
  const height = useRef(35);
  const yaw = useRef(0);
  const pitch = useRef(THREE.MathUtils.degToRad(53));
  const keys = useRef<Record<string, boolean>>({});
  const pointer = useRef({ x: 0, y: 0, inside: false });
  const dragMode = useRef<'pan' | 'orbit' | null>(null);
  const dragLast = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = gl.domElement;

    const onKeyDown  = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.defaultPrevented || e.shiftKey) return;
      keys.current[e.code] = true;
    };
    const onKeyUp    = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      delete keys.current[e.code];
    };

    const onWheel    = (e: WheelEvent) => {
      if (isTypingTarget(e.target)) return;
      const rect = canvas.getBoundingClientRect();
      const over =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!over) return;
      e.preventDefault();
      const oldH = height.current;
      const nextH = THREE.MathUtils.clamp(
        oldH + e.deltaY * 0.055,
        ZOOM_MIN, ZOOM_MAX,
      );
      const dh = nextH - oldH;
      height.current = nextH;
      // Zoom toward the pointer on the ground plane (RTS wheel feel).
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hit = new THREE.Vector3();
      if (ray.ray.intersectPlane(plane, hit) && Math.abs(dh) > 0.01) {
        const t = THREE.MathUtils.clamp(dh / Math.max(oldH, 1), -0.35, 0.35);
        desiredTarget.current.lerp(hit, t * (dh > 0 ? 0.22 : 0.38));
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        inside: e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom,
      };
      if (dragMode.current) {
        const dx = e.clientX - dragLast.current.x;
        const dy = e.clientY - dragLast.current.y;
        dragLast.current = { x: e.clientX, y: e.clientY };
        if (dragMode.current === 'orbit') {
          yaw.current -= dx * 0.008;
          pitch.current = THREE.MathUtils.clamp(pitch.current + dy * 0.006, MIN_PITCH, MAX_PITCH);
        } else {
          // Pan in the camera's current ground-plane orientation.
          const cosYaw = Math.cos(yaw.current);
          const sinYaw = Math.sin(yaw.current);
          const sens = height.current * 0.0012;
          desiredTarget.current.x -= dx * sens * cosYaw + dy * sens * sinYaw;
          desiredTarget.current.z += dx * sens * sinYaw - dy * sens * cosYaw;
        }
      }
    };

    const endDrag = () => { dragMode.current = null; };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        dragMode.current = e.altKey ? 'orbit' : 'pan';
        dragLast.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      }
    };

    const noAuxClick = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown, { passive: true });
    window.addEventListener('keyup', onKeyUp, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', endDrag, { passive: true });
    window.addEventListener('blur', endDrag);
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('auxclick', noAuxClick);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('blur', endDrag);
      window.removeEventListener('wheel', onWheel, true);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('auxclick', noAuxClick);
    };
  }, [gl, camera]);

  useFrame((_, delta) => {
    const k = keys.current;
    const p = pointer.current;
    const dt = Math.min(delta, 0.05);
    const speed = PAN_SPEED * dt;
    const cosYaw = Math.cos(yaw.current);
    const sinYaw = Math.sin(yaw.current);

    // Keyboard and edge movement follow the current viewing angle.
    if (!dragMode.current) {
      if (k['ArrowUp'] || k['KeyW']) {
        desiredTarget.current.x -= sinYaw * speed;
        desiredTarget.current.z -= cosYaw * speed;
      }
      if (k['ArrowDown'] || k['KeyS']) {
        desiredTarget.current.x += sinYaw * speed;
        desiredTarget.current.z += cosYaw * speed;
      }
      if (k['ArrowLeft'] || k['KeyA']) {
        desiredTarget.current.x -= cosYaw * speed;
        desiredTarget.current.z += sinYaw * speed;
      }
      if (k['ArrowRight'] || k['KeyD']) {
        desiredTarget.current.x += cosYaw * speed;
        desiredTarget.current.z -= sinYaw * speed;
      }

      const rect = gl.domElement.getBoundingClientRect();
      const edgeSpeed = speed * 0.7;
      if (p.inside && p.x < EDGE_MARGIN) {
        desiredTarget.current.x -= cosYaw * edgeSpeed;
        desiredTarget.current.z += sinYaw * edgeSpeed;
      }
      if (p.inside && p.x > rect.width - EDGE_MARGIN) {
        desiredTarget.current.x += cosYaw * edgeSpeed;
        desiredTarget.current.z -= sinYaw * edgeSpeed;
      }
      if (p.inside && p.y < EDGE_MARGIN) {
        desiredTarget.current.x -= sinYaw * edgeSpeed;
        desiredTarget.current.z -= cosYaw * edgeSpeed;
      }
      if (p.inside && p.y > rect.height - EDGE_MARGIN) {
        desiredTarget.current.x += sinYaw * edgeSpeed;
        desiredTarget.current.z += cosYaw * edgeSpeed;
      }
    }

    desiredTarget.current.x = THREE.MathUtils.clamp(desiredTarget.current.x, -BOUND, BOUND);
    desiredTarget.current.z = THREE.MathUtils.clamp(desiredTarget.current.z, -BOUND, BOUND);
    visibleTarget.current.lerp(desiredTarget.current, 1 - Math.exp(-12 * dt));

    const distance = height.current / Math.sin(pitch.current);
    const horizontal = Math.cos(pitch.current) * distance;
    const ideal = new THREE.Vector3(
      visibleTarget.current.x + Math.sin(yaw.current) * horizontal,
      height.current,
      visibleTarget.current.z + Math.cos(yaw.current) * horizontal,
    );
    camera.position.lerp(ideal, 1 - Math.exp(-15 * dt));
    camera.lookAt(visibleTarget.current);
  });

  return null;
}
