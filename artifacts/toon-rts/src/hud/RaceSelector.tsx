/**
 * RaceSelector — three-faction choice screen.
 *
 * Faction → Race mapping lives in FactionData.ts.
 * Player picks ONE faction; enemy picks ONE (default = different faction).
 */
import { useState } from 'react';
import { useGameStore } from '../game/store/gameStore';
import {
  Faction, FACTION_META, FACTION_DISPLAY, FACTION_TO_RACE,
} from '../game/data/FactionData';

const FACTIONS: Faction[] = ['Crusade', 'Fabled', 'Legion', 'Barbarians', 'Dwarves', 'Orcs'];

// ── Single faction card ───────────────────────────────────────────────────────
function FactionCard({
  faction, selected, side, onClick,
}: {
  faction: Faction;
  selected: boolean;
  side: 'player' | 'enemy';
  onClick: () => void;
}) {
  const meta = FACTION_META[faction];
  const ringColor = side === 'player' ? '#4a9eff' : '#e03030';

  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: selected ? meta.bgGradient : 'rgba(255,255,255,0.03)',
        border: selected
          ? `2px solid ${ringColor}`
          : '2px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '20px 16px 18px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s ease',
        transform: selected ? 'scale(1.03)' : 'scale(1)',
        boxShadow: selected ? `0 0 32px ${meta.glowColor}, 0 0 8px ${meta.glowColor}` : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle bg gradient bloom */}
      {selected && (
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.12,
          background: `radial-gradient(ellipse at 50% 0%, ${meta.primaryColor} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Emblem */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
        <img
          src={meta.emblem}
          alt={FACTION_DISPLAY[faction]}
          style={{
            width: 90, height: 90,
            filter: selected
              ? `drop-shadow(0 0 16px ${meta.primaryColor}) drop-shadow(0 0 6px ${meta.primaryColor})`
              : 'brightness(0.6)',
            transition: 'filter 0.25s ease',
          }}
        />
      </div>

      {/* Name */}
      <div style={{
        textAlign: 'center',
        fontFamily: "'Cinzel', serif",
        fontSize: 15,
        fontWeight: 700,
        color: selected ? meta.primaryColor : '#888',
        letterSpacing: '0.08em',
        marginBottom: 10,
        transition: 'color 0.2s',
      }}>
        {FACTION_DISPLAY[faction].toUpperCase()}
      </div>

      {/* Lore */}
      <p style={{
        fontSize: 11,
        color: selected ? '#ccc' : '#555',
        lineHeight: 1.55,
        marginBottom: 12,
        transition: 'color 0.2s',
      }}>
        {meta.lore}
      </p>

      {/* Trait tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {meta.traits.map(t => (
          <span key={t} style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.06em',
            padding: '3px 8px',
            borderRadius: 20,
            background: selected ? `${meta.primaryColor}22` : 'rgba(255,255,255,0.05)',
            border: `1px solid ${selected ? meta.primaryColor + '55' : 'rgba(255,255,255,0.1)'}`,
            color: selected ? meta.primaryColor : '#666',
            textTransform: 'uppercase',
            transition: 'all 0.2s',
          }}>{t}</span>
        ))}
      </div>

      {/* Selected checkmark */}
      {selected && (
        <div style={{
          position: 'absolute', top: 10, right: 12,
          width: 22, height: 22, borderRadius: '50%',
          background: ringColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: '#fff', fontWeight: 900,
        }}>✓</div>
      )}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function RaceSelector() {
  const setSelectedRace = useGameStore(s => s.setSelectedRace);
  const setEnemyRace    = useGameStore(s => s.setEnemyRace);
  const setPhase        = useGameStore(s => s.setPhase);
  const clearPlayerArmy = useGameStore(s => s.clearPlayerArmy);

  const [player, setPlayer] = useState<Faction>('Crusade');
  const [enemy,  setEnemy]  = useState<Faction>('Legion');

  const handleStart = () => {
    setSelectedRace(FACTION_TO_RACE[player]);
    setEnemyRace(FACTION_TO_RACE[enemy]);
    clearPlayerArmy();
    setPhase('setup');
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: '#060810',
      backgroundImage: 'radial-gradient(ellipse at 50% -20%, rgba(40,50,120,0.5) 0%, transparent 60%)',
      overflow: 'auto', padding: '24px 20px 32px',
    }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <h1 style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 'clamp(40px, 5vw, 64px)',
            color: '#e8c060',
            letterSpacing: '0.18em',
            textShadow: '0 0 40px rgba(232,192,96,0.5), 0 0 80px rgba(232,192,96,0.2)',
            margin: 0,
            lineHeight: 1,
          }}>RACE WARS</h1>
        </div>
        <p style={{
          fontSize: 12, color: '#555', letterSpacing: '0.3em',
          textTransform: 'uppercase', margin: '10px 0 0',
        }}>
          Choose Your Factions · Marshal Your Forces · Conquer
        </p>
      </div>

      {/* ── Player faction pick ──────────────────────────────────────────── */}
      <div style={{ width: '100%', maxWidth: 1100, marginBottom: 24 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
        }}>
          <div style={{
            height: 1, flex: 1,
            background: 'linear-gradient(90deg,transparent,rgba(74,158,255,0.4))',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
            color: '#4a9eff', textTransform: 'uppercase',
          }}>⚔ Your Faction</span>
          <div style={{
            height: 1, flex: 1,
            background: 'linear-gradient(90deg,rgba(74,158,255,0.4),transparent)',
          }} />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}>
          {FACTIONS.map(f => (
            <FactionCard
              key={f}
              faction={f}
              selected={player === f}
              side="player"
              onClick={() => setPlayer(f)}
            />
          ))}
        </div>
      </div>

      {/* VS divider */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <span style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 28, fontWeight: 900,
          color: '#e8c060',
          textShadow: '0 0 20px rgba(232,192,96,0.5)',
          letterSpacing: '0.15em',
        }}>VS</span>
      </div>

      {/* ── Enemy faction pick ───────────────────────────────────────────── */}
      <div style={{ width: '100%', maxWidth: 1100, marginBottom: 32 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
        }}>
          <div style={{
            height: 1, flex: 1,
            background: 'linear-gradient(90deg,transparent,rgba(224,48,48,0.4))',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
            color: '#e03030', textTransform: 'uppercase',
          }}>☠ Enemy Faction</span>
          <div style={{
            height: 1, flex: 1,
            background: 'linear-gradient(90deg,rgba(224,48,48,0.4),transparent)',
          }} />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}>
          {FACTIONS.map(f => (
            <FactionCard
              key={f}
              faction={f}
              selected={enemy === f}
              side="enemy"
              onClick={() => setEnemy(f)}
            />
          ))}
        </div>
      </div>

      {/* Mirror match warning */}
      {player === enemy && (
        <p style={{
          fontSize: 12, color: '#f0a030',
          marginBottom: 16, fontStyle: 'italic',
        }}>
          ⚠ Mirror match — both armies will share the same models.
        </p>
      )}

      {/* Marshal button */}
      <button
        onClick={handleStart}
        style={{
          padding: '16px 64px',
          fontFamily: "'Cinzel', serif",
          fontSize: 20, fontWeight: 700,
          color: '#fff',
          background: 'linear-gradient(135deg,#b87820,#e8a030,#b87820)',
          border: '2px solid rgba(255,215,0,0.6)',
          borderRadius: 50,
          cursor: 'pointer',
          boxShadow: '0 0 40px rgba(232,160,48,0.4), 0 4px 20px rgba(0,0,0,0.5)',
          transition: 'all 0.2s',
          letterSpacing: '0.1em',
          marginBottom: 18,
        }}
        onMouseEnter={e => {
          (e.target as HTMLElement).style.boxShadow = '0 0 60px rgba(232,160,48,0.7), 0 4px 30px rgba(0,0,0,0.5)';
          (e.target as HTMLElement).style.transform = 'scale(1.05)';
        }}
        onMouseLeave={e => {
          (e.target as HTMLElement).style.boxShadow = '0 0 40px rgba(232,160,48,0.4), 0 4px 20px rgba(0,0,0,0.5)';
          (e.target as HTMLElement).style.transform = 'scale(1)';
        }}
      >
        Marshal Your Forces
      </button>

      <p style={{
        fontSize: 10, color: '#333', letterSpacing: '0.25em',
        textTransform: 'uppercase',
      }}>
        WASD · Scroll Zoom · MMB Pan · LMB Select · RMB Move · RMB+Units = Attack-Move
      </p>
    </div>
  );
}
