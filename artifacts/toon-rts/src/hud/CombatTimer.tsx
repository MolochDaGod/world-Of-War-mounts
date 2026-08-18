/**
 * CombatTimer — top-centre countdown displayed during battle.
 * Polls combatElapsed from the store at 1 Hz to avoid 30 Hz React updates.
 */
import { useEffect, useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';

const BATTLE_LIMIT = 480; // 8 minutes

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CombatTimer() {
  const phase = useGameStore(s => s.phase);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (phase !== 'battle') return;
    const id = setInterval(() => {
      setElapsed(useGameStore.getState().combatElapsed);
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  if (phase !== 'battle') return null;

  const remaining = Math.max(0, BATTLE_LIMIT - elapsed);
  const urgent    = remaining < 60;
  const warn      = remaining < 120;

  return (
    <div style={{
      position: 'fixed',
      top: '12px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 600,
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2px',
    }}>
      <div style={{
        background: urgent
          ? 'rgba(180,0,0,0.85)'
          : warn
          ? 'rgba(140,80,0,0.85)'
          : 'rgba(0,0,0,0.72)',
        border: `1.5px solid ${urgent ? '#ff4444' : warn ? '#ffaa22' : 'rgba(255,255,255,0.18)'}`,
        borderRadius: '8px',
        padding: '3px 18px',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: urgent ? '0 0 18px #ff444466' : 'none',
        animation: urgent ? 'pulse 0.8s ease-in-out infinite' : 'none',
      }}>
        <span style={{
          fontSize: '10px',
          letterSpacing: '0.12em',
          fontWeight: 700,
          color: urgent ? '#ffaaaa' : warn ? '#ffcc88' : 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase',
        }}>
          ⏱ Battle
        </span>
        <span style={{
          fontSize: '22px',
          fontWeight: 900,
          fontFamily: "'Cinzel', serif",
          color: urgent ? '#ffdddd' : warn ? '#ffe4aa' : '#ffffff',
          minWidth: '52px',
          textAlign: 'center',
          letterSpacing: '0.04em',
        }}>
          {fmt(remaining)}
        </span>
        {elapsed > 0 && (
          <span style={{
            fontSize: '9px',
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.08em',
          }}>
            +{fmt(elapsed)}
          </span>
        )}
      </div>
    </div>
  );
}
