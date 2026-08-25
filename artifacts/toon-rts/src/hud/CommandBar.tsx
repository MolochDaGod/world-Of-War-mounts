/**
 * CommandBar — slim HUD strip showing active command mode and keyboard shortcuts.
 *
 * Rendered at the bottom-left during battle phase. The user can click buttons
 * or press the corresponding key to switch modes.
 *
 * Shortcuts:  M = Move  |  F = Fight/Attack-Move  |  P = Patrol  |  L = Lob
 *             Escape = cancel mode (return to default)
 */
import { useCommandMode, setCommandMode, CommandMode, MODE_LABEL } from '@/game/input/CommandMode';
import { useGameStore } from '@/game/store/gameStore';
import { useShallow } from 'zustand/react/shallow';
import { GameIcon } from './GameIcon';

interface ModeBtnProps {
  label: string;
  shortcut: string;
  mode: CommandMode;
  active: boolean;
  color: string;
}

function ModeBtn({ label, shortcut, mode, active, color }: ModeBtnProps) {
  return (
    <button
      onClick={() => setCommandMode(active ? 'default' : mode)}
      title={`${label} [${shortcut}]`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1px',
        padding: '5px 10px',
        border: `1.5px solid ${active ? color : 'rgba(255,255,255,0.2)'}`,
        borderRadius: '5px',
        background: active
          ? `linear-gradient(135deg, ${color}33 0%, ${color}18 100%)`
          : 'rgba(0,0,0,0.45)',
        color: active ? color : 'rgba(255,255,255,0.55)',
        cursor: 'pointer',
        transition: 'all 0.12s',
        minWidth: '48px',
        boxShadow: active ? `0 0 10px ${color}55` : 'none',
        backdropFilter: 'blur(4px)',
      }}
    >
      <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', opacity: 0.7 }}>
        [{shortcut}]
      </span>
      <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em' }}>
        {label}
      </span>
    </button>
  );
}

export function CommandBar() {
  const phase = useGameStore(s => s.phase);
  const mode  = useCommandMode();
  const { selectedUnitIds, units, toggleStandGround } = useGameStore(useShallow(s => ({
    selectedUnitIds:   s.selectedUnitIds,
    units:             s.units,
    toggleStandGround: s.toggleStandGround,
  })));

  if (phase !== 'battle') return null;

  const activeLabel = MODE_LABEL[mode];

  // Check if any selected unit has stand ground enabled
  const anyStandGround = selectedUnitIds.some(id => {
    const u = units.find(u => u.id === id);
    return u?.standGround ?? false;
  });

  const handleStandGround = () => {
    if (selectedUnitIds.length > 0) toggleStandGround(selectedUnitIds);
  };

  return (
    <div style={{
      position: 'fixed',
      top: '68px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
      zIndex: 500,
      pointerEvents: 'none',
    }}>
      {/* Active mode banner */}
      {mode !== 'default' && (
        <div style={{
          background: 'rgba(0,0,0,0.75)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: '6px',
          padding: '3px 14px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: '#fff',
          backdropFilter: 'blur(6px)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
           <GameIcon name="crosshair" size={12} /> {activeLabel}
          {mode === 'patrol' ? ' — click point A, then point B' : ' — click target  [ESC to cancel]'}
        </div>
      )}

      {/* Shortcut buttons */}
      <div style={{ display: 'flex', gap: '6px', pointerEvents: 'all' }}>
        <ModeBtn label="MOVE"    shortcut="M" mode="move"   active={mode === 'move'}   color="#44aaff" />
        <ModeBtn label="FIGHT"   shortcut="F" mode="fight"  active={mode === 'fight'}  color="#ff4444" />
        <ModeBtn label="PATROL"  shortcut="P" mode="patrol" active={mode === 'patrol'} color="#ffaa22" />
        <ModeBtn label="LOB"     shortcut="L" mode="lob"    active={mode === 'lob'}    color="#cc44ff" />

        {/* Stand Ground toggle */}
        <button
          onClick={handleStandGround}
          title="Stand Ground [S] — hold position, +25% defence"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1px',
            padding: '5px 10px',
            border: `1.5px solid ${anyStandGround ? '#66aaff' : 'rgba(255,255,255,0.2)'}`,
            borderRadius: '5px',
            background: anyStandGround
              ? 'linear-gradient(135deg, #66aaff33 0%, #66aaff18 100%)'
              : 'rgba(0,0,0,0.45)',
            color: anyStandGround ? '#aaccff' : 'rgba(255,255,255,0.55)',
            cursor: selectedUnitIds.length > 0 ? 'pointer' : 'default',
            transition: 'all 0.12s',
            minWidth: '48px',
            boxShadow: anyStandGround ? '0 0 10px #66aaff55' : 'none',
            backdropFilter: 'blur(4px)',
            opacity: selectedUnitIds.length > 0 ? 1 : 0.4,
          }}
        >
          <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', opacity: 0.7 }}>
            [S]
          </span>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em' }}>
            <GameIcon name="shieldCheck" size={13} /> HOLD
          </span>
        </button>

        {mode !== 'default' && (
          <button
            onClick={() => setCommandMode('default')}
            style={{
              padding: '5px 10px',
              border: '1.5px solid rgba(255,255,255,0.25)',
              borderRadius: '5px',
              background: 'rgba(0,0,0,0.45)',
              color: 'rgba(255,255,255,0.55)',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
              backdropFilter: 'blur(4px)',
            }}
          >
            [ESC] CANCEL
          </button>
        )}
      </div>
    </div>
  );
}
