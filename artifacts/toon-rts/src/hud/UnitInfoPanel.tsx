import { useGameStore, UnitData } from '@/game/store/gameStore';
import { GameUI } from '@/game/assets/CraftpixManifest';

function unitTypeCounts(units: UnitData[]) {
  return {
    infantry: units.filter(u => u.type === 'infantry').length,
    cavalry:  units.filter(u => u.type === 'cavalry').length,
    siege:    units.filter(u => u.type === 'catapult' || u.type === 'boltThrower').length,
    mage:     units.filter(u => u.type === 'mage').length,
  };
}

function totalHP(units: UnitData[]) {
  const hp    = units.reduce((s, u) => s + u.health, 0);
  const maxHp = units.reduce((s, u) => s + u.maxHealth, 0);
  return { hp, maxHp };
}

interface ArmyColumnProps {
  label: string;
  color: string;
  units: UnitData[];
  allUnits: UnitData[];
}

function ArmyColumn({ label, color, units, allUnits }: ArmyColumnProps) {
  const alive   = units.filter(u => u.state !== 'dead');
  const counts  = unitTypeCounts(alive);
  const { hp, maxHp } = totalHP(alive);
  const hpPct = maxHp > 0 ? hp / maxHp : 0;
  const hpColor = hpPct > 0.6 ? '#22c55e' : hpPct > 0.3 ? '#eab308' : '#ef4444';

  return (
    <div style={{ flex: 1, padding: '6px 10px' }}>
      <div style={{
        color,
        fontFamily: "'Cinzel', serif",
        fontSize: '13px',
        fontWeight: 700,
        marginBottom: '6px',
        textShadow: '0 1px 4px rgba(0,0,0,0.9)',
        letterSpacing: '0.05em',
      }}>
        {label}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '6px' }}>
        {counts.infantry > 0 && (
          <div style={{ fontSize: '11px', color: '#f0e8d5', display: 'flex', justifyContent: 'space-between' }}>
            <span>⚔️ Infantry</span>
            <span style={{ color: '#ffd700' }}>{counts.infantry}</span>
          </div>
        )}
        {counts.cavalry > 0 && (
          <div style={{ fontSize: '11px', color: '#f0e8d5', display: 'flex', justifyContent: 'space-between' }}>
            <span>🐎 Cavalry</span>
            <span style={{ color: '#ffd700' }}>{counts.cavalry}</span>
          </div>
        )}
        {counts.siege > 0 && (
          <div style={{ fontSize: '11px', color: '#f0e8d5', display: 'flex', justifyContent: 'space-between' }}>
            <span>💣 Siege</span>
            <span style={{ color: '#ffd700' }}>{counts.siege}</span>
          </div>
        )}
        {counts.mage > 0 && (
          <div style={{ fontSize: '11px', color: '#f0e8d5', display: 'flex', justifyContent: 'space-between' }}>
            <span>🔮 Mage</span>
            <span style={{ color: '#ffd700' }}>{counts.mage}</span>
          </div>
        )}
      </div>

      <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px' }}>
        {alive.length} / {units.length} alive
      </div>

      {/* HP Bar */}
      <div style={{
        background: 'rgba(0,0,0,0.5)',
        borderRadius: '4px',
        height: '6px',
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${hpPct * 100}%`,
          height: '100%',
          background: hpColor,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px' }}>
        {Math.ceil(hp)} / {maxHp} HP
      </div>
    </div>
  );
}

export function UnitInfoPanel() {
  const units = useGameStore(s => s.units);
  const phase = useGameStore(s => s.phase);

  const team1 = units.filter(u => u.teamId === 1);
  const team2 = units.filter(u => u.teamId === 2);

  return (
    <div
      className="pointer-events-auto"
      style={{
        backgroundImage: `url('${GameUI.table1}')`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        width: '320px',
        minHeight: '110px',
        display: 'flex',
        alignItems: 'stretch',
        position: 'relative',
      }}
    >
      {units.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: '12px',
          fontStyle: 'italic',
          padding: '16px',
        }}>
          No armies deployed
        </div>
      ) : (
        <>
          <ArmyColumn label="⚔ Player" color="#60a5fa" units={team1} allUnits={units} />
          <div style={{ width: '1px', background: 'rgba(255,215,0,0.2)', margin: '8px 0' }} />
          <ArmyColumn label="☠ Enemy" color="#f87171" units={team2} allUnits={units} />
        </>
      )}

      {phase === 'victory' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: '4px',
        }}>
          <div style={{
            color: '#ffd700',
            fontFamily: "'Cinzel', serif",
            fontSize: '18px',
            textShadow: '0 0 20px #ffd700',
          }}>
            🏆 Victory!
          </div>
        </div>
      )}
    </div>
  );
}
