import { useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { useWorldStore } from '@/game/store/worldStore';
import { GameUI } from '@/game/assets/CraftpixManifest';

import { ResourceBar }    from './ResourceBar';
import { MiniMap }        from './MiniMap';
import { UnitInfoPanel }  from './UnitInfoPanel';
import { AbilityHotbar }  from './AbilityHotbar';
import { WinLoseScreen }  from './WinLoseScreen';
import { ShopPanel }      from './ShopPanel';

// ── Time of day display ────────────────────────────────────────────────────────
function TimeOfDay() {
  const timeOfDay = useWorldStore(s => s.timeOfDay);
  const dayCount  = useWorldStore(s => s.dayCount);
  const isNight   = timeOfDay < 6 || timeOfDay >= 20;
  const hours     = Math.floor(timeOfDay);
  const minutes   = Math.floor((timeOfDay % 1) * 60);
  const timeStr   = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

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
      <span style={{ fontSize: '18px' }}>{isNight ? '🌙' : '☀️'}</span>
      <span>Day {dayCount}</span>
      <span style={{ opacity: 0.75, fontVariantNumeric: 'tabular-nums' }}>{timeStr}</span>
    </div>
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
      {paused ? '▶' : '⏸'}
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
      🏪 Shop
    </button>
  );
}

// ── Main HUD ───────────────────────────────────────────────────────────────────
export function OpenWorldHUD() {
  const phase = useGameStore(s => s.phase);
  const units = useGameStore(s => s.units);

  const [paused,   setPaused]   = useState(false);
  const [shopOpen, setShopOpen] = useState(false);

  const living1 = units.filter(u => u.teamId === 1 && u.state !== 'dead').length;
  const living2 = units.filter(u => u.teamId === 2 && u.state !== 'dead').length;
  const showEndScreen = units.length > 0 && (living1 === 0 || living2 === 0);

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
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '12px 16px',
            pointerEvents: 'none',
          }}
        >
          {/* Left spacer */}
          <div style={{ width: '120px' }} />

          {/* Center — Resource Bar */}
          <div style={{ pointerEvents: 'auto' }}>
            <ResourceBar />
          </div>

          {/* Right — Time + Pause + Shop */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '8px',
              pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
              <TimeOfDay />
              <PauseButton paused={paused} onToggle={() => setPaused(p => !p)} />
            </div>
            <div style={{ pointerEvents: 'auto' }}>
              <ShopButton onClick={() => setShopOpen(o => !o)} />
            </div>
          </div>
        </div>

        {/* ── BOTTOM ROW ── */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            padding: '12px 16px',
            pointerEvents: 'none',
          }}
        >
          {/* Bottom-left — Unit info */}
          <div style={{ pointerEvents: 'auto' }}>
            <UnitInfoPanel />
          </div>

          {/* Bottom-center — Ability hotbar */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              pointerEvents: 'auto',
            }}
          >
            <AbilityHotbar />
          </div>

          {/* Bottom-right — MiniMap */}
          <div style={{ pointerEvents: 'auto' }}>
            <MiniMap />
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
                ⏸ Paused
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

        {/* ── Shop panel (centered) ── */}
        {shopOpen && (
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
    </>
  );
}
