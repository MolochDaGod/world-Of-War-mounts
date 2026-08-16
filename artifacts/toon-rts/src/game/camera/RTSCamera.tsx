import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function RTSCamera() {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 0));
  const keys = useRef<{ [key: string]: boolean }>({});
  const panSpeed = 30; // units per second
  
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keys.current[e.code] = true;
    const onKeyUp = (e: KeyboardEvent) => keys.current[e.code] = false;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);
  
  useFrame((state, delta) => {
    // WASD / Arrow keys panning
    if (keys.current['KeyW'] || keys.current['ArrowUp']) target.current.z -= panSpeed * delta;
    if (keys.current['KeyS'] || keys.current['ArrowDown']) target.current.z += panSpeed * delta;
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) target.current.x -= panSpeed * delta;
    if (keys.current['KeyD'] || keys.current['ArrowRight']) target.current.x += panSpeed * delta;
    
    // Clamp target to battlefield bounds
    target.current.x = THREE.MathUtils.clamp(target.current.x, -40, 40);
    target.current.z = THREE.MathUtils.clamp(target.current.z, -40, 40);
    
    // Smooth lerp
    camera.position.lerp(new THREE.Vector3(target.current.x, 35, target.current.z + 35), 10 * delta);
    camera.lookAt(target.current);
  });
  
  return null;
}
