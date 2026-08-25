import { useGameStore } from '@/game/store/gameStore';
import { GameIcon, GameIconName } from './GameIcon';

// ── Derived per-team data (all primitives, no raw units array) ──────────────

interface ArmyColumnProps {
  label: string;
  color: string;
  teamId: 1 | 2;
}

function ArmyColumn({ label, color, teamId }: ArmyColumnProps) {
  const alive     = useGameStore(s => s.units.filter(u => u.teamId === teamId && u.state !== 'dead').length);
  const total     = useGameStore(s => s.units.filter(u => u.teamId === teamId).length);
  const infantry  = useGameStore(s => s.units.filter(u => u.teamId === teamId && u.state !== 'dead' && u.type === 'infantry').length);
  const cavalry   = useGameStore(s => s.units.filter(u => u.teamId === teamId && u.state !== 'dead' && u.type === 'cavalry').length);
  const siege     = useGameStore(s => s.units.filter(u => u.teamId === teamId && u.state !== 'dead' && (u.type === 'catapult' || u.type === 'boltThrower')).length);
  const mage      = useGameStore(s => s.units.filter(u => u.teamId === teamId && u.state !== 'dead' && u.type === 'mage').length);
  const hp        = useGameStore(s => s.units.filter(u => u.teamId === teamId && u.state !== 'dead').reduce((sum, u) => sum + u.health, 0));
  const maxHp     = useGameStore(s => s.units.filter(u => u.teamId === teamId && u.state !== 'dead').reduce((sum, u) => sum + u.maxHealth, 0));

  const hpPct   = maxHp > 0 ? hp / maxHp : 0;
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
        {infantry > 0 && (
          <div style={{ fontSize: '11px', color: '#f0e8d5', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><GameIcon name="sword" size={13} /> Infantry</span>
            <span style={{ color: '#ffd700' }}>{infantry}</span>
          </div>
        )}
        {cavalry > 0 && (
          <div style={{ fontSize: '11px', color: '#f0e8d5', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><GameIcon name="move" size={13} /> Cavalry</span>
            <span style={{ color: '#ffd700' }}>{cavalry}</span>
          </div>
        )}
        {siege > 0 && (
          <div style={{ fontSize: '11px', color: '#f0e8d5', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><GameIcon name="bomb" size={13} /> Siege</span>
            <span style={{ color: '#ffd700' }}>{siege}</span>
          </div>
        )}
        {mage > 0 && (
          <div style={{ fontSize: '11px', color: '#f0e8d5', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><GameIcon name="wand" size={13} /> Mage</span>
            <span style={{ color: '#ffd700' }}>{mage}</span>
          </div>
        )}
      </div>

      <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px' }}>
        {alive} / {total} alive
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
  const hasUnits = useGameStore(s => s.units.length > 0);
  const phase    = useGameStore(s => s.phase);

  return (
    <div
      className="pointer-events-auto"
      style={{
        background: 'linear-gradient(135deg, rgba(7,12,22,0.93), rgba(20,29,46,0.86))',
        border: '1px solid rgba(255,215,0,0.2)',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.32)',
        backdropFilter: 'blur(8px)',
        width: '320px',
        minHeight: '110px',
        display: 'flex',
        alignItems: 'stretch',
        position: 'relative',
      }}
    >
      {!hasUnits ? (
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
          <ArmyColumn label="Player" color="#60a5fa" teamId={1} />
          <div style={{ width: '1px', background: 'rgba(255,215,0,0.2)', margin: '8px 0' }} />
          <ArmyColumn label="Enemy" color="#f87171" teamId={2} />
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
            Victory!
          </div>
        </div>
      )}
    </div>
  );
}
