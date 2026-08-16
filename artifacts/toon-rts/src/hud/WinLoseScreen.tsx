import { useEffect, useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { GameUI } from '@/game/assets/CraftpixManifest';

export function WinLoseScreen() {
  const phase      = useGameStore(s => s.phase);
  const teamScores = useGameStore(s => s.teamScores);

  // Derived booleans — return a primitive so Zustand's reference equality
  // prevents re-renders on every combat tick that doesn't flip the outcome.
  const living1 = useGameStore(s => s.units.filter(u => u.teamId === 1 && u.state !== 'dead').length);
  const living2 = useGameStore(s => s.units.filter(u => u.teamId === 2 && u.state !== 'dead').length);
  const hasUnits = useGameStore(s => s.units.length > 0);

  const isVictory = phase === 'victory' || (hasUnits && living2 === 0 && living1 > 0);
  const isDefeat  = hasUnits && living1 === 0 && living2 > 0;
  const isActive  = isVictory || isDefeat;

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
      return undefined;
    }
  }, [isActive]);

  if (!isActive) return null;

  const handleRestart = () => {
    useGameStore.setState({ units: [], phase: 'menu' });
    setVisible(false);
  };

  const handleMenu = () => {
    useGameStore.setState({ units: [], phase: 'menu' });
    setVisible(false);
  };

  // Stars based on performance
  const scoreRatio = teamScores.team1 / Math.max(1, teamScores.team1 + teamScores.team2);
  const stars = isVictory ? (scoreRatio > 0.7 ? 3 : scoreRatio > 0.4 ? 2 : 1) : 0;

  return (
    <div
      className="pointer-events-auto"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 60,
      }}
    >
      <div
        style={{
          backgroundImage: `url('${isVictory ? GameUI.winWindow : GameUI.failWindow}')`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          width: '420px',
          minHeight: '360px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '20px 30px 30px',
          transform: visible ? 'scale(1)' : 'scale(0)',
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          position: 'relative',
        }}
      >
        {/* Header image */}
        <img
          src={isVictory ? GameUI.headerWin : GameUI.headerFailed}
          alt={isVictory ? 'Victory' : 'Defeat'}
          style={{
            width: '280px',
            marginTop: '-20px',
            marginBottom: '8px',
            imageRendering: 'auto',
          }}
        />

        {/* Stars (victory only) */}
        {isVictory && (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
            {[GameUI.star1, GameUI.star2, GameUI.star3].map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`star ${i + 1}`}
                style={{
                  width: '56px',
                  opacity: i < stars ? 1 : 0.25,
                  filter: i < stars ? 'drop-shadow(0 0 8px #ffd700)' : 'grayscale(1)',
                  transition: `opacity 0.3s ${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Message */}
        <p style={{
          color: '#f0e8d5',
          fontSize: '14px',
          textAlign: 'center',
          marginBottom: '12px',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          lineHeight: 1.5,
        }}>
          {isVictory
            ? 'The enemy has been vanquished! Glory to your army!'
            : 'Your army has been destroyed. Seek revenge!'}
        </p>

        {/* Scores */}
        <div style={{
          display: 'flex',
          gap: '24px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#f0e8d5',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        }}>
          <span>Player: <strong style={{ color: '#60a5fa' }}>{teamScores.team1}</strong></span>
          <span>Enemy: <strong style={{ color: '#f87171' }}>{teamScores.team2}</strong></span>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleRestart}
            style={{
              backgroundImage: `url('${GameUI.btnRestart}')`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              width: '130px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f0e8d5',
              fontFamily: "'Cinzel', serif",
              fontSize: '13px',
              fontWeight: 600,
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
              transition: 'opacity 0.15s, transform 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            onMouseDown={e  => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={e    => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Play Again
          </button>

          <button
            onClick={handleMenu}
            style={{
              backgroundImage: `url('${GameUI.btnMenu}')`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              width: '130px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f0e8d5',
              fontFamily: "'Cinzel', serif",
              fontSize: '13px',
              fontWeight: 600,
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
              transition: 'opacity 0.15s, transform 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            onMouseDown={e  => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={e    => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}
