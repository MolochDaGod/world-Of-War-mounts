import { RigidBody } from '@react-three/rapier';
import { AnimeWater } from './AnimeWater';
import { GrassField } from './GrassField';

export function World() {
  return (
    <group>
      {/* Ground Physics */}
      <RigidBody type="fixed">
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <boxGeometry args={[100, 100, 1]} />
          <meshLambertMaterial color="#2d4c1e" />
        </mesh>
      </RigidBody>
      
      {/* Visual Environment */}
      <AnimeWater />
      <GrassField />
      
      {/* Some rocks */}
      <group position={[-15, 0, -15]}>
        <mesh castShadow receiveShadow>
          <dodecahedronGeometry args={[2, 0]} />
          <meshStandardMaterial color="#555" roughness={0.9} flatShading />
        </mesh>
      </group>
      
      <group position={[15, 0, 10]}>
        <mesh castShadow receiveShadow>
          <dodecahedronGeometry args={[1.5, 0]} />
          <meshStandardMaterial color="#555" roughness={0.9} flatShading />
        </mesh>
      </group>
    </group>
  );
}
