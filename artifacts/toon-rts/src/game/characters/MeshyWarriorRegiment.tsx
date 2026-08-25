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
import { MeshySoldier, type MeshyPreviewClip } from './MeshySoldier';
import { SelectionRing }  from './CharacterBase';
import { RegimentLabel }  from './RegimentLabel';
import { getCommandMode, setCommandMode } from '@/game/input/CommandMode';

interface Props {
  unit: UnitData;
  isSelected: boolean;
  preserveOnDeath?: boolean;
  previewClip?: MeshyPreviewClip;
  previewOneShot?: boolean;
  showLabel?: boolean;
}

export function MeshyWarriorRegiment({
  unit,
  isSelected,
  preserveOnDeath = false,
  previewClip,
  previewOneShot = false,
  showLabel = true,
}: Props) {
  const isCommander = !!(unit as any).isCommander;

  const aliveCount = unit.state === 'dead' && !preserveOnDeath
    ? 0
    : isCommander
      ? 1
      : Math.max(1, Math.ceil((unit.health / unit.maxHealth) * unit.maxSoldiers));

  const rows    = unit.formationRows ?? 2;
  const cols    = unit.formationCols ?? 4;
  const spacing = unit.spacing ?? 1.6;

  const slots: [number, number, number][] = useMemo(() => {
    const out: [number, number, number][] = [];
    const cos = Math.cos(unit.formationFacing);
    const sin = Math.sin(unit.formationFacing);
    for (let r = 0; r < rows && out.length < aliveCount; r++) {
      for (let c = 0; c < cols && out.length < aliveCount; c++) {
        const localX = (c - (cols - 1) / 2) * spacing;
        const localZ = (r - (rows - 1) / 2) * spacing;
        out.push([
          unit.position[0] + cos * localX - sin * localZ,
          0,
          unit.position[2] + sin * localX + cos * localZ,
        ]);
      }
    }
    return out;
  }, [unit.position, unit.formationFacing, rows, cols, spacing, aliveCount]);

  const ringRadius = (cols * spacing) / 2 + 0.8;

  return (
    <group name={`meshy-${unit.id}`}>
      {/* Click hitbox */}
      <mesh
        position={[unit.position[0], 1.5, unit.position[2]]}
        onClick={e => {
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
          const next = e.nativeEvent.shiftKey
            ? (store.selectedUnitIds.includes(unit.id)
                ? store.selectedUnitIds.filter(id => id !== unit.id)
                : [...store.selectedUnitIds, unit.id])
            : [unit.id];
          store.selectUnits(next);
        }}
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
            previewClip={previewClip}
            previewOneShot={previewOneShot}
          />
        ))}
      </Suspense>

      {isCommander && <SelectionRing visible radius={ringRadius + 0.5} />}
      <SelectionRing visible={isSelected} radius={ringRadius} />
      {showLabel && <RegimentLabel unit={unit} aliveSoldiers={aliveCount} labelHeight={isCommander ? 5 : 3.8} />}
    </group>
  );
}
