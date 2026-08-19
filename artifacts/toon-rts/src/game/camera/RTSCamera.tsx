/**
 * RTSCamera — isometric RTS camera with:
 *   WASD / Arrow keys   — pan
 *   Mouse wheel         — zoom (height)
 *   Edge scroll         — pan when pointer near screen edges
 *   Middle mouse drag   — free pan (Total War style)
 */
import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const PAN_SPEED   = 32;   // snappier panning
const ZOOM_MIN    = 12;   // can zoom closer
const ZOOM_MAX    = 65;   // can pull back further for large battles
const BOUND       = 58;   // wider bounds to follow units that march far
const EDGE_MARGIN = 50;   // px from screen edge

export function RTSCamera() {
  const { camera, size, gl } = useThree();

  const target     = useRef(new THREE.Vector3(0, 0, 0));
  const height     = useRef(35);
  const keys       = useRef<Record<string, boolean>>({});
  const pointer    = useRef({ x: 0, y: 0 });
  // Middle-mouse pan state
  const mmb        = useRef(false);
  const mmbLast    = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = gl.domElement;

    const onKeyDown  = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const onKeyUp    = (e: KeyboardEvent) => { delete keys.current[e.code]; };

    const onWheel    = (e: WheelEvent) => {
      height.current = THREE.MathUtils.clamp(
        height.current + e.deltaY * 0.04,
        ZOOM_MIN, ZOOM_MAX,
      );
    };

    const onMouseMove = (e: MouseEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY };
      if (mmb.current) {
        const dx = e.clientX - mmbLast.current.x;
        const dy = e.clientY - mmbLast.current.y;
        mmbLast.current = { x: e.clientX, y: e.clientY };
        // Pan sensitivity scales with zoom height
        const sens = height.current * 0.0012;
        target.current.x -= dx * sens * (size.width  / 1280);
        target.current.z -= dy * sens * (size.height / 720);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        mmb.current  = true;
        mmbLast.current = { x: e.clientX, y: e.clientY };
        e.preventDefault(); // stop browser auto-scroll
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 1) mmb.current = false;
    };

    // Prevent middle-click scroll cursor from appearing
    const noAuxClick = (e: MouseEvent) => { if (e.button === 1) e.preventDefault(); };

    window.addEventListener('keydown',    onKeyDown,   { passive: true });
    window.addEventListener('keyup',      onKeyUp,     { passive: true });
    window.addEventListener('wheel',      onWheel,     { passive: true });
    window.addEventListener('mousemove',  onMouseMove, { passive: true });
    window.addEventListener('mousedown',  onMouseDown);
    window.addEventListener('mouseup',    onMouseUp,   { passive: true });
    canvas.addEventListener('mousedown',  noAuxClick);

    return () => {
      window.removeEventListener('keydown',    onKeyDown);
      window.removeEventListener('keyup',      onKeyUp);
      window.removeEventListener('wheel',      onWheel);
      window.removeEventListener('mousemove',  onMouseMove);
      window.removeEventListener('mousedown',  onMouseDown);
      window.removeEventListener('mouseup',    onMouseUp);
      canvas.removeEventListener('mousedown',  noAuxClick);
    };
  }, [gl, size]);

  useFrame((_, delta) => {
    const k  = keys.current;
    const p  = pointer.current;
    const dt = Math.min(delta, 0.05);
    const speed = PAN_SPEED * dt;

    // Keyboard pan — suppressed while MMB panning
    if (!mmb.current) {
      if (k['ArrowUp']    || k['KeyW']) target.current.z -= speed;
      if (k['ArrowDown']  || k['KeyS']) target.current.z += speed;
      if (k['ArrowLeft']  || k['KeyA']) target.current.x -= speed;
      if (k['ArrowRight'] || k['KeyD']) target.current.x += speed;

      // Edge scroll
      const edgeSpeed = speed * 0.7;
      if (p.x < EDGE_MARGIN)               target.current.x -= edgeSpeed;
      if (p.x > size.width - EDGE_MARGIN)  target.current.x += edgeSpeed;
      if (p.y < EDGE_MARGIN)               target.current.z -= edgeSpeed;
      if (p.y > size.height - EDGE_MARGIN) target.current.z += edgeSpeed;
    }

    // Clamp to battlefield
    target.current.x = THREE.MathUtils.clamp(target.current.x, -BOUND, BOUND);
    target.current.z = THREE.MathUtils.clamp(target.current.z, -BOUND, BOUND);

    // Smooth lerp camera to target — tighter lerp for crisp response
    const h = height.current;
    // Tilt angle: slight forward tilt (×0.75 instead of ×0.9) improves battlefield overview
    const ideal = new THREE.Vector3(target.current.x, h, target.current.z + h * 0.75);
    camera.position.lerp(ideal, 12 * dt);
    // Look slightly ahead of target centre so units marching forward stay visible
    const lookAt = new THREE.Vector3(target.current.x, 0, target.current.z - h * 0.05);
    camera.lookAt(lookAt);
  });

  return null;
}
