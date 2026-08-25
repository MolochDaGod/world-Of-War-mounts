/**
 * RegimentLabel — floating HTML label above each regiment.
 *
 * Shows:
 *   - Regiment role name (e.g. "Swordsmen", "Heavy Cavalry")
 *   - Live soldier count: "12 / 16"
 *   - HP bar (colour-coded by health %)
 *   - Crown icon when unit is a commander
 *
 * Uses @react-three/drei Html component — rendered as DOM overlay,
 * so it always faces the camera and isn't occluded by 3D geometry.
 */
import { Html } from '@react-three/drei';
import { UnitData } from '@/game/store/gameStore';

const TYPE_LABEL: Record<UnitData['type'], string> = {
  infantry:     'Infantry',
  swordsmen:    'Swordsmen',
  spearmen:     'Spearmen',
  shieldwall:   'Shield Wall',
  archers:      'Archers',
  skirmishers:  'Skirmishers',
  cavalry:      'Cavalry',
  heavyCavalry: 'Heavy Cavalry',
  mage:         'Mage',
  boltThrower:  'Bolt Thrower',
  catapult:     'Catapult',
  grieeGlee:    'Griee & Glee',
  skeletonWarrior: 'Summoned Skeletons',
  meshyWarrior: 'Elite Champion',
};

const TEAM_HUD: Record<1 | 2, { border: string; bg: string; glow: string }> = {
  1: { border: 'rgba(70,140,255,0.55)', bg: 'rgba(5,18,55,0.78)', glow: '#4488ff' },
  2: { border: 'rgba(255,70,70,0.55)',  bg: 'rgba(55,5,5,0.78)',  glow: '#ff4444' },
};

function hpColor(pct: number): string {
  if (pct > 0.6) return '#4ade80';
  if (pct > 0.3) return '#fbbf24';
  return '#ef4444';
}

interface Props {
  unit: UnitData;
  aliveSoldiers: number;
  labelHeight: number;  // world-units above ground
}

export function RegimentLabel({ unit, aliveSoldiers, labelHeight }: Props) {
  if (unit.state === 'dead') return null;

  const hpPct   = Math.max(0, unit.health / unit.maxHealth);
  const theme   = TEAM_HUD[unit.teamId];
  const isCmd   = (unit as any).isCommander;
  const label   = isCmd ? ((unit as any).commanderName ?? 'Commander') : TYPE_LABEL[unit.type];

  return (
    <Html
      position={[unit.position[0], labelHeight, unit.position[2]]}
      center
      distanceFactor={60}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
      zIndexRange={[1, 10]}
    >
      <div style={{
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: 6,
        padding: '3px 7px',
        minWidth: 80,
        boxShadow: `0 0 8px ${theme.glow}33`,
        fontFamily: 'system-ui, sans-serif',
        fontSize: 10,
        color: '#e8e8e8',
        whiteSpace: 'nowrap',
        textAlign: 'center',
      }}>
        {isCmd && (
          <div style={{ fontSize: 8, marginBottom: 2, color: '#ffd700', letterSpacing: '0.12em' }}>COMMANDER</div>
        )}
        <div style={{
          fontWeight: 700,
          letterSpacing: '0.03em',
          color: isCmd ? '#ffd700' : '#fff',
          fontSize: isCmd ? 11 : 10,
        }}>
          {label}
        </div>
        <div style={{ color: '#aaa', fontSize: 9, marginBottom: 3 }}>
          {aliveSoldiers} / {unit.maxSoldiers}
        </div>
        {/* HP bar */}
        <div style={{
          height: 3,
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${hpPct * 100}%`,
            height: '100%',
            background: hpColor(hpPct),
            borderRadius: 2,
            transition: 'width 0.4s ease',
          }} />
        </div>
        {unit.standGround && (
          <div style={{ color: '#7eb3ff', fontSize: 8, marginTop: 2 }}>⛊ HOLD</div>
        )}
      </div>
    </Html>
  );
}
