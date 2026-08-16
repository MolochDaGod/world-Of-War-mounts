import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const PAN_SPEED   = 28;
const ZOOM_MIN    = 14;
const ZOOM_MAX    = 55;
const BOUND       = 45;
const EDGE_MARGIN = 40; // px from screen edge

export function RTSCamera() {
  const { camera, size } = useThree();

  const target   = useRef(new THREE.Vector3(0, 0, 0));
  const height   = useRef(35);
  const keys     = useRef<Record<string, boolean>>({});
  const pointer  = useRef({ x: 0, y: 0 });

  useEffect(() => {
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
    };

    window.addEventListener('keydown',    onKeyDown,   { passive: true });
    window.addEventListener('keyup',      onKeyUp,     { passive: true });
    window.addEventListener('wheel',      onWheel,     { passive: true });
    window.addEventListener('mousemove',  onMouseMove, { passive: true });

    return () => {
      window.removeEventListener('keydown',    onKeyDown);
      window.removeEventListener('keyup',      onKeyUp);
      window.removeEventListener('wheel',      onWheel);
      window.removeEventListener('mousemove',  onMouseMove);
    };
  }, []);

  useFrame((_, delta) => {
    const k = keys.current;
    const p = pointer.current;
    const dt = Math.min(delta, 0.05); // cap to avoid huge jumps
    const speed = PAN_SPEED * dt;

    // Keyboard pan
    if (k['ArrowUp']    || k['KeyW']) target.current.z -= speed;
    if (k['ArrowDown']  || k['KeyS']) target.current.z += speed;
    if (k['ArrowLeft']  || k['KeyA']) target.current.x -= speed;
    if (k['ArrowRight'] || k['KeyD']) target.current.x += speed;

    // Edge scroll
    const edgeSpeed = speed * 0.7;
    if (p.x < EDGE_MARGIN)              target.current.x -= edgeSpeed;
    if (p.x > size.width - EDGE_MARGIN) target.current.x += edgeSpeed;
    if (p.y < EDGE_MARGIN)              target.current.z -= edgeSpeed;
    if (p.y > size.height - EDGE_MARGIN)target.current.z += edgeSpeed;

    // Clamp to battlefield
    target.current.x = THREE.MathUtils.clamp(target.current.x, -BOUND, BOUND);
    target.current.z = THREE.MathUtils.clamp(target.current.z, -BOUND, BOUND);

    // Smooth lerp camera
    const h = height.current;
    const ideal = new THREE.Vector3(target.current.x, h, target.current.z + h * 0.9);
    camera.position.lerp(ideal, 8 * dt);
    camera.lookAt(target.current);
  });

  return null;
}
