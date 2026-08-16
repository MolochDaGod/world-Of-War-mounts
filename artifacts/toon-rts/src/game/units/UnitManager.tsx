import { useGameStore } from '../store/gameStore';
import { BaseUnit } from './BaseUnit';

export function UnitManager() {
  const units = useGameStore(state => state.units);
  
  return (
    <group>
      {units.map(unit => (
        <BaseUnit key={unit.id} unit={unit} />
      ))}
    </group>
  );
}
