import { useGameStore, AbilityType } from '@/game/store/gameStore';
import { GameUI } from '@/game/assets/CraftpixManifest';
import { ABILITY_ICON, GameIcon } from './GameIcon';

const ABILITIES: { id: AbilityType; key: string; name: string; color: string }[] = [
  { id: 'ice',       key: 'Q', name: 'Frost Nova',      color: '#88ccff' },
  { id: 'lightning', key: 'E', name: 'Chain Lightning', color: '#aaffee' },
  { id: 'meteor',    key: 'R', name: 'Meteor Strike',   color: '#ff8833' },
  { id: 'fire',      key: 'F', name: 'Inferno',         color: '#ff4400' },
  { id: 'wind',      key: 'T', name: 'Tornado',         color: '#aaddcc' },
  { id: 'poison',    key: 'G', name: 'Poison Cloud',    color: '#66dd22' },
  { id: 'thunder',   key: 'H', name: 'Thunder Strike',  color: '#99ccff' },
  { id: 'flame_blast', key: 'Y', name: 'Flame Blast',   color: '#ff6600' },
];

export function AbilityHotbar() {
  const activeAbility    = useGameStore(s => s.activeAbility);
  const setActiveAbility = useGameStore(s => s.setActiveAbility);

  return (
    <div
      className="pointer-events-auto"
      style={{
        display: 'flex',
        gap: '6px',
        padding: '6px 12px',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(255,215,0,0.2)',
        borderRadius: '12px',
      }}
    >
      {ABILITIES.map(ab => {
        const active = activeAbility === ab.id;
        return (
          <button
            key={ab.id}
            onClick={() => setActiveAbility(active ? null : ab.id)}
            title={`${ab.name} (${ab.key})`}
            style={{
              position: 'relative',
              width: '56px',
              height: '56px',
              borderRadius: '8px',
              border: active ? `2px solid #ffd700` : '2px solid rgba(255,255,255,0.1)',
              background: active
                ? 'rgba(255,215,0,0.15)'
                : 'rgba(0,0,0,0.4)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              transform: active ? 'scale(1.1)' : 'scale(1)',
              boxShadow: active ? `0 0 16px rgba(255,215,0,0.4)` : 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              if (!active) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={e => {
              if (!active) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            }}
            onMouseDown={e  => { e.currentTarget.style.transform = active ? 'scale(1.05)' : 'scale(0.95)'; }}
            onMouseUp={e    => { e.currentTarget.style.transform = active ? 'scale(1.1)' : 'scale(1)'; }}
          >
            {/* Key badge */}
            <span style={{
              position: 'absolute',
              top: '-8px',
              right: '-6px',
              width: '20px',
              height: '20px',
              background: '#92400e',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700,
              color: '#fff',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
            }}>
              {ab.key}
            </span>
            <GameIcon name={ABILITY_ICON[ab.id]} size={20} />
            <span style={{
              fontSize: '9px',
              color: active ? '#ffd700' : '#9ca3af',
              lineHeight: 1,
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            }}>
              {ab.name.split(' ')[0]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
