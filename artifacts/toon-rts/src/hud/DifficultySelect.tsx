import { useGameStore } from '@/game/store/gameStore';
import { GameUI } from '@/game/assets/CraftpixManifest';

export function DifficultySelect() {
  const spawnInitialArmies = useGameStore(s => s.spawnInitialArmies);
  const setDifficulty      = useGameStore(s => s.setDifficulty);

  const handleSelect = (d: 'easy' | 'normal' | 'hard') => {
    setDifficulty(d);
    spawnInitialArmies();
  };

  const btnStyle = (img: string): React.CSSProperties => ({
    backgroundImage: `url('${img}')`,
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    border: 'none',
    cursor: 'pointer',
    width: '160px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#f0e8d5',
    fontFamily: "'Cinzel', serif",
    fontSize: '16px',
    fontWeight: 700,
    textShadow: '0 1px 4px rgba(0,0,0,0.9)',
    transition: 'opacity 0.15s, transform 0.1s',
  });

  return (
    <div
      className="pointer-events-auto"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(6px)',
        zIndex: 50,
      }}
    >
      <div
        style={{
          backgroundImage: `url('${GameUI.diffWindow}')`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          width: '400px',
          minHeight: '320px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          gap: '16px',
        }}
      >
        <div style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '22px',
          color: '#ffd700',
          textShadow: '0 0 20px rgba(255,215,0,0.5)',
          marginBottom: '8px',
          letterSpacing: '0.1em',
        }}>
          Choose Difficulty
        </div>

        <p style={{
          fontSize: '12px',
          color: '#9ca3af',
          textAlign: 'center',
          marginBottom: '8px',
          lineHeight: 1.5,
        }}>
          Select how challenging your enemies will be.
        </p>

        <button
          style={btnStyle(GameUI.btnEasy)}
          onClick={() => handleSelect('easy')}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          onMouseDown={e  => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={e    => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Easy
        </button>

        <button
          style={btnStyle(GameUI.btnNormal)}
          onClick={() => handleSelect('normal')}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          onMouseDown={e  => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={e    => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Normal
        </button>

        <button
          style={btnStyle(GameUI.btnHard)}
          onClick={() => handleSelect('hard')}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          onMouseDown={e  => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={e    => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Hard
        </button>
      </div>
    </div>
  );
}
