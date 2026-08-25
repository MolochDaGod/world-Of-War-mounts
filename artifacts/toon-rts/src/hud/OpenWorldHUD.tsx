import { useState, useEffect } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { useWorldStore } from '@/game/store/worldStore';
import { GameUI } from '@/game/assets/CraftpixManifest';

import { ResourceBar }    from './ResourceBar';
import { MiniMap }        from './MiniMap';
import { UnitInfoPanel }  from './UnitInfoPanel';
import { AbilityHotbar }  from './AbilityHotbar';
import { WinLoseScreen }  from './WinLoseScreen';
import { ShopPanel }      from './ShopPanel';
import { BuildPanel }     from './BuildPanel';
import { RegimentBar }            from './RegimentBar';
import { SelectionBoxOverlay }   from '@/game/input/RTSInputController';
import { CommandBar }            from './CommandBar';
import { CombatTimer }           from './CombatTimer';
import { UnitAbilityBar }        from './UnitAbilityBar';
import { HeroAbilityBar }        from './HeroAbilityBar';
import { useBuildStore }          from '@/game/store/buildStore';
import { GameIcon }               from './GameIcon';

// ── Time of day display ────────────────────────────────────────────────────────
// Polls getState() at 1Hz instead of subscribing to timeOfDay (written at 60fps
// by WorldTick's useFrame). This eliminates 60 synchronous React updates/sec.
function TimeOfDay() {
  const [display, setDisplay] = useState(() => {
    const s = useWorldStore.getState();
    return { timeOfDay: s.timeOfDay, dayCount: s.dayCount };
  });

  useEffect(() => {
    const id = setInterval(() => {
      const s = useWorldStore.getState();
      setDisplay({ timeOfDay: s.timeOfDay, dayCount: s.dayCount });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const { timeOfDay, dayCount } = display;
  const isNight = timeOfDay < 6 || timeOfDay >= 20;
  const hours   = Math.floor(timeOfDay);
  const minutes = Math.floor((timeOfDay % 1) * 60);
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  return (
    <div
      className="pointer-events-auto"
      style={{
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(255,215,0,0.2)',
        borderRadius: '10px',
        padding: '6px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#ffd700',
        fontFamily: "'Cinzel', serif",
        fontSize: '13px',
        textShadow: '0 1px 4px rgba(0,0,0,0.9)',
      }}
    >
      <GameIcon name={isNight ? 'moon' : 'sun'} size={18} />
      <span>Day {dayCount}</span>
      <span style={{ opacity: 0.75, fontVariantNumeric: 'tabular-nums' }}>{timeStr}</span>
    </div>
  );
}

// ── Build button ──────────────────────────────────────────────────────────────
function BuildButton({ onClick, active }: { onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      className="pointer-events-auto"
      style={{
        backgroundImage: `url('${GameUI.btnEmpty1}')`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        border: 'none',
        cursor: 'pointer',
        width: '90px',
        height: '38px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: active ? '#88ccff' : '#ffd700',
        fontFamily: "'Cinzel', serif",
        fontSize: '12px',
        fontWeight: 700,
        textShadow: '0 1px 4px rgba(0,0,0,0.9)',
        gap: '4px',
        opacity: active ? 0.9 : 1,
        outline: active ? '2px solid rgba(68,170,255,0.6)' : 'none',
        transition: 'opacity 0.15s, transform 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={e => (e.currentTarget.style.opacity = active ? '0.9' : '1')}
      onMouseDown={e  => (e.currentTarget.style.transform = 'scale(0.97)')}
      onMouseUp={e    => (e.currentTarget.style.transform = 'scale(1)')}
      title="Toggle Build Mode (B)"
    >
      <GameIcon name="hammer" size={15} /> Build
    </button>
  );
}

// ── Pause button ───────────────────────────────────────────────────────────────
function PauseButton({ paused, onToggle }: { paused: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="pointer-events-auto"
      style={{
        backgroundImage: `url('${GameUI.btnPause}')`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        border: 'none',
        cursor: 'pointer',
        width: '46px',
        height: '46px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f0e8d5',
        fontSize: '16px',
        opacity: paused ? 0.7 : 1,
        transition: 'opacity 0.15s, transform 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={e => (e.currentTarget.style.opacity = paused ? '0.7' : '1')}
      onMouseDown={e  => (e.currentTarget.style.transform = 'scale(0.95)')}
      onMouseUp={e    => (e.currentTarget.style.transform = 'scale(1)')}
      title={paused ? 'Resume' : 'Pause'}
    >
      <GameIcon name={paused ? 'play' : 'pause'} size={16} />
    </button>
  );
}

// ── Shop button ────────────────────────────────────────────────────────────────
function ShopButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="pointer-events-auto"
      style={{
        backgroundImage: `url('${GameUI.btnEmpty1}')`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        border: 'none',
        cursor: 'pointer',
        width: '90px',
        height: '38px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffd700',
        fontFamily: "'Cinzel', serif",
        fontSize: '12px',
        fontWeight: 700,
        textShadow: '0 1px 4px rgba(0,0,0,0.9)',
        gap: '4px',
        transition: 'opacity 0.15s, transform 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      onMouseDown={e  => (e.currentTarget.style.transform = 'scale(0.97)')}
      onMouseUp={e    => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <GameIcon name="store" size={15} /> Shop
    </button>
  );
}

// ── Main HUD ───────────────────────────────────────────────────────────────────
export function OpenWorldHUD() {
  const phase = useGameStore(s => s.phase);
  const isPreparation = phase === 'preparation';

  // Derived boolean — only re-renders when the battle ends, not on every 30Hz
  // position/health write. Zustand compares boolean with === so this is stable
  // during active combat even though the underlying units array changes constantly.
  const showEndScreen = useGameStore(s => {
    const { units } = s;
    if (units.length === 0) return false;
    const anyAlive1 = units.some(u => u.teamId === 1 && u.state !== 'dead');
    const anyAlive2 = units.some(u => u.teamId === 2 && u.state !== 'dead');
    return !anyAlive1 || !anyAlive2;
  });

  const [paused,     setPaused]     = useState(false);
  const [shopOpen,   setShopOpen]   = useState(false);
  const [buildOpen,  setBuildOpen]  = useState(false);

  const { deactivate: cancelBuild } = useBuildStore.getState();

  return (
    <>
      {/* ── Full-screen HUD layer ── */}
      <div
        className="absolute inset-0 z-40 pointer-events-none select-none"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {/* ── TOP ROW ── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'start',
            padding: '12px 16px',
            pointerEvents: 'none',
          }}
        >
          {/* Left — resources */}
          <div style={{ pointerEvents: 'auto', justifySelf: 'start' }}>
            <ResourceBar />
          </div>

          {/* Center — reserved for the battle timer */}
          <div />

          {/* Right — time + game controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifySelf: 'end',
              pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
              <TimeOfDay />
              <PauseButton paused={paused} onToggle={() => setPaused(p => !p)} />
            </div>
            {!isPreparation && (
              <>
                <div style={{ pointerEvents: 'auto' }}>
                  <ShopButton onClick={() => setShopOpen(o => !o)} />
                </div>
                <div style={{ pointerEvents: 'auto' }}>
                  <BuildButton onClick={() => setBuildOpen(o => !o)} active={buildOpen} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── BOTTOM ROW ── */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'grid',
            gridTemplateColumns: 'minmax(240px, 1fr) minmax(360px, 2fr) minmax(180px, 280px)',
            alignItems: 'flex-end',
            gap: '16px',
            padding: '12px 16px',
            pointerEvents: 'none',
          }}
        >
          {/* Bottom-left — selected army summary */}
          <div style={{ pointerEvents: 'auto' }}>
            <UnitInfoPanel />
          </div>

          {/* Bottom-center — regiment command deck */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 0,
              pointerEvents: 'auto',
            }}
          >
            <RegimentBar />
          </div>

          {/* Bottom-right — minimap */}
          <div style={{ pointerEvents: 'auto' }}>
            <MiniMap />
          </div>
        </div>

        {/* ── Ability dock / preparation status ── */}
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: '132px',
          transform: 'translateX(-50%)',
          width: 'min(760px, calc(100vw - 380px))',
          minWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          padding: '8px 10px',
          background: 'rgba(5,8,16,0.62)',
          border: '1px solid rgba(255,215,0,0.12)',
          borderRadius: 12,
          backdropFilter: 'blur(8px)',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: '100%',
            color: 'rgba(255,255,255,0.42)',
            fontSize: 8,
            fontWeight: 800,
            letterSpacing: '0.18em',
            textAlign: 'center',
          }}>
            {isPreparation ? 'PREPARATION — COMMANDS LOCKED' : 'ABILITIES'}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            flexWrap: 'wrap',
            pointerEvents: 'auto',
          }}>
            {isPreparation ? (
              <span style={{ color: 'rgba(255,255,255,0.68)', fontSize: 11, letterSpacing: '0.04em' }}>
                Inspect your army and set your view. Combat orders unlock when deployment ends.
              </span>
            ) : (
              <>
                <UnitAbilityBar />
                <HeroAbilityBar />
                <AbilityHotbar />
              </>
            )}
          </div>
        </div>

        {/* ── Pause overlay ── */}
        {paused && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(2px)',
              pointerEvents: 'auto',
              zIndex: 45,
            }}
          >
            <div
              style={{
                background: 'rgba(15,20,30,0.9)',
                border: '1px solid rgba(255,215,0,0.3)',
                borderRadius: '16px',
                padding: '32px 48px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: '32px', color: '#ffd700', marginBottom: '8px' }}>
                <GameIcon name="pause" size={26} /> Paused
              </div>
              <button
                onClick={() => setPaused(false)}
                style={{
                  background: 'rgba(255,215,0,0.15)',
                  border: '1px solid rgba(255,215,0,0.4)',
                  borderRadius: '8px',
                  padding: '8px 24px',
                  color: '#ffd700',
                  fontFamily: "'Cinzel', serif",
                  fontSize: '14px',
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                Resume
              </button>
            </div>
          </div>
        )}

        {/* ── Build panel (left side) ── */}
        {!isPreparation && buildOpen && (
          <BuildPanel open={buildOpen} onClose={() => { setBuildOpen(false); cancelBuild(); }} />
        )}

        {/* ── Shop panel (centered) ── */}
        {!isPreparation && shopOpen && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(3px)',
              pointerEvents: 'auto',
              zIndex: 50,
            }}
            onClick={e => { if (e.target === e.currentTarget) setShopOpen(false); }}
          >
            <ShopPanel onClose={() => setShopOpen(false)} />
          </div>
        )}
      </div>

      {/* ── Win/Lose screen (separate layer) ── */}
      {showEndScreen && (
        <div className="absolute inset-0 z-50">
          <WinLoseScreen />
        </div>
      )}

      {/* ── Combat timer ── */}
      <CombatTimer />

      {/* ── RTS command mode bar ── */}
      <CommandBar />

      {/* ── RTS rubber-band selection box overlay ── */}
      <SelectionBoxOverlay />
    </>
  );
}
