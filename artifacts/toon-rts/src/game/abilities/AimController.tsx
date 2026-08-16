import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

export function AimController() {
  const { camera, raycaster, pointer, scene } = useThree();
  const activeAbility = useGameStore(state => state.activeAbility);
  const setActiveAbility = useGameStore(state => state.setActiveAbility);
  const castAbility = useGameStore(state => state.castAbility);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key.toLowerCase()) {
        case 'q': setActiveAbility('ice'); break;
        case 'e': setActiveAbility('lightning'); break;
        case 'r': setActiveAbility('meteor'); break;
        case 'f': setActiveAbility('fire'); break;
        case 't': setActiveAbility('wind'); break;
        case 'escape': setActiveAbility(null); break;
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!activeAbility) return;
      
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      // Find ground intersection
      const groundHit = intersects.find(hit => hit.object.position.y <= 0);
      
      if (groundHit) {
        castAbility(activeAbility, {
          origin: [0,0,0], // Should be caster position
          direction: [groundHit.point.x, 0, groundHit.point.z],
          distance: groundHit.point.length()
        });
        setActiveAbility(null); // Reset after cast
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClick);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
    };
  }, [activeAbility, camera, pointer, raycaster, scene, setActiveAbility, castAbility]);

  return null;
}
