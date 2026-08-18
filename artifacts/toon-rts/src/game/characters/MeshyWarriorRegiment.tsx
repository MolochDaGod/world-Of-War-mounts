/**
 * MeshyWarriorRegiment — elite melee unit using the Meshy AI baked character.
 *
 * Formation: 2 rows × 4 cols (8 warriors per regiment).
 * Commanders use the same character at 1.5× scale with gold tint.
 */
import { useMemo } from 'react';
import { Suspense } from 'react';
import type { UnitData } from '@/game/store/gameStore';
import { useGameStore }   from '@/game/store/gameStore';
import { useShallow }     from 'zustand/react/shallow';
import { MeshySoldier }   from './MeshySoldier';
import { SelectionRing }  from './CharacterBase';
import { RegimentLabel }  from './RegimentLabel';

interface Props {
  unit: UnitData;
  isSelected: boolean;
}

export function MeshyWarriorRegiment({ unit, isSelected }: Props) {
  const setSelectedUnitIds = useGameStore(s => s.setSelectedUnitIds);
  const isCommander = !!(unit as any).isCommander;

  const aliveCount = unit.state === 'dead'
    ? 0
    : isCommander
      ? 1
      : Math.max(1, Math.ceil((unit.health / unit.maxHealth) * unit.maxSoldiers));

  const rows    = unit.formationRows ?? 2;
  const cols    = unit.formationCols ?? 4;
  const spacing = unit.spacing ?? 1.6;

  const slots: [number, number, number][] = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let r = 0; r < rows && out.length < aliveCount; r++) {
      for (let c = 0; c < cols && out.length < aliveCount; c++) {
        const x = unit.position[0] + (c - (cols - 1) / 2) * spacing;
        const z = unit.position[2] + (r - (rows - 1) / 2) * spacing;
        out.push([x, 0, z]);
      }
    }
    return out;
  }, [unit.position, rows, cols, spacing, aliveCount]);

  const ringRadius = (cols * spacing) / 2 + 0.8;

  return (
    <group name={`meshy-${unit.id}`}>
      {/* Click hitbox */}
      <mesh
        position={[unit.position[0], 1.5, unit.position[2]]}
        onClick={e => { e.stopPropagation(); setSelectedUnitIds([unit.id]); }}
        visible={false}
      >
        <boxGeometry args={[ringRadius * 2, 3, ringRadius * 2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <Suspense fallback={null}>
        {slots.map((pos, i) => (
          <MeshySoldier
            key={i}
            position={pos}
            facing={unit.formationFacing}
            unitState={unit.state}
            teamId={unit.teamId}
            isCommander={isCommander && i === 0}
          />
        ))}
      </Suspense>

      {isCommander && <SelectionRing visible radius={ringRadius + 0.5} />}
      <SelectionRing visible={isSelected} radius={ringRadius} />
      <RegimentLabel unit={unit} aliveSoldiers={aliveCount} labelHeight={isCommander ? 5 : 3.8} />
    </group>
  );
}
