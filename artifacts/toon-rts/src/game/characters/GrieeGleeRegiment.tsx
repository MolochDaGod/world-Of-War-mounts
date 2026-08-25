/**
 * GrieeGleeRegiment — renders the Griee & Glee orc+goblin siege unit.
 *
 * Each of the 3 "pairs" is:
 *   • 1 large orc (graatorc GLB) at the slot centre
 *   • 2 small goblins (goblin_crew GLB) lurking nearby at reduced opacity
 *
 * The goblins are intentionally tiny and semi-transparent —
 * "invisible" shadow-dwellers that swarm from the orc's feet.
 */
import { useMemo } from 'react';
import type { UnitData } from '@/game/store/gameStore';
import { GLBSoldierMesh }  from './GLBSoldierMesh';
import { SelectionRing }   from './CharacterBase';
import { RegimentLabel }   from './RegimentLabel';
import { useGameStore }    from '@/game/store/gameStore';
import * as THREE          from 'three';
import type { UnitState }  from '@/game/store/gameStore';
import { getCommandMode, setCommandMode } from '@/game/input/CommandMode';

const ORC_GLB    = '/assets/characters/glb/graatorc.glb';
const GOBLIN_GLB = '/assets/characters/glb/goblin_crew.glb';

// Orc: map unitState → Mixamo animation clip name
const ORC_ANIMS: Partial<Record<UnitState, string>> = {
  idle:   'Idle_10',
  move:   'Running',
  attack: 'Charged_Spell_Cast',   // stone-throw lob
  dead:   'Knock_Down',
};

// Goblin: map unitState → Mixamo animation clip name
const GOBLIN_ANIMS: Partial<Record<UnitState, string>> = {
  idle:   'Walking',
  move:   'Running',
  attack: 'Weapon_Combo_2',
  dead:   'Fall_Dead_from_Abdominal_Injury',
};

// Offsets for the 2 goblins relative to the orc
const GOBLIN_OFFSETS: [number, number][] = [
  [-0.9, -0.5],
  [ 0.9,  0.3],
];

import { useGLTF } from '@react-three/drei';

interface Props {
  unit: UnitData;
  isSelected: boolean;
  preserveOnDeath?: boolean;
}

export function GrieeGleeRegiment({ unit, isSelected, preserveOnDeath = false }: Props) {
  const alivePairs = unit.state === 'dead' && !preserveOnDeath
    ? 0
    : Math.max(1, Math.ceil((unit.health / unit.maxHealth) * unit.maxSoldiers));

  // Build slot positions in formation (1 row × 3 cols)
  const slots: [number, number, number][] = useMemo(() => {
    const out: [number, number, number][] = [];
    const cols = unit.formationCols ?? 3;
    const spacing = unit.spacing ?? 5;
    const cos = Math.cos(unit.formationFacing);
    const sin = Math.sin(unit.formationFacing);
    for (let c = 0; c < alivePairs; c++) {
      const localX = (c - (cols - 1) / 2) * spacing;
      out.push([
        unit.position[0] + cos * localX,
        0,
        unit.position[2] + sin * localX,
      ]);
    }
    return out;
  }, [unit.position, unit.formationCols, unit.spacing, unit.formationFacing, alivePairs]);

  const ringRadius = ((unit.formationCols ?? 3) * (unit.spacing ?? 5)) / 2 + 1.5;

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
    <group name={`grieeGlee-${unit.id}`}>
      {/* Invisible click hitbox */}
      <mesh
        position={[unit.position[0], 1.5, unit.position[2]]}
        onClick={handleClick}
        visible={false}
      >
        <boxGeometry args={[ringRadius * 2, 3, ringRadius]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Render each alive pair */}
      {slots.map((pos, i) => (
        <group key={i}>
          {/* Large orc */}
          <GLBSoldierMesh
            glbPath={ORC_GLB}
            animMap={ORC_ANIMS}
            position={pos}
            facing={unit.formationFacing}
            scale={0.012}              /* Mixamo metres → scene units */
            unitState={unit.state}
          />

          {/* 2 small goblins lurking around the orc */}
          {GOBLIN_OFFSETS.map(([dx, dz], gi) => (
            <GLBSoldierMesh
              key={gi}
              glbPath={GOBLIN_GLB}
              animMap={GOBLIN_ANIMS}
              position={[pos[0] + dx, 0, pos[2] + dz]}
              facing={unit.formationFacing + (gi === 0 ? 0.4 : -0.4)}
              scale={0.006}            /* half the orc's scale — tiny & furtive */
              opacity={0.55}           /* semi-transparent: "invisible" dwellers */
              unitState={unit.state}
            />
          ))}
        </group>
      ))}

      <SelectionRing visible={isSelected} radius={ringRadius} />
      <RegimentLabel unit={unit} aliveSoldiers={alivePairs} labelHeight={5} />
    </group>
  );
}
