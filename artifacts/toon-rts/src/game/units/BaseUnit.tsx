import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { UnitData, useGameStore } from '../store/gameStore';
import { ToonMaterial } from '../shaders/ToonMaterial';
import { CapsuleCollider } from '@react-three/rapier';

export function BaseUnit({ unit }: { unit: UnitData }) {
  const rigidBody = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Group>(null);
  const selectedUnitIds = useGameStore(state => state.selectedUnitIds);
  const isSelected = selectedUnitIds.includes(unit.id);
  const selectUnits = useGameStore(state => state.selectUnits);

  const teamColor = unit.teamId === 1 ? new THREE.Color(0.2, 0.4, 0.8) : new THREE.Color(0.8, 0.2, 0.2);
  
  // Since loading actual FBX fails without the assets, we use stylized primitives 
  // that act as stand-ins, textured with toon material
  
  const material = useMemo(() => {
    return new THREE.MeshLambertMaterial({ 
      color: unit.race === 'Orcs' ? '#4a5e2b' : '#d4b79b'
    });
  }, [unit.race]);

  // Movement Logic (simple lerp for now, handled fully by CombatSystem ideally)
  useFrame((state, delta) => {
    if (!meshRef.current || !rigidBody.current) return;
    
    // Sync mesh position with rigidbody (kinematic)
    if (unit.state === 'move' && unit.targetPosition) {
      const currentPos = rigidBody.current.translation();
      const target = new THREE.Vector3(...unit.targetPosition);
      const dir = target.clone().sub(currentPos as THREE.Vector3);
      if (dir.length() > 0.1) {
        dir.normalize().multiplyScalar(5 * delta); // speed
        rigidBody.current.setTranslation({
          x: currentPos.x + dir.x,
          y: currentPos.y,
          z: currentPos.z + dir.z
        }, true);
        
        // Rotate towards target
        const angle = Math.atan2(dir.x, dir.z);
        meshRef.current.rotation.y = angle;
      }
    }
  });

  const getUnitScale = () => {
    switch(unit.type) {
      case 'cavalry': return 1.5;
      case 'catapult': return 2;
      default: return 1;
    }
  };

  return (
    <RigidBody 
      ref={rigidBody} 
      type="kinematicPosition" 
      position={unit.position}
      colliders={false}
    >
      <CapsuleCollider args={[0.3, 0.6]} />
      <group 
        ref={meshRef} 
        scale={getUnitScale()}
        onClick={(e) => {
          e.stopPropagation();
          selectUnits([unit.id]);
        }}
      >
        {/* Unit Model Fallback */}
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow material={material}>
          <capsuleGeometry args={[0.3, 0.6, 4, 8]} />
        </mesh>
        
        {/* Team Color Indicator (Shoulder pad / Hat standin) */}
        <mesh position={[0, 1.2, 0]} castShadow>
          <boxGeometry args={[0.4, 0.2, 0.4]} />
          <meshLambertMaterial color={teamColor} />
        </mesh>
        
        {/* Selection Ring */}
        {isSelected && (
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
            <ringGeometry args={[0.6, 0.8, 32]} />
            <meshBasicMaterial color="#f5a623" transparent opacity={0.8} />
          </mesh>
        )}

        {/* HP Bar */}
        <Html position={[0, 1.8, 0]} center>
          <div className="w-12 h-1.5 bg-black/50 rounded-full overflow-hidden backdrop-blur-sm border border-black/20">
            <div 
              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-200"
              style={{ 
                width: `${(unit.health / unit.maxHealth) * 100}%`,
                backgroundSize: '300% 100%',
                backgroundPosition: `${100 - (unit.health / unit.maxHealth) * 100}% 0`
              }}
            />
          </div>
        </Html>
      </group>
    </RigidBody>
  );
}
