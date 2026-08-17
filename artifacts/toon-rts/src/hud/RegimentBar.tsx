/**
 * RegimentBar — Total War-style regiment status strip at the bottom of the screen.
 * Shows all player (teamId=1) regiments with health bars and soldier count.
 * Clicking a card selects that regiment.
 */
import { useGameStore, UnitData, UnitType } from '@/game/store/gameStore';
import { useShallow } from 'zustand/react/shallow';
import { UNIT_ROSTER, getUnitName } from '@/game/data/UnitRoster';

const TYPE_ICON: Record<UnitType, string> = {
  infantry:     '⚔️',
  swordsmen:    '⚔️',
  spearmen:     '🗡️',
  shieldwall:   '🛡️',
  archers:      '🏹',
  skirmishers:  '💨',
  cavalry:      '🏇',
  heavyCavalry: '⚡',
  mage:         '🔮',
  boltThrower:  '🎯',
  catapult:     '💣',
};

function RegimentCard({
  unit,
  isSelected,
  onClick,
}: {
  unit: UnitData;
  isSelected: boolean;
  onClick: () => void;
}) {
  const hpPct = unit.maxHealth > 0 ? unit.health / unit.maxHealth : 0;
  const aliveSoldiers = unit.state === 'dead'
    ? 0
    : Math.max(0, Math.ceil(hpPct * unit.maxSoldiers));

  const icon = TYPE_ICON[unit.type] ?? '⚔️';
  const rosterIdx = UNIT_ROSTER.findIndex(u => u.type === unit.type);
  const name = getUnitName(unit.race, rosterIdx >= 0 ? rosterIdx : 0);

  const hpColor = hpPct > 0.6 ? '#4caf50' : hpPct > 0.3 ? '#ff9800' : '#f44336';
  const isDead = unit.state === 'dead' || unit.health <= 0;

  return (
    <button
      onClick={onClick}
      style={{
        background: isSelected
          ? 'rgba(255,215,0,0.18)'
          : isDead
          ? 'rgba(50,20,20,0.5)'
          : 'rgba(0,0,0,0.55)',
        border: `1px solid ${isSelected ? 'rgba(255,215,0,0.8)' : isDead ? 'rgba(200,50,50,0.4)' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 8,
        padding: '5px 8px',
        cursor: isDead ? 'default' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        minWidth: 72,
        maxWidth: 90,
        backdropFilter: 'blur(4px)',
        opacity: isDead ? 0.4 : 1,
        transition: 'background 0.2s, border 0.2s, opacity 0.4s',
        boxShadow: isSelected ? '0 0 12px rgba(255,215,0,0.3)' : 'none',
      }}
    >
      {/* Icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{
          fontSize: 9, color: isDead ? '#888' : '#ddd',
          fontFamily: "'Cinzel', serif",
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {isDead ? 'ROUTED' : name}
        </span>
      </div>

      {/* HP bar */}
      <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
        <div style={{
          width: `${hpPct * 100}%`, height: '100%',
          background: hpColor, borderRadius: 2,
          transition: 'width 0.3s',
        }} />
      </div>

      {/* Soldier count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: '#aaa' }}>
          {isDead ? '0' : aliveSoldiers}/{unit.maxSoldiers}
        </span>
        <span style={{ fontSize: 9, color: hpColor, fontWeight: 700 }}>
          {isDead ? '—' : `${Math.round(hpPct * 100)}%`}
        </span>
      </div>
    </button>
  );
}

export function RegimentBar() {
  const units = useGameStore(
    useShallow(s => s.units.filter(u => u.teamId === 1)),
  );
  const selectedUnitIds = useGameStore(useShallow(s => s.selectedUnitIds));
  const selectUnits = useGameStore(s => s.selectUnits);

  if (units.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        gap: 5,
        flexWrap: 'wrap',
        justifyContent: 'center',
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.35)',
        borderRadius: 12,
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(255,215,0,0.1)',
        maxWidth: '100%',
      }}
    >
      {units.map(unit => (
        <RegimentCard
          key={unit.id}
          unit={unit}
          isSelected={selectedUnitIds.includes(unit.id)}
          onClick={() => {
            if (unit.state === 'dead') return;
            selectUnits(
              selectedUnitIds.includes(unit.id) ? [] : [unit.id],
            );
          }}
        />
      ))}
    </div>
  );
}
