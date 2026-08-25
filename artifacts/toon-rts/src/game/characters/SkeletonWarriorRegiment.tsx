/**
 * SkeletonWarriorRegiment — renders a summoned horde of 10 skeleton warriors.
 *
 * Uses the skeletong_warrior GLB (Kenney-style low-poly).
 * Cheap, weak, but numerous — they surge forward in a 2×5 grid.
 */
import { useMemo } from 'react';
import type { UnitData, UnitState } from '@/game/store/gameStore';
import { GLBSoldierMesh }  from './GLBSoldierMesh';
import { SelectionRing }   from './CharacterBase';
import { RegimentLabel }   from './RegimentLabel';
import { useGameStore }    from '@/game/store/gameStore';
import { useGLTF }         from '@react-three/drei';
import { getCommandMode, setCommandMode } from '@/game/input/CommandMode';

const SKL_GLB = '/assets/characters/glb/skeleton_warrior.glb';

/**
 * The Kenney skeleton animation names follow the pattern
 * "CharacterArmature|...|{Action}|..."  — we match by substring.
 */
const SKL_ANIMS: Partial<Record<UnitState, string>> = {
  idle:   'Idle',
  move:   'Run',
  attack: 'Sword',
  dead:   'Death',
};

// Bone-white colour for that summoned look
const SKL_COLOR   = '#d4cfc8';
const SKL_EMISSIVE = '#2a2520';

interface Props {
  unit: UnitData;
  isSelected: boolean;
}

export function SkeletonWarriorRegiment({ unit, isSelected }: Props) {
  const aliveCount = unit.state === 'dead'
    ? 0
    : Math.max(1, Math.ceil((unit.health / unit.maxHealth) * unit.maxSoldiers));

  const rows    = unit.formationRows ?? 2;
  const cols    = unit.formationCols ?? 5;
  const spacing = unit.spacing ?? 1.1;

  // Grid slot positions
  const slots: [number, number, number][] = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (out.length >= aliveCount) break;
        const x = unit.position[0] + (c - (cols - 1) / 2) * spacing;
        const z = unit.position[2] + (r - (rows - 1) / 2) * spacing;
        out.push([x, 0, z]);
      }
    }
    return out;
  }, [unit.position, rows, cols, spacing, aliveCount]);

  const ringRadius = (cols * spacing) / 2 + 0.8;

  const handleClick = (e: { stopPropagation: () => void; nativeEvent?: MouseEvent }) => {
    e.stopPropagation();
    if (unit.state === 'dead') return;
    const store = useGameStore.getState();
    if (unit.teamId === 2) {
      if (store.phase === 'battle' && getCommandMode() === 'fight' && store.selectedUnitIds.length > 0) {
        store.issueFocusAttack(store.selectedUnitIds, unit.id);
        setCommandMode('default');
      }
      return;
    }
    const next = e.nativeEvent?.shiftKey
      ? (store.selectedUnitIds.includes(unit.id)
          ? store.selectedUnitIds.filter(id => id !== unit.id)
          : [...store.selectedUnitIds, unit.id])
      : [unit.id];
    store.selectUnits(next);
  };

  return (
    <group name={`skeletonWarrior-${unit.id}`}>
      {/* Invisible click hitbox */}
      <mesh
        position={[unit.position[0], 1, unit.position[2]]}
        onClick={handleClick}
        visible={false}
      >
        <boxGeometry args={[ringRadius * 2, 2, ringRadius * 2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {slots.map((pos, i) => (
        <GLBSoldierMesh
          key={i}
          glbPath={SKL_GLB}
          animMap={SKL_ANIMS}
          position={pos}
          facing={unit.formationFacing}
          scale={1.0}               /* Kenney model is ~2m, scene uses metres */
          color={SKL_COLOR}
          emissive={SKL_EMISSIVE}
          unitState={unit.state}
        />
      ))}

      <SelectionRing visible={isSelected} radius={ringRadius} />
      <RegimentLabel unit={unit} aliveSoldiers={aliveCount} labelHeight={3.5} />
    </group>
  );
}
